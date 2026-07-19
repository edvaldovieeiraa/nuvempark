import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _codigoCtrl = TextEditingController();
  final _usuarioCtrl = TextEditingController();
  final _senhaCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  bool _carregando = false;

  @override
  void dispose() {
    _codigoCtrl.dispose();
    _usuarioCtrl.dispose();
    _senhaCtrl.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _carregando = true);
    try {
      await ref.read(authControllerProvider.notifier).login(
            codigoTenant: _codigoCtrl.text,
            usuario: _usuarioCtrl.text,
            senha: _senhaCtrl.text,
          );
      // Navegação é conduzida pelo router via estado de auth.
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiException ? e.message : 'Falha ao entrar. Tente novamente.';
      AppToast.error(context, msg);
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // ---- Cabeçalho verde (gradiente, cantos inferiores arredondados) ----
          Container(
            width: double.infinity,
            padding: EdgeInsets.only(top: topInset),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.primaryFill, Color(0xFF166534)],
              ),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(34)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.28),
                  blurRadius: 30,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: SizedBox(
              height: 208,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.18),
                          blurRadius: 22,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.local_parking, color: AppColors.primaryFill, size: 46),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'NuvemPark',
                    style: TextStyle(
                      fontSize: 27,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ---- Corpo do formulário ----
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 26, 24, 28),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Entrar no pátio',
                      style: TextStyle(
                        fontSize: 21,
                        height: 1.3,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'acesse com as credenciais do operador',
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.45,
                        fontWeight: FontWeight.w500,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Código do pátio (4 dígitos — decisão 2026-07-10:
                    // identifica o PÁTIO, o operador entra direto na unidade)
                    TextFormField(
                      controller: _codigoCtrl,
                      keyboardType: TextInputType.number,
                      maxLength: 4,
                      style: _campoStyle,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: _dec(
                        hint: 'Código do pátio',
                        icone: Icons.apartment,
                      ),
                      validator: (v) =>
                          (v == null || v.length != 4) ? 'Informe os 4 dígitos' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _usuarioCtrl,
                      textCapitalization: TextCapitalization.characters,
                      style: _campoStyle,
                      decoration: _dec(
                        hint: 'Usuário',
                        icone: Icons.person,
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Informe o usuário' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _senhaCtrl,
                      obscureText: _obscure,
                      style: _campoStyle,
                      decoration: _dec(
                        hint: 'Senha',
                        icone: Icons.lock,
                        suffix: IconButton(
                          icon: Icon(
                            _obscure ? Icons.visibility_off : Icons.visibility,
                            color: AppColors.outline,
                            size: 21,
                          ),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Informe a senha' : null,
                      onFieldSubmitted: (_) => _entrar(),
                    ),
                    const SizedBox(height: 22),

                    // Botão Entrar (pílula verde com brilho)
                    DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryFill.withValues(alpha: 0.35),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: SizedBox(
                        height: 56,
                        child: FilledButton(
                          onPressed: _carregando ? null : _entrar,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primaryFill,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: AppColors.secondaryFixed,
                            elevation: 0,
                            shape: const StadiumBorder(),
                            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                          child: _carregando
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2.5, color: Colors.white),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.login, size: 21, color: Colors.white),
                                    SizedBox(width: 9),
                                    Text('Entrar'),
                                  ],
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    Center(
                      child: GestureDetector(
                        onTap: () => AppToast.info(
                          context,
                          'Procure o gerente do pátio para redefinir a senha.',
                        ),
                        child: const Text(
                          'Esqueci minha senha',
                          style: TextStyle(
                            fontSize: 13,
                            height: 1,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 26),

                    // Rodapé de marca
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        _Ponto(),
                        SizedBox(width: 7),
                        Text(
                          'GESTÃO DE ESTACIONAMENTO',
                          style: TextStyle(
                            fontSize: 11,
                            height: 1,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.3,
                            color: AppColors.outline,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static const TextStyle _campoStyle = TextStyle(
    fontSize: 14.5,
    fontWeight: FontWeight.w600,
    color: AppColors.onSurface,
  );

  InputDecoration _dec({
    required String hint,
    required IconData icone,
    Widget? suffix,
  }) {
    OutlineInputBorder borda(Color cor, double largura) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: cor, width: largura),
        );
    return InputDecoration(
      hintText: hint,
      counterText: '',
      hintStyle: const TextStyle(
        color: AppColors.outline,
        fontWeight: FontWeight.w500,
        fontSize: 14.5,
      ),
      prefixIcon: Icon(icone, color: AppColors.primary, size: 22),
      suffixIcon: suffix,
      filled: true,
      fillColor: AppColors.background,
      contentPadding: const EdgeInsets.symmetric(vertical: 17, horizontal: 8),
      enabledBorder: borda(AppColors.primaryContainer, 1.5),
      border: borda(AppColors.primaryContainer, 1.5),
      focusedBorder: borda(AppColors.primary, 1.5),
      errorBorder: borda(AppColors.error, 1.5),
      focusedErrorBorder: borda(AppColors.error, 1.5),
    );
  }
}

class _Ponto extends StatelessWidget {
  const _Ponto();
  @override
  Widget build(BuildContext context) => Container(
        width: 7,
        height: 7,
        decoration: const BoxDecoration(
          color: AppColors.primaryFill,
          shape: BoxShape.circle,
        ),
      );
}
