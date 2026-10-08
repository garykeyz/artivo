// Reproducible original synthetic stage clip, no remote footage or user media.
import AVFoundation
import CoreGraphics
import Foundation
let path = CommandLine.arguments[1]
try? FileManager.default.removeItem(atPath:path)
let writer = try AVAssetWriter(outputURL:URL(fileURLWithPath:path),fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:640,AVVideoHeightKey:360])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:640,kCVPixelBufferHeightKey as String:360])
writer.add(input); writer.startWriting();writer.startSession(atSourceTime:.zero)
for frame in 0..<96 {
 while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval:0.01) }
 var buffer:CVPixelBuffer?;CVPixelBufferCreate(kCFAllocatorDefault,640,360,kCVPixelFormatType_32ARGB,nil,&buffer)
 let b=buffer!;CVPixelBufferLockBaseAddress(b,[])
 let ctx=CGContext(data:CVPixelBufferGetBaseAddress(b),width:640,height:360,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
 ctx.setFillColor(CGColor(red:0.05,green:0.17,blue:0.15,alpha:1));ctx.fill(CGRect(x:0,y:0,width:640,height:360))
 ctx.setFillColor(CGColor(red:0.8,green:0.93,blue:0.47,alpha:1))
 for j in 0..<20 {let h=30+90*abs(sin(Double(frame)/8+Double(j)));ctx.fill(CGRect(x:70+j*25,y:70,width:14,height:Int(h)))}
 ctx.setFillColor(CGColor(gray:0.96,alpha:1));ctx.fill(CGRect(x:120,y:220,width:400,height:65))
 ctx.setFillColor(CGColor(red:0.08,green:0.24,blue:0.20,alpha:1))
 for j in 0..<16 {ctx.fill(CGRect(x:130+j*24,y:248,width:12,height:36))}
 CVPixelBufferUnlockBaseAddress(b,[]);adaptor.append(b,withPresentationTime:CMTime(value:Int64(frame),timescale:24))
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting {done.signal()};done.wait()
if writer.status != .completed { fatalError(String(describing:writer.error)) }
print("Synthetic demo clip created: \(path)")
