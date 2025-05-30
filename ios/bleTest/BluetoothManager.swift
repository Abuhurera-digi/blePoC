import Foundation
import CoreBluetooth
import React

@objc(BluetoothManager)
class BluetoothManager: RCTEventEmitter, CBCentralManagerDelegate, CBPeripheralManagerDelegate {

    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!
    private var discoveredDevices: [[String: String]] = []
    private var hasListeners = false
    private var serviceUUID = CBUUID(string: "1234")

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    override func supportedEvents() -> [String]! {
        return ["onDeviceFound"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    @objc func startScanning() {
        discoveredDevices.removeAll()
        centralManager.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }

    @objc func startAdvertising(_ name: String) {
        let advertisementData: [String: Any] = [
            CBAdvertisementDataLocalNameKey: name,
            CBAdvertisementDataServiceUUIDsKey: [serviceUUID]
        ]
        peripheralManager.startAdvertising(advertisementData)
    }

    @objc func stopAdvertising() {
        peripheralManager.stopAdvertising()
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state != .poweredOn {
            print("Central is not powered on")
        }
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state != .poweredOn {
            print("Peripheral is not powered on")
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String : Any],
                        rssi RSSI: NSNumber) {

        guard let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String else {
            return
        }

        let device: [String: String] = [
            "name": name,
            "uuid": peripheral.identifier.uuidString
        ]

        if !discoveredDevices.contains(where: { $0["uuid"] == device["uuid"] }) {
            discoveredDevices.append(device)
            if hasListeners {
                sendEvent(withName: "onDeviceFound", body: device)
            }
        }
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc func getScannedDevices(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(discoveredDevices)
    }

    @objc func scanDevices(_ timeout: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        startScanning()

        DispatchQueue.main.asyncAfter(deadline: .now() + timeout.doubleValue / 1000.0) {
            self.centralManager.stopScan()
            resolve(self.discoveredDevices)
        }
    }
}
