#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(BluetoothManager, RCTEventEmitter)

RCT_EXTERN_METHOD(startScanning)
RCT_EXTERN_METHOD(startAdvertising:(NSString *)name)
RCT_EXTERN_METHOD(stopAdvertising)
RCT_EXTERN_METHOD(getScannedDevices:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(scanDevices:(nonnull NSNumber *)timeout
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
