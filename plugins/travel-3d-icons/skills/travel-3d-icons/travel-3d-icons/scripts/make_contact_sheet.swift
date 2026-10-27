import AppKit
import Foundation

struct IconEntry: Decodable {
    let name: String
    let label: String?
    let source: String
}

struct Manifest: Decodable {
    let icons: [IconEntry]
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("error: \(message)\n").data(using: .utf8)!)
    exit(1)
}

var args = Array(CommandLine.arguments.dropFirst())
guard !args.isEmpty else {
    fail("usage: make_contact_sheet.swift manifest.json --out sheet.png [--columns 3] [--card 480] [--icon-size 74] [--background light-gray|white|black|checkerboard]")
}

let manifestPath = URL(fileURLWithPath: args.removeFirst()).standardizedFileURL
var outputPath: String?
var columns = 3
var card = 480
var iconSize: Int?
var background = "light-gray"

while !args.isEmpty {
    let option = args.removeFirst()
    switch option {
    case "--out":
        guard !args.isEmpty else { fail("--out requires a path") }
        outputPath = args.removeFirst()
    case "--columns":
        guard !args.isEmpty, let value = Int(args.removeFirst()), value > 0 else {
            fail("--columns requires a positive integer")
        }
        columns = value
    case "--card":
        guard !args.isEmpty, let value = Int(args.removeFirst()), value >= 128 else {
            fail("--card requires an integer of at least 128")
        }
        card = value
    case "--icon-size":
        guard !args.isEmpty, let value = Int(args.removeFirst()), value > 0 else {
            fail("--icon-size requires a positive integer")
        }
        iconSize = value
    case "--background":
        guard !args.isEmpty else { fail("--background requires a value") }
        background = args.removeFirst()
        guard ["light-gray", "white", "black", "checkerboard"].contains(background) else {
            fail("unsupported background: \(background)")
        }
    default:
        fail("unknown option: \(option)")
    }
}

guard let outputPath else { fail("--out is required") }
guard let manifestData = try? Data(contentsOf: manifestPath),
      let manifest = try? JSONDecoder().decode(Manifest.self, from: manifestData),
      !manifest.icons.isEmpty else {
    fail("cannot decode a non-empty icons array from \(manifestPath.path)")
}

let padding = 48
let gap = 32
let labelHeight = 88
let rows = Int(ceil(Double(manifest.icons.count) / Double(columns)))
let width = padding * 2 + columns * card + max(0, columns - 1) * gap
let rowHeight = card + labelHeight
let height = padding * 2 + rows * rowHeight + max(0, rows - 1) * gap

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fail("cannot allocate contact-sheet canvas")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
paragraph.lineBreakMode = .byWordWrapping
let labelAttributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 20, weight: .semibold),
    .foregroundColor: NSColor(calibratedWhite: 0.12, alpha: 1),
    .paragraphStyle: paragraph
]

func fillCard(_ rect: NSRect, mode: String) {
    let path = NSBezierPath(roundedRect: rect, xRadius: 48, yRadius: 48)
    NSGraphicsContext.saveGraphicsState()
    path.addClip()
    switch mode {
    case "white":
        NSColor.white.setFill()
        rect.fill()
    case "black":
        NSColor(calibratedWhite: 0.06, alpha: 1).setFill()
        rect.fill()
    case "checkerboard":
        let tile = 24
        for y in stride(from: Int(rect.minY), to: Int(rect.maxY), by: tile) {
            for x in stride(from: Int(rect.minX), to: Int(rect.maxX), by: tile) {
                let even = ((x - Int(rect.minX)) / tile + (y - Int(rect.minY)) / tile) % 2 == 0
                (even ? NSColor.white : NSColor(calibratedWhite: 0.82, alpha: 1)).setFill()
                NSRect(x: x, y: y, width: tile, height: tile).fill()
            }
        }
    default:
        NSColor(calibratedWhite: 0.965, alpha: 1).setFill()
        rect.fill()
    }
    NSGraphicsContext.restoreGraphicsState()
}

for (index, icon) in manifest.icons.enumerated() {
    let column = index % columns
    let row = index / columns
    let x = padding + column * (card + gap)
    let cardY = height - padding - card - row * (rowHeight + gap)
    let cardRect = NSRect(x: x, y: cardY, width: card, height: card)

    fillCard(cardRect, mode: background)

    let sourceURL = URL(fileURLWithPath: icon.source, relativeTo: manifestPath.deletingLastPathComponent()).standardizedFileURL
    guard let image = NSImage(contentsOf: sourceURL) else {
        fail("cannot load \(sourceURL.path)")
    }
    let imageRect: NSRect
    if let iconSize {
        let side = CGFloat(min(iconSize, card))
        imageRect = NSRect(x: cardRect.midX - side / 2, y: cardRect.midY - side / 2, width: side, height: side)
    } else {
        imageRect = cardRect.insetBy(dx: 20, dy: 20)
    }
    image.draw(in: imageRect, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])

    let label = icon.label?.isEmpty == false ? icon.label! : icon.name
    let labelRect = NSRect(x: x, y: cardY - labelHeight + 4, width: card, height: labelHeight - 8)
    label.draw(in: labelRect, withAttributes: labelAttributes)
}

context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fail("cannot encode PNG")
}
let outputURL = URL(fileURLWithPath: outputPath)
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
try png.write(to: outputURL)
print("Created contact sheet -> \(outputURL.path)")
