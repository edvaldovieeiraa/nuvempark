package com.nuvempark.nuvempark_app

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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
 *
 * Expõe também o canal de operação em segundo plano (ver OperacaoService).
 */
class MainActivity : FlutterActivity() {
    private val canalLockTask = "nuvempark/lock_task"
    private val canalBackground = "nuvempark/background"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, canalLockTask)
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

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, canalBackground)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "start" -> {
                        try {
                            OperacaoService.iniciar(this)
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    }
                    "stop" -> {
                        try {
                            OperacaoService.parar(this)
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    }
                    "manterTelaLigada" ->
                        result.success(manterTelaLigada(call.arguments as? Boolean ?: true))
                    "isentoDeBateria" -> result.success(isentoDeBateria())
                    "pedirIsencaoBateria" -> result.success(pedirIsencaoBateria())
                    "ehDeviceOwner" -> result.success(ehDeviceOwner())
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

    private fun ehDeviceOwner(): Boolean {
        return try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            dpm.isDeviceOwnerApp(packageName)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Tablet fixo de pátio: a tela nunca dorme enquanto estiver na tomada.
     *
     * É a camada mais barata das duas — com a tela acesa o app não sai de
     * foreground, e nada disso (freezer, Doze, FGS) chega a entrar em jogo.
     * Só um Device Owner pode mexer nesta global; num aparelho não provisionado
     * devolve false e quem segura a operação é o OperacaoService.
     */
    private fun manterTelaLigada(ligar: Boolean): Boolean {
        if (!ehDeviceOwner()) return false
        return try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val admin = ComponentName(this, NuvemParkDeviceAdminReceiver::class.java)
            // Bitmask do BatteryManager: AC(1) | USB(2) | WIRELESS(4) = 7.
            // "0" devolve ao sistema o comportamento normal de suspensão.
            val valor = if (ligar) "7" else "0"
            @Suppress("DEPRECATION")
            dpm.setGlobalSetting(admin, Settings.Global.STAY_ON_WHILE_PLUGGED_IN, valor)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * O Doze suspende a rede do app com a tela apagada — nem um foreground
     * service escapa disso; quem escapa é quem está na allowlist de bateria.
     *
     * Device Owner já é isento por padrão (o Android o trata como app de
     * sistema para efeito de Doze/App Standby), então nem perguntamos ao
     * PowerManager.
     */
    private fun isentoDeBateria(): Boolean {
        if (ehDeviceOwner()) return true
        return try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(packageName)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Abre o diálogo do sistema pedindo a isenção. Só faz sentido no aparelho
     * NÃO provisionado: um Device Owner já é isento, e em quiosque o LockTask
     * bloquearia a tela do sistema de qualquer forma.
     */
    private fun pedirIsencaoBateria(): Boolean {
        if (isentoDeBateria()) return true
        return try {
            startActivity(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                    .setData(Uri.parse("package:$packageName")),
            )
            true
        } catch (e: Exception) {
            false
        }
    }
}
