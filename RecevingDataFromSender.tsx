// ReceivingDataFromSender.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, NativeEventEmitter, NativeModules } from 'react-native';

const { BluetoothScanner } = NativeModules;

interface Message {
    id: string;
    amount: number;
    payloadId: string;
    status: string;
    sender: string;
    timestamp: number;
}

const ReceivingDataFromSender = () => {
    const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

    useEffect(() => {
        const startServerAndListen = async () => {
            try {
                await BluetoothScanner.startBluetoothServer();
                console.log('Bluetooth server started');
            } catch (error) {
                console.error('Failed to start server:', error);
            }
        };

        const emitter = new NativeEventEmitter(BluetoothScanner);
        const subscription = emitter.addListener("BluetoothDataReceived", (event) => {
            const sender = event.sender || "Unknown sender";
            try {
                const payload = JSON.parse(event.message);
                if (
                    typeof payload.amount === 'number' &&
                    typeof payload.id === 'string' &&
                    typeof payload.status === 'string'
                ) {
                    setReceivedMessages((prev) => [
                        ...prev,
                        {
                            id: `${Date.now()}-${sender}`,
                            amount: payload.amount,
                            payloadId: payload.id,
                            status: payload.status,
                            sender,
                            timestamp: Date.now(),
                        },
                    ]);
                } else {
                    console.warn("Invalid payload format:", event.message);
                }
            } catch {
                setReceivedMessages((prev) => [
                    ...prev,
                    {
                        id: `${Date.now()}-${sender}`,
                        amount: 0,
                        payloadId: "N/A",
                        status: "Error: Invalid JSON",
                        sender,
                        timestamp: Date.now(),
                    },
                ]);
            }
        });

        startServerAndListen();
        return () => {
            subscription.remove();
        };
    }, []);

    const renderItem = ({ item }: { item: Message }) => (
        <View style={styles.messageItem}>
            <Text style={styles.messageSender}>From: {item.sender}</Text>
            <Text style={styles.messageText}>Amount: ₹{item.amount}</Text>
            <Text style={styles.messageText}>Status: {item.status}</Text>
            <Text style={styles.messageTimestamp}>
                Received at: {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Received Data</Text>
            <FlatList
                data={receivedMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

export default ReceivingDataFromSender;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f0fdf4' },
    title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
    listContainer: { paddingBottom: 20 },
    messageItem: { padding: 12, marginBottom: 10, backgroundColor: '#dcfce7', borderRadius: 10 },
    messageSender: { fontSize: 14, fontWeight: '500' },
    messageText: { fontSize: 16, marginTop: 4 },
    messageTimestamp: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
