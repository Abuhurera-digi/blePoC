// BluetoothManagerBridge.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BluetoothManager, NSObject)

RCT_EXTERN_METHOD(scanDevices:(nonnull NSNumber *)timeout
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getScannedDevices:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startScanning)

RCT_EXTERN_METHOD(startAdvertising:(NSString *)name)

RCT_EXTERN_METHOD(stopAdvertising)

@end
