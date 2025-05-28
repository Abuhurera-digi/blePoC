import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
    PermissionsAndroid,
    Platform,
    NativeEventEmitter,
    NativeModules,
} from 'react-native';

const { BluetoothScanner, BluetoothName } = NativeModules;

interface Device {
    name: string;
    address: string;
}

const RECEIVER_ID = '24701e830cd4c026';
const BROADCASTER_ID = '8ddeebd2bcb19a1e'; // Change if needed

const NearbyDevicesScreen = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [pairingAddress, setPairingAddress] = useState<string | null>(null);
    const [serverStatus, setServerStatus] = useState<string | null>(null);

    const requestBluetoothPermissions = async () => {
        if (Platform.OS === 'android') {
            const permissions = [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ];

            if (Platform.Version >= 31) { // Android 12 and above
                permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
            }

            const granted = await PermissionsAndroid.requestMultiple(permissions);

            const allGranted = Object.values(granted).every(
                status => status === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {
                throw new Error('Bluetooth permissions not granted');
            }
        }
    };

    const scanForDevices = async () => {
        setLoading(true);
        try {
            await requestBluetoothPermissions();
            const result = await BluetoothScanner.scanDevices(10000);

            const filtered = result.filter(
                (device: Device) =>
                    device.name && !device.name.toLowerCase().startsWith('unknown device')
            );

            setDevices(filtered);
        } catch (error: any) {
            console.error('Scan failed:', error);
            Alert.alert('Scan Error', error.message || 'Bluetooth scan failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        scanForDevices();
    }, []);

    useEffect(() => {
        const assignBluetoothRole = async () => {
            try {
                const { deviceId } = await BluetoothName.getBluetoothIdentity();
                console.log("Device ID:", deviceId);
                if (deviceId === RECEIVER_ID) {
                    console.log("Acting as Receiver");
                    setServerStatus('Listening...');
                    const result = await BluetoothScanner.startBluetoothServer();
                    setServerStatus(result);
                    // Skip scanning for receiver
                } else if (deviceId === BROADCASTER_ID) {
                    console.log("Acting as Broadcaster");
                    const result = await BluetoothName.setBluetoothNameForRole('broadcaster');
                    console.log('Bluetooth name set result:', result);
                    await scanForDevices(); // Only broadcaster scans
                } else {
                    console.log("This device has no assigned role.");
                    await scanForDevices();
                }
            } catch (err: any) {
                console.error('Role assignment failed:', err);
                setServerStatus(`Error: ${err.message}`);
            }
        };

        assignBluetoothRole();
    }, []);

    // Handle data received from Kotlin
    useEffect(() => {
        const eventEmitter = new NativeEventEmitter(BluetoothScanner);
        const subscription = eventEmitter.addListener("BluetoothDataReceived", (event) => {
            const message = event.message || "No message received";

            Alert.alert(
                "Incoming Bluetooth Message",
                message,
                [
                    { text: "Decline", onPress: () => console.log("Declined") },
                    { text: "Accept", onPress: () => console.log("Accepted") }
                ]
            );
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handleDevicePress = async (device: Device) => {
        setPairingAddress(device.address);
        try {
            const result = await BluetoothScanner.pairDevice(device.address);
            Alert.alert('Paired Successfully', result);
        } catch (error: any) {
            console.error('Pairing failed:', error);
            Alert.alert('Pairing Error', error.message || 'Failed to pair with device');
        } finally {
            setPairingAddress(null);
        }
    };


    const handleSendData = async (device: Device) => {
        try {
            const result = await BluetoothScanner.sendDataToDevice(device.address, "Hello from React Native!");
            console.log("result", result);
            Alert.alert('Data Sent', result);
        } catch (error: any) {
            console.error('Send failed:', error);
            Alert.alert('Send Error', error.message || 'Failed to send data');
        }
    };

    const renderItem = ({ item }: { item: Device }) => (
        <View style={styles.deviceItem}>
            <TouchableOpacity
                onPress={() => handleDevicePress(item)}
                disabled={pairingAddress === item.address}
            >
                <Text style={styles.deviceName}>
                    {item.name === "Unknown Device"
                        ? `Device (${item.address.slice(-5)})`
                        : item.name}
                </Text>
                <Text style={styles.deviceAddress}>{item.address}</Text>
                {pairingAddress === item.address && (
                    <ActivityIndicator size="small" color="#1e40af" style={{ marginTop: 4 }} />
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.sendButton}
                onPress={() => handleSendData(item)}
            >
                <Text style={styles.buttonText}>Send Data</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Nearby Bluetooth Devices</Text>
            {serverStatus && <Text style={styles.serverStatus}>{serverStatus}</Text>}
            {loading ? (
                <ActivityIndicator size="large" color="#1e40af" />
            ) : (
                <FlatList
                    data={devices}
                    keyExtractor={(item) => item.address}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No devices found</Text>
                    }
                />
            )}
            <TouchableOpacity style={styles.rescanButton} onPress={scanForDevices}>
                <Text style={styles.buttonText}>Rescan</Text>
            </TouchableOpacity>
        </View>
    );
};

export default NearbyDevicesScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f3f4f6',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
    },
    serverStatus: {
        fontSize: 14,
        color: '#1e40af',
        marginBottom: 8,
    },
    listContainer: {
        paddingBottom: 20,
    },
    deviceItem: {
        padding: 12,
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 2,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '500',
    },
    deviceAddress: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 30,
    },
    rescanButton: {
        backgroundColor: '#1e40af',
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#10b981',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },
});
