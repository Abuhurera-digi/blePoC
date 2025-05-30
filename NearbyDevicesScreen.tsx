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
} from 'react-native';
import { NativeModules } from 'react-native';

const { BluetoothScanner } = NativeModules;
const { BluetoothName } = NativeModules;
const { BluetoothManager } = NativeModules;

interface Device {
    name: string;
    address: string;
}

const NearbyDevicesScreen = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [pairingAddress, setPairingAddress] = useState<string | null>(null);
console.log("NativeModules..", NativeModules)
    const requestBluetoothPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);

            const allGranted = Object.values(granted).every(
                status => status === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {
                throw new Error('Bluetooth permissions not granted');
            }
        }
    };
console.log("BluetoothManager.......", BluetoothManager);

    const scanForDevices = async () => {
        setLoading(true);
        try {
            await requestBluetoothPermissions();
            const result = await BluetoothScanner.scanDevices(10000);
        //    const result = await BluetoothManager.scanDevices(10000);
            console.log("ressss", result);

            const filtered = result.filter(
                (device: Device) =>
                    device.name && !device.name.toLowerCase().startsWith('unknown device')
            );

            console.log("Filtered devices:", filtered);
            setDevices(filtered);
            setLoading(false);
        } catch (error) {
            console.error('Scan failed:', error);
            Alert.alert('Scan Error', error.message || 'Bluetooth scan failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        scanForDevices();
    }, []);

    const handleDevicePress = async (device: Device) => {
        setPairingAddress(device.address);
        try {
            const result = await BluetoothScanner.pairDevice(device.address);
            Alert.alert('Success', result); // Show success message
        } catch (error: any) {
            console.error('Pairing failed:', error);
            Alert.alert('Pairing Error', error.message || 'Failed to pair with device');
        } finally {
            setPairingAddress(null);
            setLoading(false);
        }
    };
    
    const renderItem = ({ item }: { item: Device }) => (
        <TouchableOpacity
            style={styles.deviceItem}
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
    );

    useEffect(() => {
        const setupBroadcaster = async () => {
            try {
                const info = await BluetoothName.getBluetoothIdentity();
                const deviceId = info.deviceId;
    
                // The ID of the only device that should act as the broadcaster
                 const broadcasterId = '7f39d982f04d1193'; // replace this with actual ID Preeti's Device Id
                // const broadcasterId = '8ddeebd2bcb19a1e';
                
    
                if (deviceId === broadcasterId) {
                    const result = await BluetoothName.setBluetoothNameForRole('broadcaster');
                    console.log('Bluetooth role setup result:', result);
                } else {
                    console.log('This device is not the broadcaster.');
                }
            } catch (error) {
                console.error('Error while setting Bluetooth role:', error);
            }
        };
    
        setupBroadcaster();
    }, []);
    

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Nearby Bluetooth Devices</Text>
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
        marginBottom: 16,
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
});
