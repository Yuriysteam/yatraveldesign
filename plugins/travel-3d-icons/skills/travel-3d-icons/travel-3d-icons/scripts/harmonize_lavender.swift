import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("error: \(message)\n").data(using: .utf8)!)
    exit(1)
}

guard CommandLine.arguments.count == 4 else {
    fail("usage: harmonize_lavender.swift anchor.png input.png output.png")
}

struct HSV { var h: Double; var s: Double; var v: Double }

func rgbToHSV(_ r: Double, _ g: Double, _ b: Double) -> HSV {
    let maximum = max(r, max(g, b))
    let minimum = min(r, min(g, b))
    let delta = maximum - minimum
    var hue = 0.0
    if delta > 0 {
        if maximum == r { hue = 60 * ((g - b) / delta).truncatingRemainder(dividingBy: 6) }
        else if maximum == g { hue = 60 * (((b - r) / delta) + 2) }
        else { hue = 60 * (((r - g) / delta) + 4) }
    }
    if hue < 0 { hue += 360 }
    return HSV(h: hue, s: maximum == 0 ? 0 : delta / maximum, v: maximum)
}

func hsvToRGB(_ hsv: HSV) -> (Double, Double, Double) {
    let chroma = hsv.v * hsv.s
    let sector = hsv.h / 60
    let x = chroma * (1 - abs(sector.truncatingRemainder(dividingBy: 2) - 1))
    let base: (Double, Double, Double)
    switch sector {
    case 0..<1: base = (chroma, x, 0)
    case 1..<2: base = (x, chroma, 0)
    case 2..<3: base = (0, chroma, x)
    case 3..<4: base = (0, x, chroma)
    case 4..<5: base = (x, 0, chroma)
    default: base = (chroma, 0, x)
    }
    let m = hsv.v - chroma
    return (base.0 + m, base.1 + m, base.2 + m)
}

struct Bitmap {
    let width: Int
    let height: Int
    let bytesPerRow: Int
    var pixels: [UInt8]
}

func load(_ path: String) -> Bitmap {
    let url = URL(fileURLWithPath: path).standardizedFileURL
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fail("cannot decode \(path)") }
    let width = image.width, height = image.height, bytesPerRow = width * 4
    var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
    let info = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
    guard let context = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                  bytesPerRow: bytesPerRow, space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: info) else { fail("cannot allocate bitmap") }
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return Bitmap(width: width, height: height, bytesPerRow: bytesPerRow, pixels: pixels)
}

func straightHSV(_ pixels: [UInt8], _ offset: Int) -> HSV? {
    let alpha = Double(pixels[offset + 3]) / 255
    if alpha <= 0.25 { return nil }
    let r = min(1, Double(pixels[offset]) / 255 / alpha)
    let g = min(1, Double(pixels[offset + 1]) / 255 / alpha)
    let b = min(1, Double(pixels[offset + 2]) / 255 / alpha)
    return rgbToHSV(r, g, b)
}

func isLavender(_ hsv: HSV) -> Bool {
    hsv.h >= 235 && hsv.h <= 300 && hsv.s >= 0.09 && hsv.v >= 0.18
}

func percentile(_ values: [Double], _ position: Double) -> Double {
    let sorted = values.sorted()
    guard !sorted.isEmpty else { fail("no lavender pixels found") }
    return sorted[Int(Double(sorted.count - 1) * position)]
}

func medianLavender(_ bitmap: Bitmap) -> HSV {
    var hues: [Double] = [], saturations: [Double] = [], values: [Double] = []
    hues.reserveCapacity(bitmap.width * bitmap.height / 20)
    for y in 0..<bitmap.height {
        for x in 0..<bitmap.width {
            let offset = y * bitmap.bytesPerRow + x * 4
            guard let hsv = straightHSV(bitmap.pixels, offset), isLavender(hsv) else { continue }
            hues.append(hsv.h); saturations.append(hsv.s); values.append(hsv.v)
        }
    }
    return HSV(h: percentile(hues, 0.5), s: percentile(saturations, 0.5), v: percentile(values, 0.5))
}

let anchor = load(CommandLine.arguments[1])
var target = load(CommandLine.arguments[2])
let anchorMedian = medianLavender(anchor)
let targetMedian = medianLavender(target)
let hueDelta = anchorMedian.h - targetMedian.h
let saturationScale = anchorMedian.s / targetMedian.s
let valueScale = anchorMedian.v / targetMedian.v

for y in 0..<target.height {
    for x in 0..<target.width {
        let offset = y * target.bytesPerRow + x * 4
        guard var hsv = straightHSV(target.pixels, offset), isLavender(hsv) else { continue }
        hsv.h = (hsv.h + hueDelta).truncatingRemainder(dividingBy: 360)
        if hsv.h < 0 { hsv.h += 360 }
        hsv.s = min(1, hsv.s * saturationScale)
        hsv.v = min(1, hsv.v * valueScale)
        let rgb = hsvToRGB(hsv)
        let alpha = Double(target.pixels[offset + 3]) / 255
        target.pixels[offset] = UInt8(max(0, min(255, rgb.0 * alpha * 255)).rounded())
        target.pixels[offset + 1] = UInt8(max(0, min(255, rgb.1 * alpha * 255)).rounded())
        target.pixels[offset + 2] = UInt8(max(0, min(255, rgb.2 * alpha * 255)).rounded())
    }
}

let info = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
guard let context = CGContext(data: &target.pixels, width: target.width, height: target.height,
                              bitsPerComponent: 8, bytesPerRow: target.bytesPerRow,
                              space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: info),
      let image = context.makeImage() else { fail("cannot build output image") }

let outputURL = URL(fileURLWithPath: CommandLine.arguments[3]).standardizedFileURL
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fail("cannot create output PNG")
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fail("cannot write \(outputURL.path)") }

print(String(format: "Lavender harmonized to H %.1f S %.3f V %.3f -> %@", anchorMedian.h, anchorMedian.s, anchorMedian.v, outputURL.path))
