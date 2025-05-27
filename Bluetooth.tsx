import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, PermissionsAndroid, Platform, Alert, Modal } from "react-native";
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeModules } from 'react-native';

const Bluetooth = () => {
    const [receivedData, setReceivedData] = useState("");
    const [isReceiving, setIsReceiving] = useState(false);
    const [qrVisible, setQrVisible] = useState(false);
    const [bluetoothName, setBluetoothName] = useState(); // Default name; can replace dynamically

    const navigation = useNavigation();


    const { BluetoothName } = NativeModules;
    const getAddress = async () => {
        try {
            const info = await BluetoothName.getBluetoothIdentity();
            setBluetoothName(info.name);
            console.log('Bluetooth Name:', info.name);
            console.log('Device ID (Android):', info.deviceId);
        } catch (e) {
            console.error('Error getting Bluetooth info:', e);
        }
    };

    useEffect(() => {
        requestBluetoothPermissions();
        getAddress();
    }, []);

    const requestBluetoothPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                if (
                    granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED ||
                    granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    Alert.alert("Error", "Bluetooth permissions not granted.");
                } else {
                    console.log("Bluetooth permissions granted");
                }
            } catch (err) {
                console.error("Permission request error:", err);
            }
        }
    };

    const connectAndSend = async () => {
        try {
            const devices = await RNBluetoothClassic.getBondedDevices();
            const device = devices[0];
            const connectedDevice = await RNBluetoothClassic.connectToDevice(device.address);
            const message = "Hello from sender!";
            const success = await connectedDevice.write(message);

            success
                ? Alert.alert("Success", "Message sent!")
                : Alert.alert("Failed", "Failed to send message.");
        } catch (error) {
            console.error("Send Error:", error);
            Alert.alert("Error", "Failed to send data.");
        }
    };

    const acceptConnection = async () => {
        try {
            if (isReceiving) return;
            setIsReceiving(true);
            const device = await RNBluetoothClassic.accept();

            while (true) {
                const data = await device.read();
                if (data) {
                    setReceivedData(prev => prev + '\n' + data);
                }
            }
        } catch (error) {
            console.error("Receive Error:", error);
            setIsReceiving(false);
            Alert.alert("Error", "Failed to receive data.");
        }
    };

    const generateQrPayload = () => {
        return JSON.stringify({
            bluetoothName,
            deviceId: "device-1234",
            publicKey: "fake-public-key",
            signature: "fake-signature",
        });
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, marginBottom: 20 }}>Bluetooth Communication</Text>

            <TouchableOpacity onPress={connectAndSend} style={styles.buttonGreen}>
                <Text style={styles.buttonText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={acceptConnection} style={styles.buttonBlue}>
                <Text style={styles.buttonText}>Receive</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setQrVisible(true)} style={styles.buttonPurple}>
                <Text style={styles.buttonText}>Generate QR</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Scanner')} style={styles.buttonGray}>
                <Text style={styles.buttonText}>Scan QR</Text>
            </TouchableOpacity>

            <Text style={{ marginTop: 30, fontSize: 16, fontWeight: "bold" }}>Received Data:</Text>
            <Text style={{ marginTop: 10, color: "#000" }}>{receivedData || "No data received yet."}</Text>

            <Modal visible={qrVisible} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.qrBox}>
                        <QRCode value={generateQrPayload()} size={200} />
                        <TouchableOpacity onPress={() => setQrVisible(false)} style={styles.closeButton}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = {
    buttonGreen: { backgroundColor: "#4CAF50", padding: 12, marginBottom: 10 },
    buttonBlue: { backgroundColor: "#2196F3", padding: 12, marginBottom: 10 },
    buttonPurple: { backgroundColor: "#9C27B0", padding: 12, marginBottom: 10 },
    buttonGray: { backgroundColor: "#607D8B", padding: 12, marginBottom: 10 },
    buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000aa' },
    qrBox: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center' },
    closeButton: { marginTop: 20, backgroundColor: '#F44336', padding: 10, borderRadius: 5 }
};

export default Bluetooth;
