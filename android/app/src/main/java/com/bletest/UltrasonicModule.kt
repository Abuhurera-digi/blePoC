package com.bletest

import android.media.*
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.pow

class UltrasonicModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "UltrasonicModule"

    @ReactMethod
    fun startTransmitting(message: String) {
        Log.d("UltrasonicModule", "Transmitting: $message")

        thread {
            for (bit in message) {
                val frequency = if (bit == '1') 19000 else 18000
                playTone(frequency, 200)
                Thread.sleep(50) // gap between bits
            }
        }
    }

    private fun playTone(freqHz: Int, durationMs: Int) {
        val sampleRate = 44100
        val count = (sampleRate * durationMs / 1000.0).roundToInt()
        val buffer = ShortArray(count)

        for (i in buffer.indices) {
            val angle = 2.0 * PI * i * freqHz / sampleRate
            buffer[i] = (sin(angle) * Short.MAX_VALUE).toInt().toShort()
        }

        val audioTrack = AudioTrack(
            AudioManager.STREAM_MUSIC,
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            buffer.size * 2,
            AudioTrack.MODE_STATIC
        )

        audioTrack.write(buffer, 0, buffer.size)
        audioTrack.play()
        while (audioTrack.playState == AudioTrack.PLAYSTATE_PLAYING) {
            Thread.sleep(10)
        }
        audioTrack.release()
    }

    @ReactMethod
    fun startReceiving() {
        Log.d("UltrasonicModule", "🎧 Starting AudioRecord for receiving")

        thread {
            val sampleRate = 44100
            val bufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )

            val audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )

            if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
                Log.e("UltrasonicModule", "AudioRecord initialization failed")
                return@thread
            }

            audioRecord.startRecording()
            Log.d("UltrasonicModule", "🔊 Recording started")

            val buffer = ShortArray(bufferSize)
            val bitBuffer = StringBuilder()

            val freq0 = 18000.0
            val freq1 = 19000.0

            // Listen until 8 bits decoded
            while (bitBuffer.length < 8) {
                val read = audioRecord.read(buffer, 0, buffer.size)
                if (read > 0) {
                    val power0 = goertzel(buffer, read, sampleRate, freq0)
                    val power1 = goertzel(buffer, read, sampleRate, freq1)
                    val bit = if (power1 > power0) '1' else '0'
                    bitBuffer.append(bit)

                    Log.d("UltrasonicModule", "Detected bit: $bit (P0=$power0, P1=$power1)")
                }
            }

            audioRecord.stop()
            audioRecord.release()
            Log.d("UltrasonicModule", "🔇 Recording stopped")

            val params = Arguments.createMap()
            params.putString("message", bitBuffer.toString())
            sendEvent("onMessageReceived", params)
        }
    }

    private fun goertzel(samples: ShortArray, sampleCount: Int, sampleRate: Int, targetFreq: Double): Double {
        val k = (0.5 + (sampleCount * targetFreq / sampleRate)).toInt()
        val omega = 2.0 * PI * k / sampleCount
        val sine = kotlin.math.sin(omega)
        val cosine = kotlin.math.cos(omega)
        val coeff = 2.0 * cosine

        var q0 = 0.0
        var q1 = 0.0
        var q2 = 0.0

        for (i in 0 until sampleCount) {
            q0 = coeff * q1 - q2 + samples[i]
            q2 = q1
            q1 = q0
        }

        return q1.pow(2) + q2.pow(2) - q1 * q2 * coeff
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
