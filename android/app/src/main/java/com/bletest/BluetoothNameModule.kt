package com.bletest

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.*
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import android.provider.Settings

class BluetoothNameModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BluetoothName"

    @ReactMethod
fun getBluetoothIdentity(promise: Promise) {
    try {
        val adapter = BluetoothAdapter.getDefaultAdapter()
        val name = adapter?.name ?: "Unknown"
        val androidId = Settings.Secure.getString(reactApplicationContext.contentResolver, Settings.Secure.ANDROID_ID)

        val deviceInfo = Arguments.createMap()
        deviceInfo.putString("name", name)
        deviceInfo.putString("deviceId", androidId)

        Log.d("BluetoothInfo", "Name: $name, Android ID: $androidId")

        promise.resolve(deviceInfo)
    } catch (e: Exception) {
        promise.reject("ERROR", e.message)
    }
}


    @ReactMethod
    fun discoverNearbyDevices(promise: Promise) {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            promise.reject("BLUETOOTH_OFF", "Bluetooth is not enabled or unavailable")
            return
        }

        // Stop ongoing discovery before starting a new one
        if (bluetoothAdapter.isDiscovering) {
            bluetoothAdapter.cancelDiscovery()
        }

        val foundDevices = Arguments.createArray()
        val deviceAddresses = mutableSetOf<String>()

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                        if (device != null && !deviceAddresses.contains(device.address)) {
                            val name = device.name ?: "Unknown"
                            Log.d("BluetoothScan", "Found device: $name - ${device.address}")

                            val deviceInfo = Arguments.createMap()
                            deviceInfo.putString("name", name)
                            deviceInfo.putString("address", device.address)
                            foundDevices.pushMap(deviceInfo)
                            deviceAddresses.add(device.address)
                        }
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        Log.d("BluetoothScan", "Discovery finished")
                        try {
                            reactApplicationContext.unregisterReceiver(this)
                        } catch (_: Exception) {}
                        promise.resolve(foundDevices)
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }

        reactApplicationContext.registerReceiver(receiver, filter)
        bluetoothAdapter.startDiscovery()

        // Fallback timeout: in case discovery doesn't finish correctly
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                bluetoothAdapter.cancelDiscovery()
                reactApplicationContext.unregisterReceiver(receiver)
                promise.resolve(foundDevices)
            } catch (e: Exception) {
                promise.reject("DISCOVERY_TIMEOUT", e.message)
            }
        }, 15000) // 15 seconds
    }


  @ReactMethod
fun setBluetoothNameForRole(role: String, promise: Promise) {
    try {
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BLUETOOTH_UNAVAILABLE", "Bluetooth is not available or enabled")
            return
        }

        if (role == "broadcaster") {
            val prefs = reactApplicationContext.getSharedPreferences("BluetoothPrefs", Context.MODE_PRIVATE)

            val currentName = adapter.name ?: "AndroidDevice"

            // Remove all ARES_ prefixes if repeated
            val cleanedName = currentName.replace(Regex("^(ARES_)+"), "")
            val finalName = "ARES_$cleanedName"

            // Only update if name isn't already set properly
            if (currentName != finalName) {
                adapter.name = finalName
                prefs.edit().putBoolean("isNameSet", true).apply()
                Log.d("BluetoothName", "Set Bluetooth name to: $finalName")
                promise.resolve(finalName)
            } else {
                Log.d("BluetoothName", "Bluetooth name already set correctly.")
                promise.resolve("Name already set: $finalName")
            }
        } else {
            promise.resolve("No change. Role is not broadcaster.")
        }
    } catch (e: Exception) {
        promise.reject("SET_NAME_ERROR", e.message)
    }
}




}
