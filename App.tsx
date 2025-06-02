import React, { useEffect, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { NativeModules } from 'react-native';

import QRCode from 'react-native-qrcode-svg';
import DeviceInfo from 'react-native-device-info';
import RNRsa from 'react-native-rsa-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScannerScreen from './ScannerScreen';
import { enableScreens } from 'react-native-screens';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import Bluetooth from './Bluetooth';
import NearbyDevicesScreen from './NearbyDevicesScreen';
import RecevingDataFromSender from './RecevingDataFromSender';
import Ultrasonic from './Ultrasonic';

const Stack = createNativeStackNavigator();
enableScreens(); // Add this line at the top

const HomeScreen = ({ navigation }: any) => {
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  useEffect(() => {
    const requestPermissionsAndInit = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allGranted) {
          console.warn('Bluetooth permissions not granted');
          return;
        }
      }

      await generateQrPayload();
      await getAddress(); // ✅ Only call this after permissions are granted
    };

    requestPermissionsAndInit();
  }, []);


  const generateQrPayload = async () => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const keys = await RNRsa.generateKeys(2048);
      const signature = await RNRsa.sign(deviceId, keys.private);
      const bluetoothName = `MyDevice_${deviceId}`;

      const payload = {
        deviceId,
        publicKey: keys.public,
        signature,
        bluetoothName,
      };

      setQrPayload(JSON.stringify(payload));
    } catch (err) {
      console.warn('QR generation failed:', err);
    }
  };

  const [isDiscovering, setIsDiscovering] = useState(false);


  const { BluetoothName } = NativeModules;
  const getAddress = async () => {
    try {
      const info = await BluetoothName.getBluetoothIdentity();
      console.log('Bluetooth Name:', info.name);
      console.log('Device ID (Android):', info.deviceId);
    } catch (e) {
      console.error('Error getting Bluetooth info:', e);
    }
  };


  useEffect(() => {
    getAddress();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Device Identity QR</Text>
      {qrPayload ? (
        <>
          <QRCode value={qrPayload} size={250} />
          <Text style={styles.address}>QR Ready</Text>
        </>
      ) : (
        <Text style={styles.loadingText}>Generating secure QR...</Text>
      )}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.scanButtonText}>Scan Device QR</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('ble')}
      >
        <Text style={styles.scanButtonText}> Device</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('NearbyDevices')}
      >
        <Text style={styles.scanButtonText}>Scan Nearby Devices</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('reciveData')}
      >
        <Text style={styles.scanButtonText}>RecevingDataFromSender</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('ultra')}
      >
        <Text style={styles.scanButtonText}>ultrasonic</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
};

const App = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="ble" component={Bluetooth} />
      <Stack.Screen name="NearbyDevices" component={NearbyDevicesScreen} />
      <Stack.Screen name='reciveData' component={RecevingDataFromSender} />
      <Stack.Screen name='ultra' component={Ultrasonic} />
    </Stack.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  address: {
    fontSize: 18,
    marginTop: 12,
    fontWeight: '500',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: 'gray',
  },
  scanButton: {
    marginTop: 30,
    backgroundColor: '#1e40af',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default App;
