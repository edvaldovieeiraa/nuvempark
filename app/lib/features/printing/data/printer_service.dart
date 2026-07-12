import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

class PrinterService {
  Future<List<BluetoothInfo>> pairedDevices() =>
      PrintBluetoothThermal.pairedBluetooths;

  Future<bool> connect(String mac) =>
      PrintBluetoothThermal.connect(macPrinterAddress: mac);

  Future<bool> get isConnected => PrintBluetoothThermal.connectionStatus;

  Future<bool> disconnect() => PrintBluetoothThermal.disconnect;

  Future<bool> printBytes(List<int> bytes) =>
      PrintBluetoothThermal.writeBytes(bytes);
}
