import ExpoModulesCore
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

// This source must be compiled and tested in an iOS development build.
// It cannot run in Expo Go. No image or location is sent over the network.
public final class WildfolioVisionModule: Module {
  private let worker = DispatchQueue(label: "com.wildfolio.vision", qos: .userInitiated)
  private let stateLock = NSLock()
  private var cancelled = Set<String>()
  private var requests: [String: VNRequest] = [:]

  public func definition() -> ModuleDefinition {
    Name("WildfolioVision")

    Function("capabilities") { () -> [String: Bool] in
      var masking = false
      if #available(iOS 17.0, *) { masking = true }
      return ["masking": masking, "classification": true]
    }

    // Synchronous cancellation only touches lock-protected state; it never waits for worker I/O.
    Function("cancel") { (requestId: String) in
      self.stateLock.lock()
      let request = self.requests[requestId]
      if request != nil { self.cancelled.insert(requestId) }
      self.stateLock.unlock()
      request?.cancel()
    }

    AsyncFunction("process") { (uri: String, outputDirectory: String, requestId: String) -> [String: Any] in
      try autoreleasepool {
        defer { self.finish(requestId) }
        return try self.processImage(uri: uri, outputDirectory: outputDirectory, requestId: requestId)
      }
    }.runOnQueue(worker)
  }

  private func failure(_ message: String) -> NSError {
    NSError(domain: "WildfolioVision", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  private func checkCancellation(_ id: String) throws {
    stateLock.lock()
    let shouldCancel = cancelled.contains(id)
    stateLock.unlock()
    if shouldCancel { throw failure("Processing cancelled.") }
  }

  private func track(_ request: VNRequest, id: String) throws {
    stateLock.lock()
    requests[id] = request
    let shouldCancel = cancelled.contains(id)
    stateLock.unlock()
    if shouldCancel { request.cancel(); throw failure("Processing cancelled.") }
  }

  private func finish(_ id: String) {
    stateLock.lock()
    requests.removeValue(forKey: id)
    cancelled.remove(id)
    stateLock.unlock()
  }

  private func processImage(uri: String, outputDirectory: String, requestId: String) throws -> [String: Any] {
    guard UUID(uuidString: requestId) != nil,
      let input = URL(string: uri), input.isFileURL,
      let output = URL(string: outputDirectory), output.isFileURL,
      let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
    else { throw failure("Expected a local image and a valid request ID.") }

    // Resolve symlinks and restrict writes to this app's persistent draft directory.
    let allowed = documents.appendingPathComponent("wildfolio/drafts", isDirectory: true)
      .appendingPathComponent(requestId, isDirectory: true).resolvingSymlinksInPath().standardizedFileURL
    guard output.resolvingSymlinksInPath().standardizedFileURL.path == allowed.path,
      input.resolvingSymlinksInPath().standardizedFileURL.deletingLastPathComponent().path == allowed.path
    else { throw failure("Image processing paths must belong to the current private draft.") }

    try checkCancellation(requestId)
    guard let source = CGImageSourceCreateWithURL(input as CFURL, nil) else { throw failure("This photograph cannot be opened.") }
    // Decode at bounded size with orientation applied by ImageIO, rather than expanding
    // the full camera-resolution image then rotating it in memory.
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: 2048,
      kCGImageSourceShouldCacheImmediately: true
    ]
    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
      throw failure("This photograph could not be decoded.")
    }
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
    var candidates: [[String: Any]] = []
    var warnings: [String] = []
    var cutouts: [[String: Any]] = []
    var written: [URL] = []
    var completed = false
    defer {
      if !completed { for url in written { try? FileManager.default.removeItem(at: url) } }
    }

    // Classification and masking fail independently: keep usable output from either.
    let classify = VNClassifyImageRequest()
    try track(classify, id: requestId)
    do {
      try handler.perform([classify])
      try checkCancellation(requestId)
      candidates = (classify.results ?? []).sorted { $0.confidence > $1.confidence }.filter { $0.confidence >= 0.1 }.prefix(5).map {
        ["label": $0.identifier, "score": Double($0.confidence)]
      }
    } catch {
      try checkCancellation(requestId)
      warnings.append("Possible image clues could not be generated. This does not prevent saving.")
    }

    if #available(iOS 17.0, *) {
      let masking = VNGenerateForegroundInstanceMaskRequest()
      try track(masking, id: requestId)
      do {
        try handler.perform([masking])
        try checkCancellation(requestId)
        if let result = masking.results?.first {
          let instances = Array(result.allInstances).filter { $0 != 0 }
          if instances.isEmpty { warnings.append("No foreground subject was found. Use the original photograph.") }
          // Bound memory and output count; each instance is rendered and released separately.
          if instances.count > 8 { warnings.append("Showing the first eight foreground subjects to limit memory use.") }
          let context = CIContext(options: [.cacheIntermediates: false])
          try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
          for instance in instances.prefix(8) {
            try checkCancellation(requestId)
            do {
              try autoreleasepool {
                let buffer = try result.generateMaskedImage(ofInstances: IndexSet(integer: instance), from: handler, croppedToInstancesExtent: true)
                let image = CIImage(cvPixelBuffer: buffer)
                guard let rendered = context.createCGImage(image, from: image.extent) else { throw failure("Subject rendering failed.") }
                let destination = output.appendingPathComponent("subject-\(instance).png")
                let temporary = output.appendingPathComponent("subject-\(instance).partial")
                defer { try? FileManager.default.removeItem(at: temporary) }
                guard let encoder = CGImageDestinationCreateWithURL(temporary as CFURL, UTType.png.identifier as CFString, 1, nil) else {
                  throw failure("Unable to write the subject cutout.")
                }
                // Vision's masked RGBA pixel buffer retains transparency; PNG preserves alpha.
                CGImageDestinationAddImage(encoder, rendered, nil)
                guard CGImageDestinationFinalize(encoder) else { throw failure("Unable to finish the subject PNG.") }
                try checkCancellation(requestId)
                if FileManager.default.fileExists(atPath: destination.path) { try FileManager.default.removeItem(at: destination) }
                try FileManager.default.moveItem(at: temporary, to: destination)
                written.append(destination)
                cutouts.append(["instanceId": instance, "uri": destination.absoluteString])
              }
            } catch {
              try checkCancellation(requestId)
              warnings.append("One subject cutout failed. Choose another subject or the original photograph.")
            }
          }
        } else { warnings.append("No foreground subject was found. Use the original photograph.") }
      } catch {
        try checkCancellation(requestId)
        warnings.append("Foreground masking is unavailable or failed on this device. Use the original photograph.")
      }
    } else { warnings.append("Foreground cutouts require iOS 17 or later. Use the original photograph.") }

    try checkCancellation(requestId)
    completed = true
    return ["cutouts": cutouts, "candidates": candidates, "warnings": warnings]
  }
}
