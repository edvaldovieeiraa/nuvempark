import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/startup_notifier.dart';

/// Splash — dispara a restauração de sessão (StartupNotifier). O router
/// redireciona conforme o estado de auth resultante.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Ativa o startup (lê sessão persistida → define o estado de auth).
    ref.read(startupProvider);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primaryFill, Color(0xFF166534)],
          ),
        ),
        child: Stack(
          children: [
            // Marca centralizada
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(26),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 30,
                          offset: const Offset(0, 14),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.local_parking, color: AppColors.primaryFill, size: 56),
                  ),
                  const SizedBox(height: 22),
                  const Text(
                    'NuvemPark',
                    style: TextStyle(
                      fontSize: 32,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),

            // Carregando — ancorado embaixo
            Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 52),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 26,
                      height: 26,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: Colors.white,
                        backgroundColor: Colors.white.withValues(alpha: 0.35),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'CARREGANDO O PÁTIO',
                      style: TextStyle(
                        fontSize: 11,
                        height: 1,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 1.7,
                        color: Colors.white.withValues(alpha: 0.82),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
