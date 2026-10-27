#!/usr/bin/env swift

import AppKit
import Foundation

struct Metrics: Codable {
    let file: String
    let width: Int
    let height: Int
    let transparentPixelPercent: Double
    let alphaFillPercent: Double
    let bboxWidthPercent: Double
    let bboxHeightPercent: Double
    let centerXPercent: Double
    let centerYPercent: Double
    let bottomPercent: Double
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("error: \(message)\n").data(using: .utf8)!)
    exit(1)
}

var arguments = Array(CommandLine.arguments.dropFirst())
let jsonOutput = arguments.first == "--json"
if jsonOutput { arguments.removeFirst() }
if arguments.isEmpty {
    fail("usage: analyze_alpha_bounds.swift [--json] icon.png [icon.png ...]")
}

var allMetrics: [Metrics] = []
var foundOpaqueCanvas = false

for path in arguments {
    guard let image = NSImage(contentsOfFile: path),
          let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff) else {
        fail("cannot decode \(path)")
    }

    let width = bitmap.pixelsWide
    let height = bitmap.pixelsHigh
    var minX = width
    var minY = height
    var maxX = -1
    var maxY = -1
    var occupied = 0
    var transparent = 0

    for y in 0..<height {
        for x in 0..<width {
            let alpha = bitmap.colorAt(x: x, y: y)?.alphaComponent ?? 0
            if alpha <= 1.0 / 255.0 { transparent += 1 }
            if alpha > 16.0 / 255.0 {
                occupied += 1
                minX = min(minX, x)
                minY = min(minY, y)
                maxX = max(maxX, x)
                maxY = max(maxY, y)
            }
        }
    }

    if occupied == 0 { fail("no visible pixels above alpha threshold in \(path)") }
    if transparent == 0 {
        foundOpaqueCanvas = true
        FileHandle.standardError.write(("warning: no fully transparent pixels in \(path)\n").data(using: .utf8)!)
    }

    let bboxWidth = maxX - minX + 1
    let bboxHeight = maxY - minY + 1
    allMetrics.append(Metrics(
        file: path,
        width: width,
        height: height,
        transparentPixelPercent: 100.0 * Double(transparent) / Double(width * height),
        alphaFillPercent: 100.0 * Double(occupied) / Double(width * height),
        bboxWidthPercent: 100.0 * Double(bboxWidth) / Double(width),
        bboxHeightPercent: 100.0 * Double(bboxHeight) / Double(height),
        centerXPercent: 100.0 * Double(minX + maxX + 1) / (2.0 * Double(width)),
        centerYPercent: 100.0 * Double(minY + maxY + 1) / (2.0 * Double(height)),
        bottomPercent: 100.0 * Double(maxY + 1) / Double(height)
    ))
}

if jsonOutput {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    print(String(data: try encoder.encode(allMetrics), encoding: .utf8)!)
} else {
    print("file\tpx\ttransparent%\tfill%\tbbox%\tcenter%\tbottom%")
    for item in allMetrics {
        let name = URL(fileURLWithPath: item.file).lastPathComponent
        print(String(
            format: "%@\t%dx%d\t%.1f\t%.1f\t%.1fx%.1f\t%.1f,%.1f\t%.1f",
            name,
            item.width,
            item.height,
            item.transparentPixelPercent,
            item.alphaFillPercent,
            item.bboxWidthPercent,
            item.bboxHeightPercent,
            item.centerXPercent,
            item.centerYPercent,
            item.bottomPercent
        ))
    }
}

if foundOpaqueCanvas { exit(2) }
