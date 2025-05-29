// NearbyDevicesScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    PermissionsAndroid,
    Platform,
    NativeModules,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { BluetoothScanner, BluetoothName } = NativeModules;

interface Device {
    name: string;
    address: string;
}

const BROADCASTER_ID = '8ddeebd2bcb19a1e';

const NearbyDevicesScreen = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [pairingAddress, setPairingAddress] = useState<string | null>(null);
    const [serverStatus, setServerStatus] = useState<string | null>(null);
    const navigation = useNavigation();

    const requestBluetoothPermissions = async () => {
        if (Platform.OS === 'android') {
            const permissions = [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ];
            if (Platform.Version >= 31) {
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
            setServerStatus(`Scan Error: ${error.message || 'Bluetooth scan failed'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const assignBluetoothRole = async () => {
            try {
                const { deviceId } = await BluetoothName.getBluetoothIdentity();
                if (deviceId === BROADCASTER_ID) {
                    await BluetoothName.setBluetoothNameForRole('broadcaster');
                    setIsBroadcaster(true);
                } else {
                    navigation.navigate('ReceivingDataFromSender' as never);
                }
            } catch (err: any) {
                setServerStatus(`Error: ${err.message}`);
            }
        };
        assignBluetoothRole();
    }, []);

    const [isBroadcaster, setIsBroadcaster] = useState(false);

    useEffect(() => {
        if (isBroadcaster) {
            scanForDevices();
        }
    }, [isBroadcaster]);


    const handleDevicePress = async (device: Device) => {
        setPairingAddress(device.address);
        try {
            const result = await BluetoothScanner.pairDevice(device.address);
            setServerStatus(`Paired Successfully: ${result}`);
        } catch (error: any) {
            setServerStatus(`Pairing Error: ${error.message}`);
        } finally {
            setPairingAddress(null);
        }
    };

    const handleSendData = async (device: Device) => {
        try {
            const payload = {
                amount: 1200,
                id: "212121",
                status: "true",
            };
            const result = await BluetoothScanner.sendDataToDevice(
                device.address,
                JSON.stringify(payload)
            );
            setServerStatus(`Data Sent: ${result}`);
        } catch (error: any) {
            setServerStatus(`Send Error: ${error.message}`);
        }
    };

    const renderDeviceItem = ({ item }: { item: Device }) => (
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
                    renderItem={renderDeviceItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>No devices found</Text>}
                    ListHeaderComponent={<Text style={styles.subTitle}>Devices</Text>}
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
    container: { flex: 1, padding: 16, backgroundColor: '#f3f4f6' },
    title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
    subTitle: { fontSize: 18, fontWeight: '500', marginVertical: 8 },
    serverStatus: { fontSize: 14, color: '#1e40af', marginBottom: 8 },
    listContainer: { paddingBottom: 20 },
    deviceItem: { padding: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: 10, elevation: 2 },
    deviceName: { fontSize: 16, fontWeight: '500' },
    deviceAddress: { fontSize: 14, color: '#555', marginTop: 4 },
    sendButton: { backgroundColor: '#10b981', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
    rescanButton: { backgroundColor: '#1e40af', padding: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 10 },
});
