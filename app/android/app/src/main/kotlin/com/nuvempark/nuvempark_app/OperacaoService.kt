package com.nuvempark.nuvempark_app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Mantém o app vivo com a tela apagada / fora de foco, para que o heartbeat
 * (60s) e o loop de sincronização continuem rodando num pátio em operação.
 *
 * POR QUE UM SERVIÇO NATIVO, se os timers são Dart?
 * A partir do Android 12 o "Cached Apps Freezer" CONGELA a CPU do processo
 * assim que ele deixa de estar em foreground — os `Timer.periodic` do isolate
 * principal simplesmente param de disparar (não morrem: ficam suspensos, e o
 * relógio deles nem avança). Um foreground service tira o processo da fila de
 * congelamento. É só isso que este serviço faz: ele NÃO executa Dart, não abre
 * conexão, não conhece heartbeat nem sync. A lógica continua toda no isolate
 * principal, com o Riverpod/Dio/Drift que já existem — sem isolate paralelo,
 * sem segunda instância do banco.
 *
 * TIPO `specialUse`, NÃO `dataSync`: no Android 15+ um FGS `dataSync` é
 * limitado a 6h por dia e o sistema o derruba via onTimeout. Um pátio abre
 * mais que 6h, então `dataSync` quebraria toda tarde. `specialUse` não tem
 * esse teto; ele exige justificativa na review da Play Store, o que não se
 * aplica aqui — o app é enterprise/sideloaded (Device Owner), não passa pela
 * Play.
 *
 * A notificação é obrigatória (é o contrato do FGS: nada roda escondido).
 * Em modo quiosque ela fica invisível de qualquer jeito — o LockTask bloqueia
 * a barra de notificação.
 */
class OperacaoService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        criarCanal()

        // Android 14+ exige declarar o tipo no momento de subir o serviço, e
        // ele tem que bater com o foregroundServiceType do manifest.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(
                this,
                ID_NOTIFICACAO,
                montarNotificacao(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(ID_NOTIFICACAO, montarNotificacao())
        }

        // START_STICKY: se o sistema matar o processo por pressão de memória
        // (tablet barato de pátio, madrugada), o Android o recria sozinho.
        return START_STICKY
    }

    private fun criarCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CANAL_ID) != null) return
        // IMPORTANCE_LOW: sem som e sem pop-up. O operador não pode ser
        // interrompido a cada heartbeat — isto é um selo de status, não um aviso.
        val canal = NotificationChannel(
            CANAL_ID,
            "Operação do pátio",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Mantém a sincronização e o status online ativos."
            setShowBadge(false)
        }
        nm.createNotificationChannel(canal)
    }

    private fun montarNotificacao(): Notification {
        // Tocar na notificação traz o app de volta em vez de abrir uma 2ª
        // instância (singleTop + CLEAR_TOP).
        val abrir = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val intent = PendingIntent.getActivity(
            this,
            0,
            abrir,
            PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, CANAL_ID)
            .setContentTitle("NuvemPark em operação")
            .setContentText("Sincronizando o pátio em segundo plano.")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .setContentIntent(intent)
            .build()
    }

    companion object {
        private const val CANAL_ID = "nuvempark_operacao"
        private const val ID_NOTIFICACAO = 42

        fun iniciar(context: Context) {
            val intent = Intent(context, OperacaoService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun parar(context: Context) {
            context.stopService(Intent(context, OperacaoService::class.java))
        }
    }
}
