# ParkFlow — regras ProGuard para o build de release (minify/shrink).

# Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Google ML Kit — Text Recognition (OCR de placa).
# O ML Kit carrega modelos por reflexão; sem keep, o minify quebra o OCR.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-dontwarn com.google.mlkit.**

# print_bluetooth_thermal (impressão) — bridge nativo.
-keep class com.example.print_bluetooth_thermal.** { *; }

# mobile_scanner (QR).
-keep class com.google.mlkit.vision.** { *; }

# flutter_secure_storage.
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Evita avisos que travam o build por classes opcionais ausentes.
-dontwarn org.slf4j.**
