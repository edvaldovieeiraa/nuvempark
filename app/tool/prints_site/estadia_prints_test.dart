// Gera os prints da estadia de hóspede usados no site (seção Recursos da home).
//
// Fora de `test/` de propósito: não roda na suíte. Para gerar de novo, depois
// de mexer nas telas de estadia:
//
//   flutter test tool/prints_site/estadia_prints_test.dart
//
// Os PNGs saem em `build/prints_site/` em 720×1604 — o mesmo tamanho das
// capturas que já estão em `web/public/uploads` (ver web/PERFORMANCE.md).
// Copie para lá com o mesmo nome; o site referencia por nome.
//
// São as telas REAIS do app (mesmo tema, fontes e ícones), montadas com banco
// em memória e rede falsa. Os valores são os do exemplo da página de hotel
// (`web/src/lib/solucoes-hotel.ts`): R$ 30 por diária de 24 h.

import 'dart:io';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/di/providers.dart';
import 'package:nuvempark_app/core/theme/app_theme.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/caixa/domain/caixa_model.dart';
import 'package:nuvempark_app/features/caixa/presentation/providers/caixa_provider.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/patio/presentation/providers/patio_provider.dart';
import 'package:nuvempark_app/features/sync/data/sync_mutex.dart';
import 'package:nuvempark_app/features/tickets/data/tickets_abertos_sync.dart';
import 'package:nuvempark_app/features/tickets/presentation/entrada_screen.dart';
import 'package:nuvempark_app/features/tickets/presentation/providers/ticket_provider.dart';
import 'package:nuvempark_app/features/tickets/presentation/saida_screen.dart';

import '../../test/support/fakes.dart';

const _saida = 'build/prints_site';
const _tamanho = Size(720, 1604);
const _dpr = 2.0;

TarifaConfig _tarifa(String id, String nome, {int ordem = 0, bool hospede = false}) =>
    TarifaConfig(
      id: id,
      operacaoId: 'p1',
      nome: nome,
      tipoVeiculo: 'carro',
      ordem: ordem,
      visivelOperador: true,
      fracaoInicialMinutos: 60,
      fracaoInicialValor: 10,
      fracaoAdicionalMinutos: 60,
      fracaoAdicionalValor: 5,
      tetoDiaria: 60,
      toleranciaMinutos: 10,
      pernoiteValor: 0,
      pernoiteHoraInicio: 22,
      pernoiteHoraFim: 6,
      vigenciaInicio: DateTime(2020),
      modalidade: hospede ? TarifaConfig.modalidadeHospede : TarifaConfig.modalidadeAvulso,
      diariaValor: hospede ? 30 : null,
      diariaHoras: hospede ? 24 : null,
      tarifaAtrasoId: hospede ? 'padrao' : null,
    );

final _patio = PatioModel(
  id: 'p1',
  nome: 'Hotel',
  codigo: 'H1',
  qtdVagas: 40,
  tiposVeiculo: const ['carro', 'moto'],
  formasPagamento: const ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
  motivosIsencao: const [],
  motivosCancelamento: const [],
  ticketCabecalho: const [],
  ticketRodape: const [],
  tarifas: [
    _tarifa('padrao', 'Padrão'),
    _tarifa('hospede', 'Diária de hóspede', ordem: 1, hospede: true),
  ],
  sincronizadoEm: DateTime(2026),
);

class _PatioFixo extends PatioNotifier {
  @override
  Future<PatioModel?> build() async => _patio;

  @override
  Future<void> bootstrap({bool silencioso = false}) async {}
}

class _CaixaAberto extends CaixaSessaoNotifier {
  @override
  Future<CaixaModel?> build() async => CaixaModel(
        id: 'cx1',
        operacaoId: 'p1',
        operadorId: 'op1',
        operadorNome: 'Operador',
        fundoCaixa: 100,
        totalEntradas: 0,
        totalSangrias: 0,
        status: 'aberto',
        abertura: DateTime.now(),
        syncStatus: 'sincronizado',
      );
}

/// Conferência com a nuvem "agora": sem isto a saída vencida mostra o aviso
/// de que não deu para conferir a validade (o caso offline).
class _SyncConferido extends TicketsAbertosSync {
  _SyncConferido(AppDatabase db)
      : super(db: db, dio: _offline(), mutex: SyncMutex());

  @override
  Future<bool> puxar(String patioId) async {
    ultimaConferencia = DateTime.now();
    return false;
  }
}

Dio _offline() => fakeDio((_) => throw DioException.connectionError(
    requestOptions: RequestOptions(), reason: 'offline'));

Future<void> _carregarFontes() async {
  Future<void> carregar(String familia, List<String> arquivos) async {
    final loader = FontLoader(familia);
    for (final a in arquivos) {
      final bytes = File(a).readAsBytesSync();
      loader.addFont(Future.value(ByteData.view(bytes.buffer)));
    }
    await loader.load();
  }

  await carregar(AppTheme.fontFamily, [
    for (final p in ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'])
      'assets/fonts/PlusJakartaSans-$p.ttf',
  ]);
  final flutterRoot = Platform.environment['FLUTTER_ROOT'] ??
      File(Platform.resolvedExecutable).parent.parent.parent.parent.parent.parent.path;
  await carregar('MaterialIcons', ['$flutterRoot/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf']);
}

void main() {
  late AppDatabase db;
  late TokenStorage storage;
  final moldura = GlobalKey();

  setUpAll(_carregarFontes);

  setUp(() async {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    storage = TokenStorage(MemSecureStorage());
    await storage.savePatioId('p1');
  });
  tearDown(() => db.close());

  Future<void> montar(WidgetTester tester, Widget tela) async {
    tester.view.physicalSize = _tamanho;
    tester.view.devicePixelRatio = _dpr;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(RepaintBoundary(
      key: moldura,
      child: ProviderScope(
        overrides: [
          appDatabaseProvider.overrideWithValue(db),
          tokenStorageProvider.overrideWithValue(storage),
          dioProvider.overrideWithValue(_offline()),
          patioNotifierProvider.overrideWith(_PatioFixo.new),
          caixaSessaoNotifierProvider.overrideWith(_CaixaAberto.new),
          ticketsAbertosSyncProvider.overrideWithValue(_SyncConferido(db)),
        ],
        child: MaterialApp(
          theme: AppTheme.theme,
          debugShowCheckedModeBanner: false,
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [Locale('pt', 'BR')],
          locale: const Locale('pt', 'BR'),
          home: tela,
        ),
      ),
    ));
    await _assentar(tester);
  }

  Future<void> salvar(WidgetTester tester, String nome) async {
    await _assentar(tester);
    final boundary = moldura.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    await tester.runAsync(() async {
      final imagem = await boundary.toImage(pixelRatio: _dpr);
      final png = await imagem.toByteData(format: ui.ImageByteFormat.png);
      final arquivo = File('$_saida/$nome.png')..createSync(recursive: true);
      arquivo.writeAsBytesSync(png!.buffer.asUint8List());
    });
  }

  Future<void> semearEstadia(WidgetTester tester,
      {required DateTime entrada, required DateTime validaAte}) async {
    await tester.runAsync(() async {
      await db.estadiasDao.inserirEstadia(Estadia(
        id: 'e1',
        operacaoId: 'p1',
        placa: 'RTO4F21',
        tipoVeiculo: 'carro',
        tarifaId: 'hospede',
        diariaValor: 30,
        diariaHoras: 24,
        inicioEpoch: validaAte.subtract(const Duration(hours: 72)).millisecondsSinceEpoch,
        validaAteEpoch: validaAte.millisecondsSinceEpoch,
        diarias: 3,
        valorTotal: 90,
        syncStatus: 'sincronizado',
        criadoEm: 0,
        atualizadoEm: 0,
      ).toCompanion(true));
      await db.ticketsDao.inserir(TicketsCompanion.insert(
        id: 't1',
        operacaoId: 'p1',
        placa: 'RTO4F21',
        tipoVeiculo: 'carro',
        entradaEpoch: entrada.millisecondsSinceEpoch,
        operadorId: 'op1',
        criadoEm: 0,
        atualizadoEm: 0,
        estadiaId: const Value('e1'),
      ));
    });
  }

  testWidgets('entrada: contratação de 3 diárias', (tester) async {
    debugDisableShadows = false;
    await montar(tester, const EntradaScreen());

    await tester.enterText(find.byType(TextFormField).first, 'RTO4F21');
    FocusManager.instance.primaryFocus?.unfocus();
    await _assentar(tester);
    await tester.tap(find.text('Diária de hóspede'));
    await _assentar(tester);
    final mais = find.byIcon(Icons.add);
    await tester.ensureVisible(mais.first);
    await tester.tap(mais.first);
    await _assentar(tester);
    await tester.tap(mais.first);
    await _assentar(tester);
    await tester.ensureVisible(find.text('Dinheiro').first);
    await tester.tap(find.text('Dinheiro').first);
    await _assentar(tester);
    // Placa no topo: some o cartão de foto, cabem placa, tabela, contratação
    // e formas de pagamento.
    await tester.ensureVisible(find.byType(TextFormField).first);
    await tester.drag(find.byType(SingleChildScrollView).first, const Offset(0, 44));
    await _assentar(tester);
    await salvar(tester, 'estadia-hospede-entrada');
    debugDisableShadows = true;
  });

  testWidgets('saída: estadia válida, sem cobrança', (tester) async {
    debugDisableShadows = false;
    final agora = DateTime.now();
    await semearEstadia(
      tester,
      entrada: agora.subtract(const Duration(minutes: 38)),
      validaAte: agora.add(const Duration(hours: 41)),
    );
    await montar(tester, const SaidaScreen(ticketId: 't1'));
    await salvar(tester, 'estadia-hospede-saida');
    debugDisableShadows = true;
  });
}

/// Deixa os Futures do Drift e dos providers correrem de verdade (fora do
/// relógio falso) e redesenha até a tela parar de mudar.
Future<void> _assentar(WidgetTester tester) async {
  for (var i = 0; i < 3; i++) {
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 60)));
    await tester.pump(const Duration(milliseconds: 400));
  }
}
