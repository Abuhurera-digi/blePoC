import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import CryptoJS from 'react-native-crypto-js'

const ScreenOne = ({ navigation }: { navigation: any }) => {
    const secretKey = 'my-super-secret-key-1234' // This should be stored securely in production

    const sendDataToScreenTwo = () => {
        // Static/dummy data to send
        const dataToSend = {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            accountNumber: '1234567890',
            balance: 10000.50
        }

        // Convert data to string
        const dataString = JSON?.stringify(dataToSend)
        // Encrypt the data
        const encryptedData = CryptoJS?.AES?.encrypt(dataString, secretKey)?.toString()
        console.log("Encrypted Data:", encryptedData)
        // Navigate with encrypted data
        navigation.navigate('ScreenTwo', { encryptedData })
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{"Screen One"}</Text>
            <TouchableOpacity
                style={styles.scanButton}
                onPress={sendDataToScreenTwo}
            >
                <Text style={styles.scanButtonText}>{"Send Encrypted Data"}</Text>
            </TouchableOpacity>
        </View>
    )
}

export default ScreenOne

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    scanButton: {
        marginTop: 30,
        backgroundColor: '#1e40af',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 16,
    },
})