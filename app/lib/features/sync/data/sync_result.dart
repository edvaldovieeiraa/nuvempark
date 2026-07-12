class SyncResult {
  const SyncResult({required this.synced, required this.failed});

  final int synced;
  final int failed;

  bool get hasErrors => failed > 0;
  bool get isEmpty => synced == 0 && failed == 0;
}
