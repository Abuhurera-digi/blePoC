package com.bletest

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class MyHostApduService : HostApduService() {

    private val TAG = "HCE_Service"

    companion object {
        // Shared message data
        var latestMessage: String = "HelloFromHCE"

        // Flag to control if sending is enabled
        var isSendingEnabled: Boolean = false

        // React context needs to be set by the module
        var reactContext: ReactApplicationContext? = null
    }

    private val SELECT_APDU = byteArrayOf(
        0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(), 0x07.toByte(),
        0xF0.toByte(), 0x12.toByte(), 0x34.toByte(), 0x56.toByte(), 0x78.toByte(), 0x90.toByte(), 0x00.toByte()
    )

    private val RESPONSE_OK = byteArrayOf(0x90.toByte(), 0x00.toByte())

    override fun processCommandApdu(commandApdu: ByteArray, extras: Bundle?): ByteArray? {
        Log.d(TAG, "Received APDU: ${commandApdu.joinToString()}")

        return if (commandApdu.contentEquals(SELECT_APDU)) {
            if (isSendingEnabled) {
                val responseData = latestMessage.toByteArray(Charsets.UTF_8)
                Log.d(TAG, "Sending response: $latestMessage")
                responseData + RESPONSE_OK
            } else {
                Log.d(TAG, "Sending disabled. No response sent.")
                null  // <- Prevents any response from being sent
            }
        } else {
            RESPONSE_OK
        }
    }

    override fun onDeactivated(reason: Int) {
        Log.d(TAG, "Deactivated with reason: $reason")

        // Notify JS side about message being sent
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("MessageSentSuccessfully", null)
    }
}
