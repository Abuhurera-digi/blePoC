package com.bletest

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class HceMessageModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "HceMessage"

    @ReactMethod
    fun setMessage(message: String) {
        MyHostApduService.latestMessage = message
    }

    // This function will be called from MyHostApduService to notify JS
    fun sendEvent(eventName: String, data: String?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }
}
