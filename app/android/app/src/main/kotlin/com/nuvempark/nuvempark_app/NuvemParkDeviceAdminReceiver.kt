package com.nuvempark.nuvempark_app

import android.app.admin.DeviceAdminReceiver

/**
 * Receiver de administração de dispositivo — necessário para registrar o app
 * como Device Owner (trava total de maquininha). Ver PROVISIONAR-DEVICE-OWNER.md.
 * Não precisa de lógica: a existência da classe + registro no manifest bastam
 * para o `dpm set-device-owner`.
 */
class NuvemParkDeviceAdminReceiver : DeviceAdminReceiver()
