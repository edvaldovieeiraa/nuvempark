package com.nuvempark.nuvempark_app

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * Lock Task Mode (screen pinning): fixa o app na tela, bloqueando a barra de
 * notificação, a barra de status e os botões home/recentes do Android — o
 * operador não sai do app nem acessa o sistema por engano.
 *
 * Sem um "device owner" configurado (MDM), o Android mostra um diálogo de
 * confirmação na 1ª vez. Para travar SEM diálogo, o aparelho precisa ter o
 * app como device owner via `adb shell dpm set-device-owner ...`.
 */
class MainActivity : FlutterActivity() {
    private val channel = "nuvempark/lock_task"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channel)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "start" -> {
                        try {
                            startLockTask()
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    }
                    "stop" -> {
                        try {
                            stopLockTask()
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    }
                    "isLocked" -> result.success(estaEmLockTask())
                    else -> result.notImplemented()
                }
            }
    }

    private fun estaEmLockTask(): Boolean {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
        } else {
            @Suppress("DEPRECATION")
            am.isInLockTaskMode
        }
    }
}
