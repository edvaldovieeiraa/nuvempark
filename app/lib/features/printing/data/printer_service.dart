import 'dart:io';

import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

class PrinterService {
  Future<List<BluetoothInfo>> pairedDevices() =>
      PrintBluetoothThermal.pairedBluetooths;

  Future<bool> connect(String mac) =>
      PrintBluetoothThermal.connect(macPrinterAddress: mac);

  Future<bool> get isConnected => PrintBluetoothThermal.connectionStatus;

  /// Desconecta — mas só quando isso é seguro de verdade.
  ///
  /// No iOS o plugin faz `cancelPeripheralConnection(connectedPeripheral)`, e
  /// `connectedPeripheral` é declarado `CBPeripheral!`. Esse campo só recebe
  /// valor quando um `connect` dá certo; enquanto isso é nil, e o
  /// desempacotamento implícito **mata o processo**. Não é exceção Dart, é
  /// crash nativo: nenhum `try/catch` daqui pega.
  ///
  /// O caminho que estourava era o botão "Reconectar" — que, por definição, só
  /// aparece com a impressora caída, ou seja, exatamente quando não existe
  /// periférico. Reconectar fechava o app.
  ///
  /// E o mesmo método tem um segundo defeito: ele não responde ao canal. Quem
  /// chama `result(true)` é o delegate `didDisconnectPeripheral`, que só
  /// dispara se havia conexão ativa. Sem ela o Future nunca completaria e a
  /// tela ficaria girando para sempre.
  ///
  /// Os dois caem com a mesma condição: no iOS, só desconecta quando o próprio
  /// plugin confirma que há conexão — que é precisamente o estado em que o
  /// unwrap é seguro E o delegate dispara. `connectionstatus` lá é
  /// `connectedPeripheral?.state == .connected`, com encadeamento opcional:
  /// nunca é `true` com o campo nil, então a checagem é estanque.
  ///
  /// No Android nada disso se aplica — o disconnect é síncrono, null-safe e
  /// sempre responde — e lá ele PRECISA rodar mesmo "desconectado", porque é o
  /// que fecha o `outputStream` morto antes de uma reconexão.
  Future<bool> disconnect() async {
    if (Platform.isIOS && !(await isConnected)) return true;
    // Rede de segurança para a janela entre a checagem acima e a chamada: se a
    // conexão cair no meio, o delegate não dispara e o Future ficaria pendente.
    return PrintBluetoothThermal.disconnect
        .timeout(const Duration(seconds: 5), onTimeout: () => false);
  }

  Future<bool> printBytes(List<int> bytes) =>
      PrintBluetoothThermal.writeBytes(bytes);
}
