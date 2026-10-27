import AppKit
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("error: \(message)\n").data(using: .utf8)!)
    exit(1)
}

guard CommandLine.arguments.count == 3 else {
    fail("usage: clean_alpha_edges.swift input.png output.png")
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2]).standardizedFileURL
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fail("cannot decode \(inputURL.path)")
}

let width = image.width
let height = image.height
let bytesPerRow = width * 4
var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue

guard let context = CGContext(
    data: &pixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: bitmapInfo
) else {
    fail("cannot allocate bitmap context")
}
context.interpolationQuality = .high
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

struct StraightPixel {
    var r: Double
    var g: Double
    var b: Double
    var a: UInt8
}

func offset(_ x: Int, _ y: Int) -> Int { y * bytesPerRow + x * 4 }

var straight = [StraightPixel](repeating: StraightPixel(r: 0, g: 0, b: 0, a: 0), count: width * height)
for y in 0..<height {
    for x in 0..<width {
        let i = offset(x, y)
        let a = pixels[i + 3]
        guard a > 0 else { continue }
        let scale = 255.0 / Double(a)
        straight[y * width + x] = StraightPixel(
            r: min(255, Double(pixels[i]) * scale),
            g: min(255, Double(pixels[i + 1]) * scale),
            b: min(255, Double(pixels[i + 2]) * scale),
            a: a
        )
    }
}

func saturation(_ p: StraightPixel) -> Double {
    let maximum = max(p.r, max(p.g, p.b))
    let minimum = min(p.r, min(p.g, p.b))
    return maximum == 0 ? 0 : (maximum - minimum) / maximum
}

func nearestOpaqueColor(x: Int, y: Int, minimumAlpha: UInt8 = 224) -> StraightPixel? {
    for radius in 1...4 {
        var candidates: [StraightPixel] = []
        for yy in max(0, y - radius)...min(height - 1, y + radius) {
            for xx in max(0, x - radius)...min(width - 1, x + radius) {
                if abs(xx - x) != radius && abs(yy - y) != radius { continue }
                let candidate = straight[yy * width + xx]
                if candidate.a >= minimumAlpha { candidates.append(candidate) }
            }
        }
        if !candidates.isEmpty {
            let count = Double(candidates.count)
            return StraightPixel(
                r: candidates.reduce(0) { $0 + $1.r } / count,
                g: candidates.reduce(0) { $0 + $1.g } / count,
                b: candidates.reduce(0) { $0 + $1.b } / count,
                a: 255
            )
        }
    }
    return nil
}

var cleaned = straight
for y in 0..<height {
    for x in 0..<width {
        let index = y * width + x
        var p = straight[index]
        if p.a <= 24 {
            cleaned[index] = StraightPixel(r: 0, g: 0, b: 0, a: 0)
            continue
        }

        if p.a < 96 {
            var supported = false
            for yy in max(0, y - 2)...min(height - 1, y + 2) {
                for xx in max(0, x - 2)...min(width - 1, x + 2) {
                    if straight[yy * width + xx].a >= 96 { supported = true }
                }
            }
            if !supported {
                cleaned[index] = StraightPixel(r: 0, g: 0, b: 0, a: 0)
                continue
            }
        }

        if p.a < 240 && saturation(p) > 0.14 {
            if let replacement = nearestOpaqueColor(x: x, y: y) {
                p.r = replacement.r
                p.g = replacement.g
                p.b = replacement.b
            } else {
                let luminance = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b
                p.r = luminance
                p.g = luminance
                p.b = luminance
            }
        }

        if p.a < 72 {
            let luminance = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b
            p.r = luminance
            p.g = luminance
            p.b = luminance
            p.a = UInt8(Double(p.a) * 0.8)
        }
        cleaned[index] = p
    }
}

for y in 0..<height {
    for x in 0..<width {
        let p = cleaned[y * width + x]
        let i = offset(x, y)
        let alpha = Double(p.a) / 255.0
        pixels[i] = UInt8(max(0, min(255, p.r * alpha)).rounded())
        pixels[i + 1] = UInt8(max(0, min(255, p.g * alpha)).rounded())
        pixels[i + 2] = UInt8(max(0, min(255, p.b * alpha)).rounded())
        pixels[i + 3] = p.a
    }
}

guard let outputContext = CGContext(
    data: &pixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: bitmapInfo
), let outputImage = outputContext.makeImage() else {
    fail("cannot build output image")
}

try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fail("cannot create PNG destination")
}
CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else { fail("cannot write \(outputURL.path)") }
print("Cleaned alpha edges -> \(outputURL.path)")
