package com.bletest

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NfcReaderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "NfcReaderModule"
    private val nfcAdapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(reactContext)

    override fun getName(): String = "NfcReader"

    @ReactMethod
    fun startReaderMode() {
        Log.d(TAG, "startReaderMode called from JS")
        if (nfcAdapter != null) {
            val activity = currentActivity ?: return
            nfcAdapter.enableReaderMode(
                activity,
                { tag: Tag? ->
                    tag?.let {
                        val isoDep = IsoDep.get(it)
                        isoDep?.apply {
                            try {
                                connect()
                                val apdu = byteArrayOf(
                                    0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(), 0x07.toByte(),
                                    0xF0.toByte(), 0x12.toByte(), 0x34.toByte(), 0x56.toByte(), 0x78.toByte(), 0x90.toByte(), 0x00.toByte()
                                )
                                val response = transceive(apdu)
                                val responseText = response.dropLast(2).toByteArray().toString(Charsets.UTF_8)

                                Log.d(TAG, "Received Response: $responseText")
                                sendEvent("onNfcMessage", responseText)

                            } catch (e: Exception) {
                                Log.e(TAG, "Error communicating with tag: ${e.message}")
                            } finally {
                                try {
                                    close()
                                } catch (_: Exception) {}
                            }
                        }
                    }
                },
                NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                null
            )
        }
    }

    @ReactMethod
    fun stopReaderMode() {
        currentActivity?.let {
            Log.d(TAG,"Stopping reader mode")
            nfcAdapter?.disableReaderMode(it)
        }
    }

    private fun sendEvent(eventName: String, params: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
