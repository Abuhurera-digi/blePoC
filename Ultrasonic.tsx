import React, { useEffect } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    NativeModules,
    NativeEventEmitter,
    Alert,
    PermissionsAndroid,
    Platform,
} from 'react-native';

const { UltrasonicModule } = NativeModules;
const ultrasonicEvents = new NativeEventEmitter(UltrasonicModule);

// Request microphone permission (Android only)
const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
        try {
            console.log('Requesting microphone permission...');
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'This app needs microphone access for ultrasonic receiving.',
                    buttonPositive: 'OK',
                    buttonNegative: 'Cancel',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('Permission error:', err);
            return false;
        }
    }
    return true; // iOS handled via Info.plist
};

const Ultrasonic = () => {
    useEffect(() => {
        const subscription = ultrasonicEvents.addListener('onMessageReceived', (event) => {
            console.log('📡 Received from native:', event.message);
            Alert.alert('Ultrasonic Received', event.message);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handleTransmit = () => {
        const messageToSend = '10110011';
        console.log('📤 Sending message:', messageToSend);
        if (UltrasonicModule?.startTransmitting) {
            UltrasonicModule.startTransmitting(messageToSend);
        } else {
            console.warn('UltrasonicModule.startTransmitting is not available');
        }
    };

    const handleReceive = async () => {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Microphone access is needed to receive data.');
            return;
        }

        console.log('📥 Starting to receive messages');
        if (UltrasonicModule?.startReceiving) {
            UltrasonicModule.startReceiving();
        } else {
            console.warn('UltrasonicModule.startReceiving is not available');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔊 Ultrasonic Communication</Text>
            <Button title="Start Transmitting" onPress={handleTransmit} />
            <View style={{ marginVertical: 10 }} />
            <Button title="Start Receiving" onPress={handleReceive} />
        </View>
    );
};

export default Ultrasonic;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        marginBottom: 30,
        textAlign: 'center',
    },
});
