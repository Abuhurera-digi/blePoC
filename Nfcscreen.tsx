import React, { useState, useEffect } from 'react';
import {
  View,
  Button,
  TextInput,
  Alert,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

const { NfcReader, HceMessage } = NativeModules;
const hceEmitter = new NativeEventEmitter(HceMessage);

export default function NfcApp() {
  const [mode, setMode] = useState<'none' | 'reader' | 'sender'>('none');
  const [message, setMessage] = useState('');

  // 🔔 Receiver: Listens for messages received via NFC
  useEffect(() => {
    const onReceive = (msg: string) => {
      Alert.alert('Received via NFC', msg);
      stopReaderMode();
    };

    const subscription = Platform.select({
      android: hceEmitter.addListener('onNfcMessage', onReceive),
      ios: hceEmitter.addListener('onNfcMessage', onReceive),
    });

    return () => subscription?.remove();
  }, []);

  // ✅ Sender: Listen for message successfully sent event
  useEffect(() => {
    const onMessageSent = () => {
      Alert.alert('Message Sent', 'The message was received successfully.');
      stopSenderMode();
    };

    const subscription = hceEmitter.addListener('onMessageSent', onMessageSent);
    return () => subscription.remove();
  }, []);

  const startReaderMode = () => {
    setMode('reader');
    NfcReader.startReaderMode();
  };

  const stopReaderMode = () => {
    NfcReader.stopReaderMode();
    setMode('none');
  };

  const startSenderMode = async () => {
      setMode('sender');
  };
  
  const stopSenderMode = async () => {
    try {
      await NativeModules.NfcSender.disableSending();
      console.log('HCE disabled (logic)');
    } catch (error) {
      console.error('Failed to stop HCE mode:', error);
    } finally {
      setMessage('');
      setMode('none');
    }
  };
  

  const submitMessage = async() => {
    try {
      await NativeModules.NfcSender.enableSending();
      console.log('HCE enabled');
    } catch (error) {
      console.error('Failed to start HCE mode:', error);
    }
    try {
      HceMessage.setMessage(message);
      Alert.alert('Ready to send. Tap another phone.');
    } catch (e) {
      console.error('Failed to set message in native module:', e);
    }
  };

  return (
    <View style={{ marginTop: 200, marginHorizontal: 10, rowGap: 30 }}>
      <Button title="Start Receiving Money" onPress={startReaderMode} disabled={mode !== 'none'} />
      <Button title="Stop Receiving Money" onPress={stopReaderMode} disabled={mode !== 'reader'} />
      <Button title="Start Sending Money" onPress={startSenderMode} disabled={mode !== 'none'} />
      <Button title="Stop Sending Money" onPress={stopSenderMode} disabled={mode !== 'sender'} />

      {mode === 'sender' && (
        <>
          <TextInput
            placeholder="Enter message"
            placeholderTextColor="black"
            value={message}
            onChangeText={setMessage}
            style={{ borderColor: 'gray', borderWidth: 1, padding: 8 }}
          />
          <Button title="Next (Send)" onPress={submitMessage} />
        </>
      )}
    </View>
  );
}
