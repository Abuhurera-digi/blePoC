package com.bletest

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.*
import android.content.*
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*

class BluetoothScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
    private val scanner = bluetoothAdapter?.bluetoothLeScanner
    private var scanCallback: ScanCallback? = null
    private val foundDevices = mutableSetOf<String>()
    private val handler = Handler(Looper.getMainLooper())
    private var discoveryReceiver: BroadcastReceiver? = null
    private var bondReceiver: BroadcastReceiver? = null
    private var currentPairPromise: Promise? = null

    override fun getName(): String = "BluetoothScanner"

    @ReactMethod
    fun scanDevices(timeout: Int, promise: Promise) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            promise.reject("BLUETOOTH_OFF", "Bluetooth is not enabled")
            return
        }

        stopCurrentScan()

        val resultArray = Arguments.createArray()
        foundDevices.clear()

        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val device = result.device ?: return
                val address = device.address ?: return

                val scanRecord = result.scanRecord
                val scanBytes = scanRecord?.bytes
                val nameFromScan = parseDeviceNameFromScanRecord(scanBytes)
                val name = when {
                    !device.name.isNullOrBlank() -> device.name
                    !nameFromScan.isNullOrBlank() -> nameFromScan
                    else -> {
                        Log.w("BLE_SCAN", "Unknown BLE device [$address]")
                        "Unknown Device (${address.takeLast(5)})"
                    }
                }

                val deviceKey = "$address|$name"
                if (!foundDevices.add(deviceKey)) return

                val map = Arguments.createMap()
                map.putString("name", name)
                map.putString("address", address)
                resultArray.pushMap(map)

                Log.d("BLE_SCAN", "Found BLE device: $name [$address]")
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e("BluetoothScanner", "BLE scan failed: $errorCode")
            }
        }

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        scanner?.startScan(null, scanSettings, scanCallback)

        discoveryReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        val device =
                            intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                        val address = device?.address ?: return
                        val name = if (!device.name.isNullOrBlank()) {
                            device.name
                        } else {
                            Log.w("CLASSIC_SCAN", "Unknown Classic device [$address]")
                            "Unknown Device (${address.takeLast(5)})"
                        }

                        val deviceKey = "$address|$name"
                        if (!foundDevices.add(deviceKey)) return

                        val map = Arguments.createMap()
                        map.putString("name", name)
                        map.putString("address", address)
                        resultArray.pushMap(map)

                        Log.d("CLASSIC_SCAN", "Found Classic device: $name [$address]")
                    }

                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        Log.d("CLASSIC_SCAN", "Classic discovery finished")
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }
        reactContext.registerReceiver(discoveryReceiver, filter)
        bluetoothAdapter.startDiscovery()

        handler.postDelayed({
            stopCurrentScan()
            Log.d("BluetoothScanner", "Scan complete. Found ${resultArray.size()} devices.")
            promise.resolve(resultArray)
        }, timeout.toLong() + 300)
    }

    private fun stopCurrentScan() {
        try {
            scanCallback?.let {
                scanner?.stopScan(it)
                Log.d("BluetoothScanner", "BLE scan stopped")
            }
            scanCallback = null
        } catch (e: Exception) {
            Log.w("BluetoothScanner", "Error stopping BLE scan", e)
        }

        try {
            if (bluetoothAdapter?.isDiscovering == true) {
                bluetoothAdapter.cancelDiscovery()
                Log.d("BluetoothScanner", "Classic discovery stopped")
            }

            discoveryReceiver?.let {
                reactContext.unregisterReceiver(it)
                Log.d("BluetoothScanner", "Classic receiver unregistered")
            }
            discoveryReceiver = null
        } catch (e: Exception) {
            Log.w("BluetoothScanner", "Error stopping classic discovery", e)
        }
    }

    private fun parseDeviceNameFromScanRecord(scanRecord: ByteArray?): String? {
        if (scanRecord == null) return null
        var index = 0
        while (index < scanRecord.size) {
            val length = scanRecord[index++].toInt()
            if (length == 0 || index + length > scanRecord.size) break
            val type = scanRecord[index].toInt() and 0xFF
            if (type == 0x08 || type == 0x09) {
                return try {
                    String(scanRecord, index + 1, length - 1, Charsets.UTF_8)
                } catch (e: Exception) {
                    Log.e("BluetoothScanner", "Name parse error", e)
                    null
                }
            }
            index += length
        }
        return null
    }

    @ReactMethod
    fun pairDevice(address: String, promise: Promise) {
        try {
            val device = bluetoothAdapter.getRemoteDevice(address)

            if (device.bondState == BluetoothDevice.BOND_BONDED) {
                promise.resolve("Already paired with ${device.name ?: address}")
                return
            }

            currentPairPromise = promise

            bondReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val action = intent?.action
                    if (BluetoothDevice.ACTION_BOND_STATE_CHANGED == action) {
                        val bondedDevice =
                            intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                        val bondState =
                            intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)

                        if (bondedDevice?.address == address) {
                            if (bondState == BluetoothDevice.BOND_BONDED) {
                                currentPairPromise?.resolve("Paired successfully with ${bondedDevice.name ?: address}")
                            } else if (bondState == BluetoothDevice.BOND_NONE) {
                                currentPairPromise?.reject("PAIR_FAILED", "Pairing failed or cancelled")
                            }
                            currentPairPromise = null
                            try {
                                reactContext.unregisterReceiver(bondReceiver)
                            } catch (e: Exception) {
                                Log.w("BluetoothScanner", "Failed to unregister bond receiver", e)
                            }
                        }
                    }
                }
            }

            val filter = IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
            reactContext.registerReceiver(bondReceiver, filter)

            val method = device.javaClass.getMethod("createBond")
            method.invoke(device)

        } catch (e: Exception) {
            Log.e("BluetoothScanner", "Pairing error", e)
            promise.reject("PAIR_ERROR", e.message)
        }
    }
}
