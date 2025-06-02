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
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { BluetoothScanner, BluetoothName } = NativeModules;

interface Device {
    name: string;
    address: string;
    status?: 'idle' | 'pairing' | 'paired' | 'failed';
}

const BROADCASTER_ID = '8ddeebd2bcb19a1e';

// Component to display status text with useEffect updating state on status change
const DeviceStatusText = ({ status }: { status?: Device['status'] }) => {
    const [statusText, setStatusText] = useState('Available');

    useEffect(() => {
        if (status === 'idle' || !status) {
            setStatusText('Available');
        } else {
            setStatusText(status);
        }
    }, [status]);

    return <Text style={styles.deviceStatus}>Status: {statusText}</Text>;
};

const NearbyDevicesScreen = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [serverStatus, setServerStatus] = useState<string | null>(null);
    const [isBroadcaster, setIsBroadcaster] = useState(false);
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
            const result = await BluetoothScanner.scanDevices(20000);
            const filtered: Device[] = result
                .filter((device: Device) => device.name && !device.name.toLowerCase().startsWith('unknown device'))
                .map((device: Device) => ({ ...device, status: 'idle' }));
            setDevices(filtered);
            setServerStatus(null);
        } catch (error: any) {
            setServerStatus(`Scan Error: ${error.message || 'Bluetooth scan failed'}`);
        } finally {
            setLoading(false);
        }
    };

    const updateDeviceStatus = (address: string, status: Device['status']) => {
        setDevices(prev =>
            prev.map(dev =>
                dev.address === address ? { ...dev, status } : dev
            )
        );
    };

    const handleDevicePress = async (device: Device) => {
        updateDeviceStatus(device.address, 'pairing');
        try {
            await BluetoothScanner.pairDevice(device.address);
            updateDeviceStatus(device.address, 'paired');
        } catch (error: any) {
            updateDeviceStatus(device.address, 'failed');
            setServerStatus(`Pairing Error: ${error.message}`);
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
            Alert.alert(
                'Success',
                `Data sent successfully to ${device.name || device.address}`,
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            setServerStatus(`Send Error: ${error.message}`);
            Alert.alert(
                'Error',
                `Failed to send data to ${device.name || device.address}\n${error.message}`,
                [{ text: 'OK' }]
            );
        }
    };

    const renderDeviceItem = ({ item }: { item: Device }) => {
        const isLoading = item.status === 'pairing';

        return (
            <View style={styles.deviceItem}>
                <TouchableOpacity onPress={() => handleDevicePress(item)}>
                    <View>
                        <Text style={styles.deviceName}>
                            {item.name || `Device (${item.address.slice(-5)})`}
                        </Text>
                        {item.status === 'paired' && (
                            <Text style={styles.connectedMessage}>
                                Connected to {item.name || item.address}
                            </Text>
                        )}
                    </View>

                    {/* Use the new DeviceStatusText component */}
                    <DeviceStatusText status={item.status} />

                    {isLoading && (
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

    useEffect(() => {
        console.log('Updated devices:', devices);
    }, [devices]);

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
                    extraData={devices}
                />
            )}
            <TouchableOpacity style={styles.rescanButton} onPress={scanForDevices}>
                <Text style={styles.buttonText}>Scan</Text>
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
    deviceItem: {
        padding: 12,
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 2
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '500'
    },
    connectedMessage: {
        fontSize: 13,
        color: '#b91c1c',
        marginTop: 2,
        fontWeight: 'bold',
        fontStyle: 'normal',
    },
    deviceStatus: { fontSize: 13, color: '#1e3a8a', marginTop: 4 },
    sendButton: {
        backgroundColor: '#10b981',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center'
    },
    rescanButton: {
        backgroundColor: '#1e40af',
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center'
    },
    buttonText: { color: '#fff', fontSize: 16 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 10 },
});
