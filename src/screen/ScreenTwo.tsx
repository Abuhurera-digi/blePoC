import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import CryptoJS from 'react-native-crypto-js'

const ScreenTwo = ({ route, navigation }: { route: any, navigation: any }) => {
    const secretKey = 'my-super-secret-key-1234' // This should match the key used in ScreenOne
    
    useEffect(() => {
        if (route.params?.encryptedData) {
            // Decrypt the data
            try {
                const bytes = CryptoJS?.AES?.decrypt(route?.params?.encryptedData, secretKey)
                const decryptedData = bytes?.toString(CryptoJS?.enc?.Utf8)
                if (decryptedData) {
                    const parsedData = JSON?.parse(decryptedData)
                    console.log('Decrypted data:', parsedData)
                } else {
                    console.log('Decryption failed - possibly wrong key')
                }
            } catch (error) {
                console.error('Decryption error:', error)
            }
        }
    }, [route.params?.encryptedData])

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{"Screen Two"}</Text>
            <Text style={styles.text}>{"Check the console for decrypted data"}</Text>
        </View>
    )
}

export default ScreenTwo

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
    text: {
        fontSize: 16,
        color: '#333',
    },
})