package com.bletest

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.*
import android.content.*
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import java.util.UUID
import android.bluetooth.BluetoothServerSocket
import com.facebook.react.modules.core.DeviceEventManagerModule



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
    private var serverThread: Thread? = null
private var isServerRunning = false


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
@ReactMethod
fun sendDataToDevice(address: String, message: String, promise: Promise) {
    try {
        val device = bluetoothAdapter.getRemoteDevice(address)
        val socket = device.createRfcommSocketToServiceRecord(UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"))
        bluetoothAdapter.cancelDiscovery()

        // Retry logic with timeout
        var retryCount = 0
        val maxRetries = 3
        var connected = false
        var lastException: Exception? = null
        val timeout = 10000L // 10 seconds

        while (retryCount < maxRetries && !connected) {
            val connectThread = Thread {
                try {
                    socket.connect()
                } catch (e: Exception) {
                    throw e
                }
            }
            connectThread.start()

            // Wait for connection with timeout
            val startTime = System.currentTimeMillis()
            while (connectThread.isAlive) {
                if (System.currentTimeMillis() - startTime > timeout) {
                    connectThread.interrupt()
                    socket.close()
                    throw Exception("Connection timed out after ${timeout}ms")
                }
                Thread.sleep(100)
            }

            try {
                Log.d("BluetoothScanner", "Attempting to connect to $address (Attempt ${retryCount + 1})")
                connectThread.join() // Wait for thread to complete
                connected = true
                Log.d("BluetoothScanner", "Connected to $address")
            } catch (e: Exception) {
                lastException = e
                retryCount++
                Log.w("BluetoothScanner", "Connection attempt $retryCount failed: ${e.message}")
                if (retryCount < maxRetries) {
                    Thread.sleep(1000)
                }
            }
        }

        if (!connected) {
            throw lastException ?: Exception("Failed to connect after $maxRetries attempts")
        }

        try {
            val output = socket.outputStream
            output.write(message.toByteArray())
            output.flush()
            Log.d("BluetoothScanner", "Data sent to $address: $message")
            Thread.sleep(1000) // Delay to ensure receiver processes data
        } finally {
            try {
                socket.close()
                Log.d("BluetoothScanner", "Sender socket closed for $address")
            } catch (e: Exception) {
                Log.w("BluetoothScanner", "Error closing sender socket: ${e.message}")
            }
        }
        promise.resolve("Message sent to $address")
    } catch (e: Exception) {
        Log.e("BluetoothScanner", "Send failed: ${e.message}")
        promise.reject("SEND_ERROR", e.message)
    }
}
@ReactMethod
fun startBluetoothServer(promise: Promise) {
    if (isServerRunning) {
        promise.reject("SERVER_RUNNING", "Server is already running")
        return
    }

    stopCurrentScan()

    serverThread = Thread {
        var serverSocket: BluetoothServerSocket? = null
        try {
            isServerRunning = true
            serverSocket = bluetoothAdapter
                .listenUsingRfcommWithServiceRecord("BluetoothServer", UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"))

            Log.d("BluetoothScanner", "Server socket listening...")

            while (isServerRunning) {
                try {
                    serverSocket?.accept(10000)?.let { socket ->
                        Log.d("BluetoothScanner", "Client connected: ${socket.remoteDevice.address}")
                        
                        Thread {
                            var input: java.io.InputStream? = null
                            try {
                                input = socket.inputStream
                                val buffer = ByteArray(1024)
                                val bytesRead = input.read(buffer)
                                if (bytesRead == -1) {
                                    Log.w("BluetoothScanner", "Client disconnected or end of stream reached")
                                    return@Thread
                                }
                                val receivedMessage = String(buffer, 0, bytesRead)
                                Log.d("BluetoothScanner", "Received: $receivedMessage")

                                // Send event to JS
                                val params = Arguments.createMap().apply {
                                    putString("message", receivedMessage)
                                    putString("sender", socket.remoteDevice.address)
                                }
                                reactContext
                                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                                    .emit("BluetoothDataReceived", params)
                            } catch (e: Exception) {
                                Log.e("BluetoothScanner", "Error handling client connection: ${e.message}")
                            } finally {
                                try {
                                    socket.close()
                                    Log.d("BluetoothScanner", "Client socket closed")
                                } catch (e: Exception) {
                                    Log.w("BluetoothScanner", "Error closing client socket: ${e.message}")
                                }
                            }
                        }.start()
                    } ?: Log.w("BluetoothScanner", "Accept timed out, continuing to listen")
                } catch (e: Exception) {
                    Log.e("BluetoothScanner", "Error accepting connection: ${e.message}")
                    if (!isServerRunning) break
                }
            }
            promise.resolve("Server started and listening")
        } catch (e: Exception) {
            Log.e("BluetoothScanner", "Server error: ${e.message}")
            promise.reject("SERVER_ERROR", e.message)
        } finally {
            try {
                serverSocket?.close()
                Log.d("BluetoothScanner", "Server socket closed")
            } catch (e: Exception) {
                Log.w("BluetoothScanner", "Error closing server socket: ${e.message}")
            }
            isServerRunning = false
        }
    }
    serverThread?.start()
}

@ReactMethod
fun stopBluetoothServer(promise: Promise) {
    isServerRunning = false
    serverThread?.interrupt()
    promise.resolve("Server stopped")
}




}
