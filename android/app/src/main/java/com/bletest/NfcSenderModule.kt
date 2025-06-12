package com.bletest

import android.content.ComponentName
import android.content.Intent
import android.nfc.NfcAdapter
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NfcSenderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NfcSender"
    }

    @ReactMethod
    fun enableSending() {
        MyHostApduService.isSendingEnabled = true
    }

    @ReactMethod
    fun disableSending() {
        MyHostApduService.isSendingEnabled = false
    }   

}
