import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, PermissionsAndroid, Platform, Alert, Button, ScrollView } from 'react-native';
import {
    Camera,
    Code,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from 'react-native-vision-camera';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { BleManager, State } from 'react-native-ble-plx';
export const manager = new BleManager();

async function requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
        const permissions = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ...(Platform.Version >= 31 ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] : []),
        ];

        try {
            const granted = await PermissionsAndroid.requestMultiple(permissions);
            return permissions.every(
                (perm) => granted[perm] === PermissionsAndroid.RESULTS.GRANTED
            );
        } catch (error) {
            console.warn('Permission error:', error);
            return false;
        }
    }
    return true;
}

function ScannerScreen() {
    const { requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const [latestScannedData, setLatestScannedData] = useState<string | null>(null);
    const [bluetoothNameFromQR, setBluetoothNameFromQR] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<any>(null);
    const [receivedData, setReceivedData] = useState<string>('');
    const [isReceiving, setIsReceiving] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            await requestPermission();
            const permissionsGranted = await requestBluetoothPermissions();
            if (!permissionsGranted) {
                Alert.alert('Permissions Denied', 'Bluetooth permissions are required.');
                return;
            }


        })();
    }, []);


    // const connectToDevice = async (device) => {
    //     try {
    //         const connected = await manager.connectToDevice(device.id);
    //         await connected.discoverAllServicesAndCharacteristics();
    //         // setConnectedDevice(connected);
    //         console.log('Connected to:', connected.name);
    //     } catch (err) {
    //         console.error('Connection error:', err);
    //     }
    // };
    const connectAndSend = async (targetName: string) => {
        try {
            const devices = await RNBluetoothClassic.getBondedDevices();
            console.log("Paired devices:", devices);

            const targetDevice = devices.find((d) => d?.name?.trim() === targetName.trim());
            console.log("Target device:", targetDevice);

            if (!targetDevice) {
                Alert.alert("Device Not Found", `No paired device with name "${targetName}" found.`);
                return;
            }


        } catch (error) {
            console.error("Bluetooth Error:", error);
            Alert.alert("Error", `An error occurred: ${error.message}`);
        }
    };




    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: async (codes: Code[]) => {
            const value = codes[0]?.value;
            if (!value) return;

            setLatestScannedData(value);
            console.log('QR Scanned:', value);

            try {
                const parsed = JSON.parse(value);
                const { bluetoothName, deviceId, publicKey, signature } = parsed;

                if (!bluetoothName || !deviceId || !publicKey || !signature) {
                    Alert.alert('Invalid QR', 'Missing required fields in QR payload');
                    return;
                }

                setBluetoothNameFromQR(bluetoothName);
                setParsedData(parsed);
            } catch (e) {
                console.error('QR Parse Error:', e);
                Alert.alert('Invalid QR Code', 'Could not parse QR code data.');
            }
        },
    });

    if (!device) {
        return (
            <View style={styles.container}>
                <Text>Camera not available</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                codeScanner={codeScanner}
                device={device}
                isActive={true}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlay}>
                <View style={styles.frame} />
            </View>

            <View style={styles.resultContainer}>
                {latestScannedData && (
                    <>
                        <Text style={styles.resultTitle}>Scanned Data:</Text>
                        <Text style={styles.resultText}>{latestScannedData}</Text>

                        {bluetoothNameFromQR && (
                            <Button
                                title={`Connect to ${bluetoothNameFromQR}`}
                                onPress={() => connectAndSend(bluetoothNameFromQR)}
                                color="#00C853"
                            />
                        )}
                    </>
                )}



                {receivedData.length > 0 && (
                    <>
                        <Text style={styles.resultTitle}>Received Data:</Text>
                        <ScrollView style={{ maxHeight: 100 }}>
                            <Text style={styles.resultText}>{receivedData}</Text>
                        </ScrollView>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    resultContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        borderRadius: 5,
    },
    resultTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: 'white' },
    resultText: { fontSize: 14, color: 'white', marginBottom: 10 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    frame: { width: 250, height: 250, borderWidth: 2, borderColor: 'lime', borderRadius: 10 },
});

export default ScannerScreen;
