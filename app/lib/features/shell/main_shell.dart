import 'dart:math' as math;
import 'dart:ui' show ImageFilter, lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../caixa/presentation/caixa_screen.dart';
import '../home/presentation/home_screen.dart';
import '../menu/presentation/menu_geral_screen.dart';
import '../../core/heartbeat/heartbeat_service.dart';
import '../../core/platform/lock_task.dart';
import '../../core/platform/operacao_background.dart';
import '../../core/theme/app_colors.dart';
import '../patio/domain/patio_model.dart';
import '../patio/presentation/patio_tab.dart';
import '../patio/presentation/providers/patio_provider.dart';
import '../printing/presentation/providers/printer_provider.dart';
import '../sync/data/sync_loop.dart';
import 'conexao_banner.dart';

/// Casco principal do app: bottom nav com Início / Pátio / Caixa / Menu Geral.
/// As abas vivem num IndexedStack (estado preservado ao trocar).
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell>
    with SingleTickerProviderStateMixin {
  int _aba = 0;

  /// Entrada da aba recém-aberta. Anima só a APARIÇÃO — o IndexedStack troca de
  /// filho na hora. Um AnimatedSwitcher aqui destruiria o estado das abas, que
  /// é justamente o que o IndexedStack existe para preservar.
  late final AnimationController _troca = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 260),
    value: 1,
  );

  @override
  void initState() {
    super.initState();
    // Warm-up da impressora: conecta ao MAC salvo já no login, em background.
    // Sem isto a 1ª impressão do dia via ref.read() via o provider ainda
    // carregando e PULAVA o print (sintoma: "só funciona depois de abrir a
    // tela de configuração").
    Future.microtask(
      () => ref.read(printerNotifierProvider.future).catchError(
            (_) => const PrinterState(),
          ),
    );

    // Isenção de bateria e quiosque, NESTA ORDEM e no mesmo microtask.
    //
    // A ordem não é estilo: o pedido de isenção abre uma tela DO SISTEMA, e o
    // LockTask bloqueia telas do sistema. Ligado o quiosque primeiro, o diálogo
    // nasce barrado e a isenção nunca acontece.
    //
    // Sem a isenção, o Doze SUSPENDE A REDE do app com a tela apagada — e o
    // foreground service não salva disso: ele segura o processo (medido: 4 min
    // em Doze IDLE, processo intacto), mas o POST do heartbeat morre na saída.
    // Como o heartbeat é fail-silent, o sintoma é mudo: o painel só recebe sinal
    // quando alguém mexe no app, porque aí a tela está acesa e não há Doze.
    //
    // `pedirIsencaoBateria` já é no-op se o app é Device Owner (isento por
    // padrão) ou se a isenção já foi dada — então não incomoda a cada abertura.
    Future.microtask(() async {
      await OperacaoBackground.pedirIsencaoBateria();
      final patio = await ref.read(patioNotifierProvider.future);
      await _aplicarQuiosque(patio);
    });

    // Sincronização contínua (push + pull a cada 30s) enquanto o app está
    // aberto. O operador não clica em nada: cadastros da dashboard chegam
    // sozinhos e a fila local sobe sozinha. Pausa em background.
    Future.microtask(() => ref.read(syncLoopProvider).iniciar());

    // Heartbeat (60s): diz ao painel do gestor que este app está vivo mesmo
    // sem movimentação. Mecanismo à parte do sync — ver HeartbeatService.
    Future.microtask(() => ref.read(heartbeatServiceProvider).iniciar());

    // Operação em segundo plano: sem isto, os dois timers acima param assim
    // que a tela apaga (o Android congela o processo). Duas camadas — ver
    // OperacaoBackground.
    Future.microtask(_manterVivoEmBackground);
  }

  @override
  void dispose() {
    ref.read(syncLoopProvider).parar();
    ref.read(heartbeatServiceProvider).parar();
    OperacaoBackground.parar();
    _troca.dispose();
    super.dispose();
  }

  /// Camada 1 (tablet na tomada): tela nunca dorme — só em Device Owner.
  /// Camada 2 (aparelho que dorme): foreground service segura o processo.
  ///
  /// As duas juntas de propósito: a 1ª não vale em aparelho não provisionado e
  /// a 2ª não vale se o Doze bloquear a rede. Cada uma cobre o furo da outra.
  Future<void> _manterVivoEmBackground() async {
    await OperacaoBackground.iniciar();
    await OperacaoBackground.manterTelaLigada(true);
  }

  void _irPara(int i) {
    if (i == _aba) return;
    setState(() => _aba = i);
    _troca.forward(from: 0);
  }

  /// Liga/desliga o quiosque conforme a config do pátio (default ligado).
  Future<void> _aplicarQuiosque(PatioModel? patio) async {
    if (patio?.modoQuiosque ?? true) {
      await LockTask.iniciar();
    } else {
      await LockTask.parar();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Reage a mudanças da config (o gestor troca o modo → app re-sincroniza).
    ref.listen(patioNotifierProvider, (_, next) {
      _aplicarQuiosque(next.value);
    });
    return Scaffold(
      // A nav é vidro e SOBREPÕE o conteúdo — daí Stack, e não
      // bottomNavigationBar (aquele reserva altura e empurraria as telas). Não
      // há mais faixa reservada: o conteúdo passa POR BAIXO da nav, que é
      // justamente o que ela borra. A folga que impede o último item de ficar
      // preso embaixo dela agora vive no padding das listas — ver
      // [alturaNavBrisa].
      body: Stack(
        children: [
          Positioned.fill(
            child: _entradaDaAba(
              IndexedStack(
                index: _aba,
                children: [
                  HomeScreen(
                    onVerPatio: () => _irPara(1),
                    onVerCaixa: () => _irPara(2),
                  ),
                  const PatioTab(),
                  const CaixaScreen(),
                  const MenuGeralScreen(),
                ],
              ),
            ),
          ),
          // Banner e nav flutuam JUNTOS: o alerta de offline/impressora precisa
          // ficar acima da nav, e não atrás do vidro dela.
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const ConexaoBanner(),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: _NavBrisa(
                    itens: _itensNav,
                    ativo: _aba,
                    onTap: _irPara,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// A aba nova sobe 8px e revela — o suficiente para o olho registrar que algo
  /// trocou, curto o bastante para não atrasar quem já sabe onde vai.
  Widget _entradaDaAba(Widget filho) {
    return AnimatedBuilder(
      animation: _troca,
      builder: (context, child) {
        final t = Curves.easeOutCubic.transform(_troca.value);
        return Opacity(
          opacity: 0.3 + 0.7 * t,
          child: Transform.translate(offset: Offset(0, 8 * (1 - t)), child: child),
        );
      },
      child: filho,
    );
  }

  static const _itensNav = <(IconData, String)>[
    (Icons.home, 'Início'),
    (Icons.directions_car, 'Pátio'),
    (Icons.account_balance_wallet, 'Caixa'),
    (Icons.menu, 'Menu'),
  ];
}

const _sombraVidro = _SombraVidro();
const _aroVidro = _AroVidro();

/// Sombra da nav, com o MIOLO VAZADO.
///
/// Um `BoxShadow` comum não serve: ele é um retângulo arredondado borrado, e
/// pinta também DEBAIXO da pílula — onde o BackdropFilter o leria como fundo e o
/// borraria, escurecendo o vidro por dentro. Aqui o interior é recortado, então
/// só sobra o halo por fora, que é a única parte que alguém deveria ver.
class _SombraVidro extends CustomPainter {
  const _SombraVidro();

  @override
  void paint(Canvas canvas, Size size) {
    final pilula = RRect.fromRectAndRadius(
      Offset.zero & size,
      Radius.circular(size.height / 2),
    );
    canvas.save();
    canvas.clipPath(
      Path.combine(
        PathOperation.difference,
        Path()
          ..addRect(
            Rect.fromLTRB(-40, -40, size.width + 40, size.height + 40),
          ),
        // deflate(0.5) evita um fio de sombra escapando na junta com o aro.
        Path()..addRRect(pilula.deflate(0.5)),
      ),
    );
    canvas.drawRRect(
      pilula.shift(const Offset(0, 7)),
      Paint()
        ..color = AppColors.surfaceInverse.withValues(alpha: 0.22)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SombraVidro oldDelegate) => false;
}

/// Aro especular, pintado POR CIMA do vidro.
///
/// Em degradê (quase branco no topo, quase nada embaixo) porque é luz batendo de
/// cima, não contorno: um fio de brilho constante em volta lê como borda de
/// botão. `Border.all` não serve — só aceita cor chapada — e um gradiente por
/// baixo sujaria o backdrop (ver [_NavBrisaState.build]).
class _AroVidro extends CustomPainter {
  const _AroVidro();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0.5, 0.5, size.width - 1, size.height - 1),
        Radius.circular(size.height / 2),
      ),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xF2FFFFFF), Color(0x14FFFFFF)],
        ).createShader(Offset.zero & size),
    );
  }

  @override
  bool shouldRepaint(_AroVidro oldDelegate) => false;
}

/// Barra inferior do Brisa: pílula escura flutuante com uma GOTA verde que
/// escorre entre os itens.
///
/// ## Por que a gota é um elemento só
///
/// O realce é UM widget atrás dos ícones, não um por item. Com um realce por
/// item não existe deslizamento possível: o verde sumiria de um slot e nasceria
/// no outro, por mais que se anime cada um deles.
///
/// A posição da gota é a **média ponderada dos centros** dos itens, com pesos
/// que somam 1. Ninguém dita a rota: ela cai fora de um item na mesma medida em
/// que entra no outro. É isso também que faz uma troca de aba no meio do
/// trajeto continuar o movimento em vez de teleportar — basta congelar os pesos
/// de onde ela ESTÁ e mirar nos novos.
///
/// ## Squash & stretch
///
/// No caminho ela encolhe até virar gota nua, estica na direção do movimento e
/// achata na vertical na mesma proporção (o olho lê isso como volume constante,
/// que é o que separa "líquido" de "retângulo se movendo"). Só ao assentar ela
/// floresce com o rótulo. Saltos maiores esticam mais, porque viajam mais rápido.
class _NavBrisa extends StatefulWidget {
  const _NavBrisa({
    required this.itens,
    required this.ativo,
    required this.onTap,
  });

  final List<(IconData, String)> itens;
  final int ativo;
  final ValueChanged<int> onTap;

  @override
  State<_NavBrisa> createState() => _NavBrisaState();
}

class _NavBrisaState extends State<_NavBrisa>
    with SingleTickerProviderStateMixin {
  static const _altura = 62.0;
  static const _hGota = 38.0;
  static const _wGota = 40.0; // a gota nua, no meio do trajeto
  static const _wInativo = 48.0; // slot de quem é só ícone
  static const _icone = 20.0;
  static const _gap = 7.0;
  static const _respiro = 15.0; // do conteúdo à borda da gota
  static const _estica = 26.0;
  static const _achata = 5.0;

  /// ## O vidro é CLARO porque o app é claro
  ///
  /// Vidro escuro aqui é uma contradição em termos, e foi por ela que este
  /// widget passou: sobre o papel do Brisa (#F1F7F2) o ícone branco só sobrevive
  /// se o tinte fechar, e tinte fechado não deixa nada atravessar — some
  /// exatamente o que faz vidro ser vidro. Não há calibragem que resolva; os
  /// dois requisitos se cancelam.
  ///
  /// Invertendo (véu claro + ícone escuro) o contraste deixa de ser o gargalo:
  /// `onSurfaceVariant` sobre o véu dá ~4:1, com folga de sobra, e essa folga é
  /// o que compra a transparência de verdade. É o que iOS/WhatsApp fazem quando
  /// o conteúdo é claro.
  ///
  /// A contrapartida honesta: sobre fundo claro o véu quase não pinta, então a
  /// nav NÃO se define pelo preenchimento — quem a recorta do fundo é o aro
  /// especular, a sombra e a descontinuidade do blur. Daí o aro ser forte.
  /// Agora estas opacidades são as REAIS. Antes o aro em degradê era pintado
  /// atrás do vidro (uma `BoxDecoration` com gradiente pinta o retângulo todo,
  /// não só a moldura), então havia branco a 95% por baixo e abrir o tinte não
  /// mudava nada — o vidro borrava o próprio aro. Ver a nota de [build].
  static const _vidroTopo = 0.42;
  static const _vidroBase = 0.24;
  static const _desfoque = 24.0;

  /// Ícone apagado: a tinta fraca do Brisa. Sobre o véu claro dá ~4:1 — e agora
  /// pode ser escuro, porque o vidro deixou de ser.
  static const _iconeInativo = AppColors.onSurfaceVariant;

  /// Realce de saturação (×1,4) do que passa por trás — é o que separa
  /// "borrado" de "líquido": as pílulas verdes e laranjas dos cards atravessam
  /// o vidro com a cor viva em vez de lavada.
  ///
  /// Os coeficientes saem dos pesos de luminância de sempre
  /// (0.2126/0.7152/0.0722): cada canal puxa para si e devolve aos outros o
  /// complemento, o que satura sem mexer no brilho.
  static const _matrizSaturacao = <double>[
    1.2756, -0.2503, -0.0253, 0, 0, //
    -0.0744, 1.0997, -0.0253, 0, 0, //
    -0.0744, -0.2503, 1.3247, 0, 0, //
    0, 0, 0, 1, 0, //
  ];

  /// `fontFamily` explícito de propósito: o TextPainter que mede o rótulo não
  /// herda o tema, e medir com outra fonte deixaria a gota mais curta que o
  /// texto que ela precisa abrigar.
  static const _estiloRotulo = TextStyle(
    fontFamily: 'PlusJakartaSans',
    fontSize: 12,
    height: 1,
    fontWeight: FontWeight.w800,
    color: Colors.white,
  );

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 440),
    value: 1, // nasce assentada no item ativo
  );

  late final List<double> _larguras;
  late List<double> _pesoDe;
  late int _para;

  @override
  void initState() {
    super.initState();
    _larguras = [for (final it in widget.itens) _medir(it.$2)];
    _para = widget.ativo;
    _pesoDe = [
      for (var i = 0; i < widget.itens.length; i++) i == _para ? 1.0 : 0.0,
    ];
  }

  @override
  void didUpdateWidget(covariant _NavBrisa antigo) {
    super.didUpdateWidget(antigo);
    if (widget.ativo != _para) {
      _pesoDe = _pesos(); // congela onde a gota está AGORA, não onde pararia
      _para = widget.ativo;
      _c.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  static double _medir(String rotulo) {
    final tp = TextPainter(
      text: TextSpan(text: rotulo, style: _estiloRotulo),
      textDirection: TextDirection.ltr,
    )..layout();
    return _respiro * 2 + _icone + _gap + tp.width;
  }

  /// Quanto cada item está ativo agora. Soma sempre 1 — é o que mantém a gota
  /// entre os dois extremos do trajeto, e nunca fora deles.
  List<double> _pesos() {
    final t = Curves.easeInOutCubic.transform(_c.value);
    return [
      for (var i = 0; i < widget.itens.length; i++)
        lerpDouble(_pesoDe[i], i == _para ? 1.0 : 0.0, t)!,
    ];
  }

  /// O rótulo só abre no fim do trajeto: a gota viaja nua e floresce ao chegar.
  static double _florescer(double peso) =>
      Curves.easeOut.transform(((peso - 0.65) / 0.35).clamp(0.0, 1.0));

  /// Índice fracionário de onde este trajeto começou (Σ i·peso).
  double _indiceDe() {
    var s = 0.0;
    for (var i = 0; i < _pesoDe.length; i++) {
      s += i * _pesoDe[i];
    }
    return s;
  }

  /// ## A regra que rege este método
  ///
  /// **Nada pode ser pintado atrás do [BackdropFilter] dentro dos limites
  /// dele.** Ele não filtra "o app": filtra tudo o que já foi pintado naquela
  /// área — inclusive o que os ANCESTRAIS deste widget pintaram. Um aro ou uma
  /// sombra por baixo viram o "fundo" que ele borra, e o vidro passa a refletir
  /// a si mesmo, opaco, sem que mexer no tinte adiante nada.
  ///
  /// Por isso a ordem é sombra → vidro → aro, com a sombra vazada no miolo e o
  /// aro POR CIMA. Custa dois CustomPaint, e é o preço de o vidro ser vidro.
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _altura,
      width: double.infinity,
      child: Stack(
        children: [
          Positioned.fill(
            child: IgnorePointer(child: CustomPaint(painter: _sombraVidro)),
          ),
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              // O recorte NÃO é enfeite: um BackdropFilter sem clip borra a
              // tela inteira, não só o que está atrás da pílula.
              child: BackdropFilter(
                filter: ImageFilter.compose(
                  outer: const ColorFilter.matrix(_matrizSaturacao),
                  inner: ImageFilter.blur(sigmaX: _desfoque, sigmaY: _desfoque),
                ),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.white.withValues(alpha: _vidroTopo),
                        Colors.white.withValues(alpha: _vidroBase),
                      ],
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: LayoutBuilder(
                      builder: (context, cons) => AnimatedBuilder(
                        animation: _c,
                        builder: (context, _) =>
                            _pintar(cons.maxWidth, cons.maxHeight),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(child: CustomPaint(painter: _aroVidro)),
          ),
        ],
      ),
    );
  }

  Widget _pintar(double largura, double altura) {
    final n = widget.itens.length;
    final pesos = _pesos();
    final flor = [for (final p in pesos) _florescer(p)];

    // Slots: inativo é só o ícone; o ativo abre espaço para o rótulo. A sobra
    // se reparte igualmente, senão os itens não preencheriam a pílula.
    final base = [
      for (var i = 0; i < n; i++)
        _wInativo + (_larguras[i] - _wInativo) * flor[i],
    ];
    final sobra = (largura - base.reduce((a, b) => a + b)) / n;
    final slots = [for (final b in base) b + sobra];
    // O último absorve o resto: os slots são larguras fixas dentro de um Row de
    // largura tight, e somar 304.0000000000001 estoura o Row. Distribuir a sobra
    // por divisão não garante fechar a conta em ponto flutuante; isto garante.
    slots[n - 1] = largura - slots.take(n - 1).fold(0.0, (a, b) => a + b);

    final centros = <double>[];
    var x = 0.0;
    for (final s in slots) {
      centros.add(x + s / 2);
      x += s;
    }

    var centro = 0.0;
    for (var i = 0; i < n; i++) {
      centro += centros[i] * pesos[i];
    }

    // Gota nua no meio do caminho, pílula cheia ao assentar.
    var w = _wGota;
    for (var i = 0; i < n; i++) {
      w += (_larguras[i] - _wGota) * flor[i];
    }

    // O quanto ela estica é o quanto ela achata. `sin` zera nas pontas: parada,
    // a gota é uma pílula comum.
    final salto = (_para - _indiceDe()).abs();
    final fator =
        0.55 + 0.45 * ((salto - 1) / math.max(n - 2, 1)).clamp(0.0, 1.0);
    final deforma = math.sin(math.pi * _c.value) * fator;
    w += _estica * deforma;
    final h = _hGota - _achata * deforma;

    return Stack(
      children: [
        Positioned(
          left: centro - w / 2,
          top: (altura - h) / 2,
          width: w,
          height: h,
          child: const DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.primaryFill,
              borderRadius: BorderRadius.all(Radius.circular(999)),
            ),
          ),
        ),
        Positioned.fill(
          child: Row(
            children: [
              for (var i = 0; i < n; i++)
                SizedBox(width: slots[i], child: _item(i, pesos[i], flor[i])),
            ],
          ),
        ),
      ],
    );
  }

  Widget _item(int i, double peso, double flor) {
    final (icone, rotulo) = widget.itens[i];
    return InkWell(
      onTap: () => widget.onTap(i),
      borderRadius: BorderRadius.circular(999),
      child: Center(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icone,
              size: lerpDouble(22, _icone, peso),
              color: Color.lerp(_iconeInativo, Colors.white, peso),
            ),
            // widthFactor, e não só opacidade: assim o rótulo EMPURRA o ícone ao
            // abrir. Invisível por opacidade, ele ainda ocuparia o espaço e o
            // ícone já nasceria descentralizado.
            ClipRect(
              child: Align(
                alignment: Alignment.centerLeft,
                widthFactor: flor,
                child: Opacity(
                  opacity: flor,
                  child: Padding(
                    padding: const EdgeInsets.only(left: _gap),
                    child: Text(
                      rotulo,
                      maxLines: 1,
                      softWrap: false,
                      style: _estiloRotulo,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
