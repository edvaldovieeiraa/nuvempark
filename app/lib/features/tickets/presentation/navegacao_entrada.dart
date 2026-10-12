import '../../../core/router/app_router.dart';
import '../../patio/domain/patio_model.dart';

/// Para onde o botão "Entrada" leva: o modo rápido só quando o pátio liberou,
/// tem tipo e tabela padrão e o aparelho está com o modo ligado. Qualquer
/// outra coisa — inclusive o pátio ainda carregando — é a entrada normal.
String rotaDeEntrada(PatioModel? patio, {required bool ligado}) =>
    ligado && patio != null && patio.motivoModoRapidoIndisponivel == null
        ? Routes.entradaRapida
        : Routes.entrada;
