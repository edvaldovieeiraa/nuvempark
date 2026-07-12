// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $OperacaoCacheTable extends OperacaoCache
    with TableInfo<$OperacaoCacheTable, OperacaoCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OperacaoCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _operacaoIdMeta = const VerificationMeta(
    'operacaoId',
  );
  @override
  late final GeneratedColumn<String> operacaoId = GeneratedColumn<String>(
    'operacao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nomeMeta = const VerificationMeta('nome');
  @override
  late final GeneratedColumn<String> nome = GeneratedColumn<String>(
    'nome',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _codigoMeta = const VerificationMeta('codigo');
  @override
  late final GeneratedColumn<String> codigo = GeneratedColumn<String>(
    'codigo',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _qtdVagasMeta = const VerificationMeta(
    'qtdVagas',
  );
  @override
  late final GeneratedColumn<int> qtdVagas = GeneratedColumn<int>(
    'qtd_vagas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _configJsonMeta = const VerificationMeta(
    'configJson',
  );
  @override
  late final GeneratedColumn<String> configJson = GeneratedColumn<String>(
    'config_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sincronizadoEmMeta = const VerificationMeta(
    'sincronizadoEm',
  );
  @override
  late final GeneratedColumn<int> sincronizadoEm = GeneratedColumn<int>(
    'sincronizado_em',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    operacaoId,
    nome,
    codigo,
    qtdVagas,
    configJson,
    sincronizadoEm,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'operacao_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<OperacaoCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('operacao_id')) {
      context.handle(
        _operacaoIdMeta,
        operacaoId.isAcceptableOrUnknown(data['operacao_id']!, _operacaoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoIdMeta);
    }
    if (data.containsKey('nome')) {
      context.handle(
        _nomeMeta,
        nome.isAcceptableOrUnknown(data['nome']!, _nomeMeta),
      );
    } else if (isInserting) {
      context.missing(_nomeMeta);
    }
    if (data.containsKey('codigo')) {
      context.handle(
        _codigoMeta,
        codigo.isAcceptableOrUnknown(data['codigo']!, _codigoMeta),
      );
    } else if (isInserting) {
      context.missing(_codigoMeta);
    }
    if (data.containsKey('qtd_vagas')) {
      context.handle(
        _qtdVagasMeta,
        qtdVagas.isAcceptableOrUnknown(data['qtd_vagas']!, _qtdVagasMeta),
      );
    } else if (isInserting) {
      context.missing(_qtdVagasMeta);
    }
    if (data.containsKey('config_json')) {
      context.handle(
        _configJsonMeta,
        configJson.isAcceptableOrUnknown(data['config_json']!, _configJsonMeta),
      );
    } else if (isInserting) {
      context.missing(_configJsonMeta);
    }
    if (data.containsKey('sincronizado_em')) {
      context.handle(
        _sincronizadoEmMeta,
        sincronizadoEm.isAcceptableOrUnknown(
          data['sincronizado_em']!,
          _sincronizadoEmMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_sincronizadoEmMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {operacaoId};
  @override
  OperacaoCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OperacaoCacheData(
      operacaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao_id'],
      )!,
      nome: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nome'],
      )!,
      codigo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo'],
      )!,
      qtdVagas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}qtd_vagas'],
      )!,
      configJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}config_json'],
      )!,
      sincronizadoEm: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sincronizado_em'],
      )!,
    );
  }

  @override
  $OperacaoCacheTable createAlias(String alias) {
    return $OperacaoCacheTable(attachedDatabase, alias);
  }
}

class OperacaoCacheData extends DataClass
    implements Insertable<OperacaoCacheData> {
  final String operacaoId;
  final String nome;
  final String codigo;
  final int qtdVagas;
  final String configJson;
  final int sincronizadoEm;
  const OperacaoCacheData({
    required this.operacaoId,
    required this.nome,
    required this.codigo,
    required this.qtdVagas,
    required this.configJson,
    required this.sincronizadoEm,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['operacao_id'] = Variable<String>(operacaoId);
    map['nome'] = Variable<String>(nome);
    map['codigo'] = Variable<String>(codigo);
    map['qtd_vagas'] = Variable<int>(qtdVagas);
    map['config_json'] = Variable<String>(configJson);
    map['sincronizado_em'] = Variable<int>(sincronizadoEm);
    return map;
  }

  OperacaoCacheCompanion toCompanion(bool nullToAbsent) {
    return OperacaoCacheCompanion(
      operacaoId: Value(operacaoId),
      nome: Value(nome),
      codigo: Value(codigo),
      qtdVagas: Value(qtdVagas),
      configJson: Value(configJson),
      sincronizadoEm: Value(sincronizadoEm),
    );
  }

  factory OperacaoCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OperacaoCacheData(
      operacaoId: serializer.fromJson<String>(json['operacaoId']),
      nome: serializer.fromJson<String>(json['nome']),
      codigo: serializer.fromJson<String>(json['codigo']),
      qtdVagas: serializer.fromJson<int>(json['qtdVagas']),
      configJson: serializer.fromJson<String>(json['configJson']),
      sincronizadoEm: serializer.fromJson<int>(json['sincronizadoEm']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'operacaoId': serializer.toJson<String>(operacaoId),
      'nome': serializer.toJson<String>(nome),
      'codigo': serializer.toJson<String>(codigo),
      'qtdVagas': serializer.toJson<int>(qtdVagas),
      'configJson': serializer.toJson<String>(configJson),
      'sincronizadoEm': serializer.toJson<int>(sincronizadoEm),
    };
  }

  OperacaoCacheData copyWith({
    String? operacaoId,
    String? nome,
    String? codigo,
    int? qtdVagas,
    String? configJson,
    int? sincronizadoEm,
  }) => OperacaoCacheData(
    operacaoId: operacaoId ?? this.operacaoId,
    nome: nome ?? this.nome,
    codigo: codigo ?? this.codigo,
    qtdVagas: qtdVagas ?? this.qtdVagas,
    configJson: configJson ?? this.configJson,
    sincronizadoEm: sincronizadoEm ?? this.sincronizadoEm,
  );
  OperacaoCacheData copyWithCompanion(OperacaoCacheCompanion data) {
    return OperacaoCacheData(
      operacaoId: data.operacaoId.present
          ? data.operacaoId.value
          : this.operacaoId,
      nome: data.nome.present ? data.nome.value : this.nome,
      codigo: data.codigo.present ? data.codigo.value : this.codigo,
      qtdVagas: data.qtdVagas.present ? data.qtdVagas.value : this.qtdVagas,
      configJson: data.configJson.present
          ? data.configJson.value
          : this.configJson,
      sincronizadoEm: data.sincronizadoEm.present
          ? data.sincronizadoEm.value
          : this.sincronizadoEm,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OperacaoCacheData(')
          ..write('operacaoId: $operacaoId, ')
          ..write('nome: $nome, ')
          ..write('codigo: $codigo, ')
          ..write('qtdVagas: $qtdVagas, ')
          ..write('configJson: $configJson, ')
          ..write('sincronizadoEm: $sincronizadoEm')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    operacaoId,
    nome,
    codigo,
    qtdVagas,
    configJson,
    sincronizadoEm,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OperacaoCacheData &&
          other.operacaoId == this.operacaoId &&
          other.nome == this.nome &&
          other.codigo == this.codigo &&
          other.qtdVagas == this.qtdVagas &&
          other.configJson == this.configJson &&
          other.sincronizadoEm == this.sincronizadoEm);
}

class OperacaoCacheCompanion extends UpdateCompanion<OperacaoCacheData> {
  final Value<String> operacaoId;
  final Value<String> nome;
  final Value<String> codigo;
  final Value<int> qtdVagas;
  final Value<String> configJson;
  final Value<int> sincronizadoEm;
  final Value<int> rowid;
  const OperacaoCacheCompanion({
    this.operacaoId = const Value.absent(),
    this.nome = const Value.absent(),
    this.codigo = const Value.absent(),
    this.qtdVagas = const Value.absent(),
    this.configJson = const Value.absent(),
    this.sincronizadoEm = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OperacaoCacheCompanion.insert({
    required String operacaoId,
    required String nome,
    required String codigo,
    required int qtdVagas,
    required String configJson,
    required int sincronizadoEm,
    this.rowid = const Value.absent(),
  }) : operacaoId = Value(operacaoId),
       nome = Value(nome),
       codigo = Value(codigo),
       qtdVagas = Value(qtdVagas),
       configJson = Value(configJson),
       sincronizadoEm = Value(sincronizadoEm);
  static Insertable<OperacaoCacheData> custom({
    Expression<String>? operacaoId,
    Expression<String>? nome,
    Expression<String>? codigo,
    Expression<int>? qtdVagas,
    Expression<String>? configJson,
    Expression<int>? sincronizadoEm,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (operacaoId != null) 'operacao_id': operacaoId,
      if (nome != null) 'nome': nome,
      if (codigo != null) 'codigo': codigo,
      if (qtdVagas != null) 'qtd_vagas': qtdVagas,
      if (configJson != null) 'config_json': configJson,
      if (sincronizadoEm != null) 'sincronizado_em': sincronizadoEm,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OperacaoCacheCompanion copyWith({
    Value<String>? operacaoId,
    Value<String>? nome,
    Value<String>? codigo,
    Value<int>? qtdVagas,
    Value<String>? configJson,
    Value<int>? sincronizadoEm,
    Value<int>? rowid,
  }) {
    return OperacaoCacheCompanion(
      operacaoId: operacaoId ?? this.operacaoId,
      nome: nome ?? this.nome,
      codigo: codigo ?? this.codigo,
      qtdVagas: qtdVagas ?? this.qtdVagas,
      configJson: configJson ?? this.configJson,
      sincronizadoEm: sincronizadoEm ?? this.sincronizadoEm,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (operacaoId.present) {
      map['operacao_id'] = Variable<String>(operacaoId.value);
    }
    if (nome.present) {
      map['nome'] = Variable<String>(nome.value);
    }
    if (codigo.present) {
      map['codigo'] = Variable<String>(codigo.value);
    }
    if (qtdVagas.present) {
      map['qtd_vagas'] = Variable<int>(qtdVagas.value);
    }
    if (configJson.present) {
      map['config_json'] = Variable<String>(configJson.value);
    }
    if (sincronizadoEm.present) {
      map['sincronizado_em'] = Variable<int>(sincronizadoEm.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OperacaoCacheCompanion(')
          ..write('operacaoId: $operacaoId, ')
          ..write('nome: $nome, ')
          ..write('codigo: $codigo, ')
          ..write('qtdVagas: $qtdVagas, ')
          ..write('configJson: $configJson, ')
          ..write('sincronizadoEm: $sincronizadoEm, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $TarifasTable extends Tarifas with TableInfo<$TarifasTable, Tarifa> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TarifasTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operacaoIdMeta = const VerificationMeta(
    'operacaoId',
  );
  @override
  late final GeneratedColumn<String> operacaoId = GeneratedColumn<String>(
    'operacao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nomeMeta = const VerificationMeta('nome');
  @override
  late final GeneratedColumn<String> nome = GeneratedColumn<String>(
    'nome',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('Padrão'),
  );
  static const VerificationMeta _tipoVeiculoMeta = const VerificationMeta(
    'tipoVeiculo',
  );
  @override
  late final GeneratedColumn<String> tipoVeiculo = GeneratedColumn<String>(
    'tipo_veiculo',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ordemMeta = const VerificationMeta('ordem');
  @override
  late final GeneratedColumn<int> ordem = GeneratedColumn<int>(
    'ordem',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _visivelOperadorMeta = const VerificationMeta(
    'visivelOperador',
  );
  @override
  late final GeneratedColumn<bool> visivelOperador = GeneratedColumn<bool>(
    'visivel_operador',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("visivel_operador" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _fracaoInicialMinutosMeta =
      const VerificationMeta('fracaoInicialMinutos');
  @override
  late final GeneratedColumn<int> fracaoInicialMinutos = GeneratedColumn<int>(
    'fracao_inicial_minutos',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fracaoInicialValorMeta =
      const VerificationMeta('fracaoInicialValor');
  @override
  late final GeneratedColumn<double> fracaoInicialValor =
      GeneratedColumn<double>(
        'fracao_inicial_valor',
        aliasedName,
        false,
        type: DriftSqlType.double,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _fracaoAdicionalMinutosMeta =
      const VerificationMeta('fracaoAdicionalMinutos');
  @override
  late final GeneratedColumn<int> fracaoAdicionalMinutos = GeneratedColumn<int>(
    'fracao_adicional_minutos',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fracaoAdicionalValorMeta =
      const VerificationMeta('fracaoAdicionalValor');
  @override
  late final GeneratedColumn<double> fracaoAdicionalValor =
      GeneratedColumn<double>(
        'fracao_adicional_valor',
        aliasedName,
        false,
        type: DriftSqlType.double,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _tetoDiariaMeta = const VerificationMeta(
    'tetoDiaria',
  );
  @override
  late final GeneratedColumn<double> tetoDiaria = GeneratedColumn<double>(
    'teto_diaria',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _toleranciaMinutosMeta = const VerificationMeta(
    'toleranciaMinutos',
  );
  @override
  late final GeneratedColumn<int> toleranciaMinutos = GeneratedColumn<int>(
    'tolerancia_minutos',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _pernoiteValorMeta = const VerificationMeta(
    'pernoiteValor',
  );
  @override
  late final GeneratedColumn<double> pernoiteValor = GeneratedColumn<double>(
    'pernoite_valor',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _pernoiteHoraInicioMeta =
      const VerificationMeta('pernoiteHoraInicio');
  @override
  late final GeneratedColumn<int> pernoiteHoraInicio = GeneratedColumn<int>(
    'pernoite_hora_inicio',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _pernoiteHoraFimMeta = const VerificationMeta(
    'pernoiteHoraFim',
  );
  @override
  late final GeneratedColumn<int> pernoiteHoraFim = GeneratedColumn<int>(
    'pernoite_hora_fim',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _vigenciaInicioEpochMeta =
      const VerificationMeta('vigenciaInicioEpoch');
  @override
  late final GeneratedColumn<int> vigenciaInicioEpoch = GeneratedColumn<int>(
    'vigencia_inicio_epoch',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _vigenciaFimEpochMeta = const VerificationMeta(
    'vigenciaFimEpoch',
  );
  @override
  late final GeneratedColumn<int> vigenciaFimEpoch = GeneratedColumn<int>(
    'vigencia_fim_epoch',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    operacaoId,
    nome,
    tipoVeiculo,
    ordem,
    visivelOperador,
    fracaoInicialMinutos,
    fracaoInicialValor,
    fracaoAdicionalMinutos,
    fracaoAdicionalValor,
    tetoDiaria,
    toleranciaMinutos,
    pernoiteValor,
    pernoiteHoraInicio,
    pernoiteHoraFim,
    vigenciaInicioEpoch,
    vigenciaFimEpoch,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'tarifas';
  @override
  VerificationContext validateIntegrity(
    Insertable<Tarifa> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('operacao_id')) {
      context.handle(
        _operacaoIdMeta,
        operacaoId.isAcceptableOrUnknown(data['operacao_id']!, _operacaoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoIdMeta);
    }
    if (data.containsKey('nome')) {
      context.handle(
        _nomeMeta,
        nome.isAcceptableOrUnknown(data['nome']!, _nomeMeta),
      );
    }
    if (data.containsKey('tipo_veiculo')) {
      context.handle(
        _tipoVeiculoMeta,
        tipoVeiculo.isAcceptableOrUnknown(
          data['tipo_veiculo']!,
          _tipoVeiculoMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_tipoVeiculoMeta);
    }
    if (data.containsKey('ordem')) {
      context.handle(
        _ordemMeta,
        ordem.isAcceptableOrUnknown(data['ordem']!, _ordemMeta),
      );
    }
    if (data.containsKey('visivel_operador')) {
      context.handle(
        _visivelOperadorMeta,
        visivelOperador.isAcceptableOrUnknown(
          data['visivel_operador']!,
          _visivelOperadorMeta,
        ),
      );
    }
    if (data.containsKey('fracao_inicial_minutos')) {
      context.handle(
        _fracaoInicialMinutosMeta,
        fracaoInicialMinutos.isAcceptableOrUnknown(
          data['fracao_inicial_minutos']!,
          _fracaoInicialMinutosMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_fracaoInicialMinutosMeta);
    }
    if (data.containsKey('fracao_inicial_valor')) {
      context.handle(
        _fracaoInicialValorMeta,
        fracaoInicialValor.isAcceptableOrUnknown(
          data['fracao_inicial_valor']!,
          _fracaoInicialValorMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_fracaoInicialValorMeta);
    }
    if (data.containsKey('fracao_adicional_minutos')) {
      context.handle(
        _fracaoAdicionalMinutosMeta,
        fracaoAdicionalMinutos.isAcceptableOrUnknown(
          data['fracao_adicional_minutos']!,
          _fracaoAdicionalMinutosMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_fracaoAdicionalMinutosMeta);
    }
    if (data.containsKey('fracao_adicional_valor')) {
      context.handle(
        _fracaoAdicionalValorMeta,
        fracaoAdicionalValor.isAcceptableOrUnknown(
          data['fracao_adicional_valor']!,
          _fracaoAdicionalValorMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_fracaoAdicionalValorMeta);
    }
    if (data.containsKey('teto_diaria')) {
      context.handle(
        _tetoDiariaMeta,
        tetoDiaria.isAcceptableOrUnknown(data['teto_diaria']!, _tetoDiariaMeta),
      );
    } else if (isInserting) {
      context.missing(_tetoDiariaMeta);
    }
    if (data.containsKey('tolerancia_minutos')) {
      context.handle(
        _toleranciaMinutosMeta,
        toleranciaMinutos.isAcceptableOrUnknown(
          data['tolerancia_minutos']!,
          _toleranciaMinutosMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_toleranciaMinutosMeta);
    }
    if (data.containsKey('pernoite_valor')) {
      context.handle(
        _pernoiteValorMeta,
        pernoiteValor.isAcceptableOrUnknown(
          data['pernoite_valor']!,
          _pernoiteValorMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_pernoiteValorMeta);
    }
    if (data.containsKey('pernoite_hora_inicio')) {
      context.handle(
        _pernoiteHoraInicioMeta,
        pernoiteHoraInicio.isAcceptableOrUnknown(
          data['pernoite_hora_inicio']!,
          _pernoiteHoraInicioMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_pernoiteHoraInicioMeta);
    }
    if (data.containsKey('pernoite_hora_fim')) {
      context.handle(
        _pernoiteHoraFimMeta,
        pernoiteHoraFim.isAcceptableOrUnknown(
          data['pernoite_hora_fim']!,
          _pernoiteHoraFimMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_pernoiteHoraFimMeta);
    }
    if (data.containsKey('vigencia_inicio_epoch')) {
      context.handle(
        _vigenciaInicioEpochMeta,
        vigenciaInicioEpoch.isAcceptableOrUnknown(
          data['vigencia_inicio_epoch']!,
          _vigenciaInicioEpochMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_vigenciaInicioEpochMeta);
    }
    if (data.containsKey('vigencia_fim_epoch')) {
      context.handle(
        _vigenciaFimEpochMeta,
        vigenciaFimEpoch.isAcceptableOrUnknown(
          data['vigencia_fim_epoch']!,
          _vigenciaFimEpochMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Tarifa map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Tarifa(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      operacaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao_id'],
      )!,
      nome: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nome'],
      )!,
      tipoVeiculo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_veiculo'],
      )!,
      ordem: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}ordem'],
      )!,
      visivelOperador: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}visivel_operador'],
      )!,
      fracaoInicialMinutos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}fracao_inicial_minutos'],
      )!,
      fracaoInicialValor: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}fracao_inicial_valor'],
      )!,
      fracaoAdicionalMinutos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}fracao_adicional_minutos'],
      )!,
      fracaoAdicionalValor: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}fracao_adicional_valor'],
      )!,
      tetoDiaria: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}teto_diaria'],
      )!,
      toleranciaMinutos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}tolerancia_minutos'],
      )!,
      pernoiteValor: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}pernoite_valor'],
      )!,
      pernoiteHoraInicio: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}pernoite_hora_inicio'],
      )!,
      pernoiteHoraFim: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}pernoite_hora_fim'],
      )!,
      vigenciaInicioEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}vigencia_inicio_epoch'],
      )!,
      vigenciaFimEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}vigencia_fim_epoch'],
      ),
    );
  }

  @override
  $TarifasTable createAlias(String alias) {
    return $TarifasTable(attachedDatabase, alias);
  }
}

class Tarifa extends DataClass implements Insertable<Tarifa> {
  final String id;
  final String operacaoId;
  final String nome;
  final String tipoVeiculo;
  final int ordem;
  final bool visivelOperador;
  final int fracaoInicialMinutos;
  final double fracaoInicialValor;
  final int fracaoAdicionalMinutos;
  final double fracaoAdicionalValor;
  final double tetoDiaria;
  final int toleranciaMinutos;
  final double pernoiteValor;
  final int pernoiteHoraInicio;
  final int pernoiteHoraFim;
  final int vigenciaInicioEpoch;
  final int? vigenciaFimEpoch;
  const Tarifa({
    required this.id,
    required this.operacaoId,
    required this.nome,
    required this.tipoVeiculo,
    required this.ordem,
    required this.visivelOperador,
    required this.fracaoInicialMinutos,
    required this.fracaoInicialValor,
    required this.fracaoAdicionalMinutos,
    required this.fracaoAdicionalValor,
    required this.tetoDiaria,
    required this.toleranciaMinutos,
    required this.pernoiteValor,
    required this.pernoiteHoraInicio,
    required this.pernoiteHoraFim,
    required this.vigenciaInicioEpoch,
    this.vigenciaFimEpoch,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operacao_id'] = Variable<String>(operacaoId);
    map['nome'] = Variable<String>(nome);
    map['tipo_veiculo'] = Variable<String>(tipoVeiculo);
    map['ordem'] = Variable<int>(ordem);
    map['visivel_operador'] = Variable<bool>(visivelOperador);
    map['fracao_inicial_minutos'] = Variable<int>(fracaoInicialMinutos);
    map['fracao_inicial_valor'] = Variable<double>(fracaoInicialValor);
    map['fracao_adicional_minutos'] = Variable<int>(fracaoAdicionalMinutos);
    map['fracao_adicional_valor'] = Variable<double>(fracaoAdicionalValor);
    map['teto_diaria'] = Variable<double>(tetoDiaria);
    map['tolerancia_minutos'] = Variable<int>(toleranciaMinutos);
    map['pernoite_valor'] = Variable<double>(pernoiteValor);
    map['pernoite_hora_inicio'] = Variable<int>(pernoiteHoraInicio);
    map['pernoite_hora_fim'] = Variable<int>(pernoiteHoraFim);
    map['vigencia_inicio_epoch'] = Variable<int>(vigenciaInicioEpoch);
    if (!nullToAbsent || vigenciaFimEpoch != null) {
      map['vigencia_fim_epoch'] = Variable<int>(vigenciaFimEpoch);
    }
    return map;
  }

  TarifasCompanion toCompanion(bool nullToAbsent) {
    return TarifasCompanion(
      id: Value(id),
      operacaoId: Value(operacaoId),
      nome: Value(nome),
      tipoVeiculo: Value(tipoVeiculo),
      ordem: Value(ordem),
      visivelOperador: Value(visivelOperador),
      fracaoInicialMinutos: Value(fracaoInicialMinutos),
      fracaoInicialValor: Value(fracaoInicialValor),
      fracaoAdicionalMinutos: Value(fracaoAdicionalMinutos),
      fracaoAdicionalValor: Value(fracaoAdicionalValor),
      tetoDiaria: Value(tetoDiaria),
      toleranciaMinutos: Value(toleranciaMinutos),
      pernoiteValor: Value(pernoiteValor),
      pernoiteHoraInicio: Value(pernoiteHoraInicio),
      pernoiteHoraFim: Value(pernoiteHoraFim),
      vigenciaInicioEpoch: Value(vigenciaInicioEpoch),
      vigenciaFimEpoch: vigenciaFimEpoch == null && nullToAbsent
          ? const Value.absent()
          : Value(vigenciaFimEpoch),
    );
  }

  factory Tarifa.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Tarifa(
      id: serializer.fromJson<String>(json['id']),
      operacaoId: serializer.fromJson<String>(json['operacaoId']),
      nome: serializer.fromJson<String>(json['nome']),
      tipoVeiculo: serializer.fromJson<String>(json['tipoVeiculo']),
      ordem: serializer.fromJson<int>(json['ordem']),
      visivelOperador: serializer.fromJson<bool>(json['visivelOperador']),
      fracaoInicialMinutos: serializer.fromJson<int>(
        json['fracaoInicialMinutos'],
      ),
      fracaoInicialValor: serializer.fromJson<double>(
        json['fracaoInicialValor'],
      ),
      fracaoAdicionalMinutos: serializer.fromJson<int>(
        json['fracaoAdicionalMinutos'],
      ),
      fracaoAdicionalValor: serializer.fromJson<double>(
        json['fracaoAdicionalValor'],
      ),
      tetoDiaria: serializer.fromJson<double>(json['tetoDiaria']),
      toleranciaMinutos: serializer.fromJson<int>(json['toleranciaMinutos']),
      pernoiteValor: serializer.fromJson<double>(json['pernoiteValor']),
      pernoiteHoraInicio: serializer.fromJson<int>(json['pernoiteHoraInicio']),
      pernoiteHoraFim: serializer.fromJson<int>(json['pernoiteHoraFim']),
      vigenciaInicioEpoch: serializer.fromJson<int>(
        json['vigenciaInicioEpoch'],
      ),
      vigenciaFimEpoch: serializer.fromJson<int?>(json['vigenciaFimEpoch']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operacaoId': serializer.toJson<String>(operacaoId),
      'nome': serializer.toJson<String>(nome),
      'tipoVeiculo': serializer.toJson<String>(tipoVeiculo),
      'ordem': serializer.toJson<int>(ordem),
      'visivelOperador': serializer.toJson<bool>(visivelOperador),
      'fracaoInicialMinutos': serializer.toJson<int>(fracaoInicialMinutos),
      'fracaoInicialValor': serializer.toJson<double>(fracaoInicialValor),
      'fracaoAdicionalMinutos': serializer.toJson<int>(fracaoAdicionalMinutos),
      'fracaoAdicionalValor': serializer.toJson<double>(fracaoAdicionalValor),
      'tetoDiaria': serializer.toJson<double>(tetoDiaria),
      'toleranciaMinutos': serializer.toJson<int>(toleranciaMinutos),
      'pernoiteValor': serializer.toJson<double>(pernoiteValor),
      'pernoiteHoraInicio': serializer.toJson<int>(pernoiteHoraInicio),
      'pernoiteHoraFim': serializer.toJson<int>(pernoiteHoraFim),
      'vigenciaInicioEpoch': serializer.toJson<int>(vigenciaInicioEpoch),
      'vigenciaFimEpoch': serializer.toJson<int?>(vigenciaFimEpoch),
    };
  }

  Tarifa copyWith({
    String? id,
    String? operacaoId,
    String? nome,
    String? tipoVeiculo,
    int? ordem,
    bool? visivelOperador,
    int? fracaoInicialMinutos,
    double? fracaoInicialValor,
    int? fracaoAdicionalMinutos,
    double? fracaoAdicionalValor,
    double? tetoDiaria,
    int? toleranciaMinutos,
    double? pernoiteValor,
    int? pernoiteHoraInicio,
    int? pernoiteHoraFim,
    int? vigenciaInicioEpoch,
    Value<int?> vigenciaFimEpoch = const Value.absent(),
  }) => Tarifa(
    id: id ?? this.id,
    operacaoId: operacaoId ?? this.operacaoId,
    nome: nome ?? this.nome,
    tipoVeiculo: tipoVeiculo ?? this.tipoVeiculo,
    ordem: ordem ?? this.ordem,
    visivelOperador: visivelOperador ?? this.visivelOperador,
    fracaoInicialMinutos: fracaoInicialMinutos ?? this.fracaoInicialMinutos,
    fracaoInicialValor: fracaoInicialValor ?? this.fracaoInicialValor,
    fracaoAdicionalMinutos:
        fracaoAdicionalMinutos ?? this.fracaoAdicionalMinutos,
    fracaoAdicionalValor: fracaoAdicionalValor ?? this.fracaoAdicionalValor,
    tetoDiaria: tetoDiaria ?? this.tetoDiaria,
    toleranciaMinutos: toleranciaMinutos ?? this.toleranciaMinutos,
    pernoiteValor: pernoiteValor ?? this.pernoiteValor,
    pernoiteHoraInicio: pernoiteHoraInicio ?? this.pernoiteHoraInicio,
    pernoiteHoraFim: pernoiteHoraFim ?? this.pernoiteHoraFim,
    vigenciaInicioEpoch: vigenciaInicioEpoch ?? this.vigenciaInicioEpoch,
    vigenciaFimEpoch: vigenciaFimEpoch.present
        ? vigenciaFimEpoch.value
        : this.vigenciaFimEpoch,
  );
  Tarifa copyWithCompanion(TarifasCompanion data) {
    return Tarifa(
      id: data.id.present ? data.id.value : this.id,
      operacaoId: data.operacaoId.present
          ? data.operacaoId.value
          : this.operacaoId,
      nome: data.nome.present ? data.nome.value : this.nome,
      tipoVeiculo: data.tipoVeiculo.present
          ? data.tipoVeiculo.value
          : this.tipoVeiculo,
      ordem: data.ordem.present ? data.ordem.value : this.ordem,
      visivelOperador: data.visivelOperador.present
          ? data.visivelOperador.value
          : this.visivelOperador,
      fracaoInicialMinutos: data.fracaoInicialMinutos.present
          ? data.fracaoInicialMinutos.value
          : this.fracaoInicialMinutos,
      fracaoInicialValor: data.fracaoInicialValor.present
          ? data.fracaoInicialValor.value
          : this.fracaoInicialValor,
      fracaoAdicionalMinutos: data.fracaoAdicionalMinutos.present
          ? data.fracaoAdicionalMinutos.value
          : this.fracaoAdicionalMinutos,
      fracaoAdicionalValor: data.fracaoAdicionalValor.present
          ? data.fracaoAdicionalValor.value
          : this.fracaoAdicionalValor,
      tetoDiaria: data.tetoDiaria.present
          ? data.tetoDiaria.value
          : this.tetoDiaria,
      toleranciaMinutos: data.toleranciaMinutos.present
          ? data.toleranciaMinutos.value
          : this.toleranciaMinutos,
      pernoiteValor: data.pernoiteValor.present
          ? data.pernoiteValor.value
          : this.pernoiteValor,
      pernoiteHoraInicio: data.pernoiteHoraInicio.present
          ? data.pernoiteHoraInicio.value
          : this.pernoiteHoraInicio,
      pernoiteHoraFim: data.pernoiteHoraFim.present
          ? data.pernoiteHoraFim.value
          : this.pernoiteHoraFim,
      vigenciaInicioEpoch: data.vigenciaInicioEpoch.present
          ? data.vigenciaInicioEpoch.value
          : this.vigenciaInicioEpoch,
      vigenciaFimEpoch: data.vigenciaFimEpoch.present
          ? data.vigenciaFimEpoch.value
          : this.vigenciaFimEpoch,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Tarifa(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('nome: $nome, ')
          ..write('tipoVeiculo: $tipoVeiculo, ')
          ..write('ordem: $ordem, ')
          ..write('visivelOperador: $visivelOperador, ')
          ..write('fracaoInicialMinutos: $fracaoInicialMinutos, ')
          ..write('fracaoInicialValor: $fracaoInicialValor, ')
          ..write('fracaoAdicionalMinutos: $fracaoAdicionalMinutos, ')
          ..write('fracaoAdicionalValor: $fracaoAdicionalValor, ')
          ..write('tetoDiaria: $tetoDiaria, ')
          ..write('toleranciaMinutos: $toleranciaMinutos, ')
          ..write('pernoiteValor: $pernoiteValor, ')
          ..write('pernoiteHoraInicio: $pernoiteHoraInicio, ')
          ..write('pernoiteHoraFim: $pernoiteHoraFim, ')
          ..write('vigenciaInicioEpoch: $vigenciaInicioEpoch, ')
          ..write('vigenciaFimEpoch: $vigenciaFimEpoch')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    operacaoId,
    nome,
    tipoVeiculo,
    ordem,
    visivelOperador,
    fracaoInicialMinutos,
    fracaoInicialValor,
    fracaoAdicionalMinutos,
    fracaoAdicionalValor,
    tetoDiaria,
    toleranciaMinutos,
    pernoiteValor,
    pernoiteHoraInicio,
    pernoiteHoraFim,
    vigenciaInicioEpoch,
    vigenciaFimEpoch,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Tarifa &&
          other.id == this.id &&
          other.operacaoId == this.operacaoId &&
          other.nome == this.nome &&
          other.tipoVeiculo == this.tipoVeiculo &&
          other.ordem == this.ordem &&
          other.visivelOperador == this.visivelOperador &&
          other.fracaoInicialMinutos == this.fracaoInicialMinutos &&
          other.fracaoInicialValor == this.fracaoInicialValor &&
          other.fracaoAdicionalMinutos == this.fracaoAdicionalMinutos &&
          other.fracaoAdicionalValor == this.fracaoAdicionalValor &&
          other.tetoDiaria == this.tetoDiaria &&
          other.toleranciaMinutos == this.toleranciaMinutos &&
          other.pernoiteValor == this.pernoiteValor &&
          other.pernoiteHoraInicio == this.pernoiteHoraInicio &&
          other.pernoiteHoraFim == this.pernoiteHoraFim &&
          other.vigenciaInicioEpoch == this.vigenciaInicioEpoch &&
          other.vigenciaFimEpoch == this.vigenciaFimEpoch);
}

class TarifasCompanion extends UpdateCompanion<Tarifa> {
  final Value<String> id;
  final Value<String> operacaoId;
  final Value<String> nome;
  final Value<String> tipoVeiculo;
  final Value<int> ordem;
  final Value<bool> visivelOperador;
  final Value<int> fracaoInicialMinutos;
  final Value<double> fracaoInicialValor;
  final Value<int> fracaoAdicionalMinutos;
  final Value<double> fracaoAdicionalValor;
  final Value<double> tetoDiaria;
  final Value<int> toleranciaMinutos;
  final Value<double> pernoiteValor;
  final Value<int> pernoiteHoraInicio;
  final Value<int> pernoiteHoraFim;
  final Value<int> vigenciaInicioEpoch;
  final Value<int?> vigenciaFimEpoch;
  final Value<int> rowid;
  const TarifasCompanion({
    this.id = const Value.absent(),
    this.operacaoId = const Value.absent(),
    this.nome = const Value.absent(),
    this.tipoVeiculo = const Value.absent(),
    this.ordem = const Value.absent(),
    this.visivelOperador = const Value.absent(),
    this.fracaoInicialMinutos = const Value.absent(),
    this.fracaoInicialValor = const Value.absent(),
    this.fracaoAdicionalMinutos = const Value.absent(),
    this.fracaoAdicionalValor = const Value.absent(),
    this.tetoDiaria = const Value.absent(),
    this.toleranciaMinutos = const Value.absent(),
    this.pernoiteValor = const Value.absent(),
    this.pernoiteHoraInicio = const Value.absent(),
    this.pernoiteHoraFim = const Value.absent(),
    this.vigenciaInicioEpoch = const Value.absent(),
    this.vigenciaFimEpoch = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TarifasCompanion.insert({
    required String id,
    required String operacaoId,
    this.nome = const Value.absent(),
    required String tipoVeiculo,
    this.ordem = const Value.absent(),
    this.visivelOperador = const Value.absent(),
    required int fracaoInicialMinutos,
    required double fracaoInicialValor,
    required int fracaoAdicionalMinutos,
    required double fracaoAdicionalValor,
    required double tetoDiaria,
    required int toleranciaMinutos,
    required double pernoiteValor,
    required int pernoiteHoraInicio,
    required int pernoiteHoraFim,
    required int vigenciaInicioEpoch,
    this.vigenciaFimEpoch = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       operacaoId = Value(operacaoId),
       tipoVeiculo = Value(tipoVeiculo),
       fracaoInicialMinutos = Value(fracaoInicialMinutos),
       fracaoInicialValor = Value(fracaoInicialValor),
       fracaoAdicionalMinutos = Value(fracaoAdicionalMinutos),
       fracaoAdicionalValor = Value(fracaoAdicionalValor),
       tetoDiaria = Value(tetoDiaria),
       toleranciaMinutos = Value(toleranciaMinutos),
       pernoiteValor = Value(pernoiteValor),
       pernoiteHoraInicio = Value(pernoiteHoraInicio),
       pernoiteHoraFim = Value(pernoiteHoraFim),
       vigenciaInicioEpoch = Value(vigenciaInicioEpoch);
  static Insertable<Tarifa> custom({
    Expression<String>? id,
    Expression<String>? operacaoId,
    Expression<String>? nome,
    Expression<String>? tipoVeiculo,
    Expression<int>? ordem,
    Expression<bool>? visivelOperador,
    Expression<int>? fracaoInicialMinutos,
    Expression<double>? fracaoInicialValor,
    Expression<int>? fracaoAdicionalMinutos,
    Expression<double>? fracaoAdicionalValor,
    Expression<double>? tetoDiaria,
    Expression<int>? toleranciaMinutos,
    Expression<double>? pernoiteValor,
    Expression<int>? pernoiteHoraInicio,
    Expression<int>? pernoiteHoraFim,
    Expression<int>? vigenciaInicioEpoch,
    Expression<int>? vigenciaFimEpoch,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operacaoId != null) 'operacao_id': operacaoId,
      if (nome != null) 'nome': nome,
      if (tipoVeiculo != null) 'tipo_veiculo': tipoVeiculo,
      if (ordem != null) 'ordem': ordem,
      if (visivelOperador != null) 'visivel_operador': visivelOperador,
      if (fracaoInicialMinutos != null)
        'fracao_inicial_minutos': fracaoInicialMinutos,
      if (fracaoInicialValor != null)
        'fracao_inicial_valor': fracaoInicialValor,
      if (fracaoAdicionalMinutos != null)
        'fracao_adicional_minutos': fracaoAdicionalMinutos,
      if (fracaoAdicionalValor != null)
        'fracao_adicional_valor': fracaoAdicionalValor,
      if (tetoDiaria != null) 'teto_diaria': tetoDiaria,
      if (toleranciaMinutos != null) 'tolerancia_minutos': toleranciaMinutos,
      if (pernoiteValor != null) 'pernoite_valor': pernoiteValor,
      if (pernoiteHoraInicio != null)
        'pernoite_hora_inicio': pernoiteHoraInicio,
      if (pernoiteHoraFim != null) 'pernoite_hora_fim': pernoiteHoraFim,
      if (vigenciaInicioEpoch != null)
        'vigencia_inicio_epoch': vigenciaInicioEpoch,
      if (vigenciaFimEpoch != null) 'vigencia_fim_epoch': vigenciaFimEpoch,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TarifasCompanion copyWith({
    Value<String>? id,
    Value<String>? operacaoId,
    Value<String>? nome,
    Value<String>? tipoVeiculo,
    Value<int>? ordem,
    Value<bool>? visivelOperador,
    Value<int>? fracaoInicialMinutos,
    Value<double>? fracaoInicialValor,
    Value<int>? fracaoAdicionalMinutos,
    Value<double>? fracaoAdicionalValor,
    Value<double>? tetoDiaria,
    Value<int>? toleranciaMinutos,
    Value<double>? pernoiteValor,
    Value<int>? pernoiteHoraInicio,
    Value<int>? pernoiteHoraFim,
    Value<int>? vigenciaInicioEpoch,
    Value<int?>? vigenciaFimEpoch,
    Value<int>? rowid,
  }) {
    return TarifasCompanion(
      id: id ?? this.id,
      operacaoId: operacaoId ?? this.operacaoId,
      nome: nome ?? this.nome,
      tipoVeiculo: tipoVeiculo ?? this.tipoVeiculo,
      ordem: ordem ?? this.ordem,
      visivelOperador: visivelOperador ?? this.visivelOperador,
      fracaoInicialMinutos: fracaoInicialMinutos ?? this.fracaoInicialMinutos,
      fracaoInicialValor: fracaoInicialValor ?? this.fracaoInicialValor,
      fracaoAdicionalMinutos:
          fracaoAdicionalMinutos ?? this.fracaoAdicionalMinutos,
      fracaoAdicionalValor: fracaoAdicionalValor ?? this.fracaoAdicionalValor,
      tetoDiaria: tetoDiaria ?? this.tetoDiaria,
      toleranciaMinutos: toleranciaMinutos ?? this.toleranciaMinutos,
      pernoiteValor: pernoiteValor ?? this.pernoiteValor,
      pernoiteHoraInicio: pernoiteHoraInicio ?? this.pernoiteHoraInicio,
      pernoiteHoraFim: pernoiteHoraFim ?? this.pernoiteHoraFim,
      vigenciaInicioEpoch: vigenciaInicioEpoch ?? this.vigenciaInicioEpoch,
      vigenciaFimEpoch: vigenciaFimEpoch ?? this.vigenciaFimEpoch,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operacaoId.present) {
      map['operacao_id'] = Variable<String>(operacaoId.value);
    }
    if (nome.present) {
      map['nome'] = Variable<String>(nome.value);
    }
    if (tipoVeiculo.present) {
      map['tipo_veiculo'] = Variable<String>(tipoVeiculo.value);
    }
    if (ordem.present) {
      map['ordem'] = Variable<int>(ordem.value);
    }
    if (visivelOperador.present) {
      map['visivel_operador'] = Variable<bool>(visivelOperador.value);
    }
    if (fracaoInicialMinutos.present) {
      map['fracao_inicial_minutos'] = Variable<int>(fracaoInicialMinutos.value);
    }
    if (fracaoInicialValor.present) {
      map['fracao_inicial_valor'] = Variable<double>(fracaoInicialValor.value);
    }
    if (fracaoAdicionalMinutos.present) {
      map['fracao_adicional_minutos'] = Variable<int>(
        fracaoAdicionalMinutos.value,
      );
    }
    if (fracaoAdicionalValor.present) {
      map['fracao_adicional_valor'] = Variable<double>(
        fracaoAdicionalValor.value,
      );
    }
    if (tetoDiaria.present) {
      map['teto_diaria'] = Variable<double>(tetoDiaria.value);
    }
    if (toleranciaMinutos.present) {
      map['tolerancia_minutos'] = Variable<int>(toleranciaMinutos.value);
    }
    if (pernoiteValor.present) {
      map['pernoite_valor'] = Variable<double>(pernoiteValor.value);
    }
    if (pernoiteHoraInicio.present) {
      map['pernoite_hora_inicio'] = Variable<int>(pernoiteHoraInicio.value);
    }
    if (pernoiteHoraFim.present) {
      map['pernoite_hora_fim'] = Variable<int>(pernoiteHoraFim.value);
    }
    if (vigenciaInicioEpoch.present) {
      map['vigencia_inicio_epoch'] = Variable<int>(vigenciaInicioEpoch.value);
    }
    if (vigenciaFimEpoch.present) {
      map['vigencia_fim_epoch'] = Variable<int>(vigenciaFimEpoch.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TarifasCompanion(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('nome: $nome, ')
          ..write('tipoVeiculo: $tipoVeiculo, ')
          ..write('ordem: $ordem, ')
          ..write('visivelOperador: $visivelOperador, ')
          ..write('fracaoInicialMinutos: $fracaoInicialMinutos, ')
          ..write('fracaoInicialValor: $fracaoInicialValor, ')
          ..write('fracaoAdicionalMinutos: $fracaoAdicionalMinutos, ')
          ..write('fracaoAdicionalValor: $fracaoAdicionalValor, ')
          ..write('tetoDiaria: $tetoDiaria, ')
          ..write('toleranciaMinutos: $toleranciaMinutos, ')
          ..write('pernoiteValor: $pernoiteValor, ')
          ..write('pernoiteHoraInicio: $pernoiteHoraInicio, ')
          ..write('pernoiteHoraFim: $pernoiteHoraFim, ')
          ..write('vigenciaInicioEpoch: $vigenciaInicioEpoch, ')
          ..write('vigenciaFimEpoch: $vigenciaFimEpoch, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $TicketsTable extends Tickets with TableInfo<$TicketsTable, Ticket> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TicketsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operacaoIdMeta = const VerificationMeta(
    'operacaoId',
  );
  @override
  late final GeneratedColumn<String> operacaoId = GeneratedColumn<String>(
    'operacao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _placaMeta = const VerificationMeta('placa');
  @override
  late final GeneratedColumn<String> placa = GeneratedColumn<String>(
    'placa',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tipoVeiculoMeta = const VerificationMeta(
    'tipoVeiculo',
  );
  @override
  late final GeneratedColumn<String> tipoVeiculo = GeneratedColumn<String>(
    'tipo_veiculo',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _entradaEpochMeta = const VerificationMeta(
    'entradaEpoch',
  );
  @override
  late final GeneratedColumn<int> entradaEpoch = GeneratedColumn<int>(
    'entrada_epoch',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _saidaEpochMeta = const VerificationMeta(
    'saidaEpoch',
  );
  @override
  late final GeneratedColumn<int> saidaEpoch = GeneratedColumn<int>(
    'saida_epoch',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _valorCalculadoMeta = const VerificationMeta(
    'valorCalculado',
  );
  @override
  late final GeneratedColumn<double> valorCalculado = GeneratedColumn<double>(
    'valor_calculado',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _valorCobradoMeta = const VerificationMeta(
    'valorCobrado',
  );
  @override
  late final GeneratedColumn<double> valorCobrado = GeneratedColumn<double>(
    'valor_cobrado',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _formaPagamentoMeta = const VerificationMeta(
    'formaPagamento',
  );
  @override
  late final GeneratedColumn<String> formaPagamento = GeneratedColumn<String>(
    'forma_pagamento',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _motivoIsencaoMeta = const VerificationMeta(
    'motivoIsencao',
  );
  @override
  late final GeneratedColumn<String> motivoIsencao = GeneratedColumn<String>(
    'motivo_isencao',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('aberto'),
  );
  static const VerificationMeta _operadorIdMeta = const VerificationMeta(
    'operadorId',
  );
  @override
  late final GeneratedColumn<String> operadorId = GeneratedColumn<String>(
    'operador_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _caixaSessaoIdMeta = const VerificationMeta(
    'caixaSessaoId',
  );
  @override
  late final GeneratedColumn<String> caixaSessaoId = GeneratedColumn<String>(
    'caixa_sessao_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _tabelaPrecoIdMeta = const VerificationMeta(
    'tabelaPrecoId',
  );
  @override
  late final GeneratedColumn<String> tabelaPrecoId = GeneratedColumn<String>(
    'tabela_preco_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _clienteIdMeta = const VerificationMeta(
    'clienteId',
  );
  @override
  late final GeneratedColumn<String> clienteId = GeneratedColumn<String>(
    'cliente_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _planoIdMeta = const VerificationMeta(
    'planoId',
  );
  @override
  late final GeneratedColumn<String> planoId = GeneratedColumn<String>(
    'plano_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _origemMeta = const VerificationMeta('origem');
  @override
  late final GeneratedColumn<String> origem = GeneratedColumn<String>(
    'origem',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('avulso'),
  );
  static const VerificationMeta _atkMeta = const VerificationMeta('atk');
  @override
  late final GeneratedColumn<String> atk = GeneratedColumn<String>(
    'atk',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _itkMeta = const VerificationMeta('itk');
  @override
  late final GeneratedColumn<String> itk = GeneratedColumn<String>(
    'itk',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _authorizationCodeMeta = const VerificationMeta(
    'authorizationCode',
  );
  @override
  late final GeneratedColumn<String> authorizationCode =
      GeneratedColumn<String>(
        'authorization_code',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _brandMeta = const VerificationMeta('brand');
  @override
  late final GeneratedColumn<String> brand = GeneratedColumn<String>(
    'brand',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _cardPanMeta = const VerificationMeta(
    'cardPan',
  );
  @override
  late final GeneratedColumn<String> cardPan = GeneratedColumn<String>(
    'card_pan',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _installmentsMeta = const VerificationMeta(
    'installments',
  );
  @override
  late final GeneratedColumn<int> installments = GeneratedColumn<int>(
    'installments',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _paymentProcessorMeta = const VerificationMeta(
    'paymentProcessor',
  );
  @override
  late final GeneratedColumn<String> paymentProcessor = GeneratedColumn<String>(
    'payment_processor',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fotoEntradaPathMeta = const VerificationMeta(
    'fotoEntradaPath',
  );
  @override
  late final GeneratedColumn<String> fotoEntradaPath = GeneratedColumn<String>(
    'foto_entrada_path',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fotoEntradaEnviadaMeta =
      const VerificationMeta('fotoEntradaEnviada');
  @override
  late final GeneratedColumn<bool> fotoEntradaEnviada = GeneratedColumn<bool>(
    'foto_entrada_enviada',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("foto_entrada_enviada" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pendente'),
  );
  static const VerificationMeta _criadoEmMeta = const VerificationMeta(
    'criadoEm',
  );
  @override
  late final GeneratedColumn<int> criadoEm = GeneratedColumn<int>(
    'criado_em',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _atualizadoEmMeta = const VerificationMeta(
    'atualizadoEm',
  );
  @override
  late final GeneratedColumn<int> atualizadoEm = GeneratedColumn<int>(
    'atualizado_em',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    operacaoId,
    placa,
    tipoVeiculo,
    entradaEpoch,
    saidaEpoch,
    valorCalculado,
    valorCobrado,
    formaPagamento,
    motivoIsencao,
    status,
    operadorId,
    caixaSessaoId,
    tabelaPrecoId,
    clienteId,
    planoId,
    origem,
    atk,
    itk,
    authorizationCode,
    brand,
    cardPan,
    installments,
    paymentProcessor,
    fotoEntradaPath,
    fotoEntradaEnviada,
    syncStatus,
    criadoEm,
    atualizadoEm,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'tickets';
  @override
  VerificationContext validateIntegrity(
    Insertable<Ticket> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('operacao_id')) {
      context.handle(
        _operacaoIdMeta,
        operacaoId.isAcceptableOrUnknown(data['operacao_id']!, _operacaoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoIdMeta);
    }
    if (data.containsKey('placa')) {
      context.handle(
        _placaMeta,
        placa.isAcceptableOrUnknown(data['placa']!, _placaMeta),
      );
    } else if (isInserting) {
      context.missing(_placaMeta);
    }
    if (data.containsKey('tipo_veiculo')) {
      context.handle(
        _tipoVeiculoMeta,
        tipoVeiculo.isAcceptableOrUnknown(
          data['tipo_veiculo']!,
          _tipoVeiculoMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_tipoVeiculoMeta);
    }
    if (data.containsKey('entrada_epoch')) {
      context.handle(
        _entradaEpochMeta,
        entradaEpoch.isAcceptableOrUnknown(
          data['entrada_epoch']!,
          _entradaEpochMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_entradaEpochMeta);
    }
    if (data.containsKey('saida_epoch')) {
      context.handle(
        _saidaEpochMeta,
        saidaEpoch.isAcceptableOrUnknown(data['saida_epoch']!, _saidaEpochMeta),
      );
    }
    if (data.containsKey('valor_calculado')) {
      context.handle(
        _valorCalculadoMeta,
        valorCalculado.isAcceptableOrUnknown(
          data['valor_calculado']!,
          _valorCalculadoMeta,
        ),
      );
    }
    if (data.containsKey('valor_cobrado')) {
      context.handle(
        _valorCobradoMeta,
        valorCobrado.isAcceptableOrUnknown(
          data['valor_cobrado']!,
          _valorCobradoMeta,
        ),
      );
    }
    if (data.containsKey('forma_pagamento')) {
      context.handle(
        _formaPagamentoMeta,
        formaPagamento.isAcceptableOrUnknown(
          data['forma_pagamento']!,
          _formaPagamentoMeta,
        ),
      );
    }
    if (data.containsKey('motivo_isencao')) {
      context.handle(
        _motivoIsencaoMeta,
        motivoIsencao.isAcceptableOrUnknown(
          data['motivo_isencao']!,
          _motivoIsencaoMeta,
        ),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('operador_id')) {
      context.handle(
        _operadorIdMeta,
        operadorId.isAcceptableOrUnknown(data['operador_id']!, _operadorIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operadorIdMeta);
    }
    if (data.containsKey('caixa_sessao_id')) {
      context.handle(
        _caixaSessaoIdMeta,
        caixaSessaoId.isAcceptableOrUnknown(
          data['caixa_sessao_id']!,
          _caixaSessaoIdMeta,
        ),
      );
    }
    if (data.containsKey('tabela_preco_id')) {
      context.handle(
        _tabelaPrecoIdMeta,
        tabelaPrecoId.isAcceptableOrUnknown(
          data['tabela_preco_id']!,
          _tabelaPrecoIdMeta,
        ),
      );
    }
    if (data.containsKey('cliente_id')) {
      context.handle(
        _clienteIdMeta,
        clienteId.isAcceptableOrUnknown(data['cliente_id']!, _clienteIdMeta),
      );
    }
    if (data.containsKey('plano_id')) {
      context.handle(
        _planoIdMeta,
        planoId.isAcceptableOrUnknown(data['plano_id']!, _planoIdMeta),
      );
    }
    if (data.containsKey('origem')) {
      context.handle(
        _origemMeta,
        origem.isAcceptableOrUnknown(data['origem']!, _origemMeta),
      );
    }
    if (data.containsKey('atk')) {
      context.handle(
        _atkMeta,
        atk.isAcceptableOrUnknown(data['atk']!, _atkMeta),
      );
    }
    if (data.containsKey('itk')) {
      context.handle(
        _itkMeta,
        itk.isAcceptableOrUnknown(data['itk']!, _itkMeta),
      );
    }
    if (data.containsKey('authorization_code')) {
      context.handle(
        _authorizationCodeMeta,
        authorizationCode.isAcceptableOrUnknown(
          data['authorization_code']!,
          _authorizationCodeMeta,
        ),
      );
    }
    if (data.containsKey('brand')) {
      context.handle(
        _brandMeta,
        brand.isAcceptableOrUnknown(data['brand']!, _brandMeta),
      );
    }
    if (data.containsKey('card_pan')) {
      context.handle(
        _cardPanMeta,
        cardPan.isAcceptableOrUnknown(data['card_pan']!, _cardPanMeta),
      );
    }
    if (data.containsKey('installments')) {
      context.handle(
        _installmentsMeta,
        installments.isAcceptableOrUnknown(
          data['installments']!,
          _installmentsMeta,
        ),
      );
    }
    if (data.containsKey('payment_processor')) {
      context.handle(
        _paymentProcessorMeta,
        paymentProcessor.isAcceptableOrUnknown(
          data['payment_processor']!,
          _paymentProcessorMeta,
        ),
      );
    }
    if (data.containsKey('foto_entrada_path')) {
      context.handle(
        _fotoEntradaPathMeta,
        fotoEntradaPath.isAcceptableOrUnknown(
          data['foto_entrada_path']!,
          _fotoEntradaPathMeta,
        ),
      );
    }
    if (data.containsKey('foto_entrada_enviada')) {
      context.handle(
        _fotoEntradaEnviadaMeta,
        fotoEntradaEnviada.isAcceptableOrUnknown(
          data['foto_entrada_enviada']!,
          _fotoEntradaEnviadaMeta,
        ),
      );
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    if (data.containsKey('criado_em')) {
      context.handle(
        _criadoEmMeta,
        criadoEm.isAcceptableOrUnknown(data['criado_em']!, _criadoEmMeta),
      );
    } else if (isInserting) {
      context.missing(_criadoEmMeta);
    }
    if (data.containsKey('atualizado_em')) {
      context.handle(
        _atualizadoEmMeta,
        atualizadoEm.isAcceptableOrUnknown(
          data['atualizado_em']!,
          _atualizadoEmMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_atualizadoEmMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Ticket map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Ticket(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      operacaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao_id'],
      )!,
      placa: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}placa'],
      )!,
      tipoVeiculo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_veiculo'],
      )!,
      entradaEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}entrada_epoch'],
      )!,
      saidaEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}saida_epoch'],
      ),
      valorCalculado: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_calculado'],
      ),
      valorCobrado: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_cobrado'],
      ),
      formaPagamento: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}forma_pagamento'],
      ),
      motivoIsencao: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}motivo_isencao'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      operadorId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operador_id'],
      )!,
      caixaSessaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}caixa_sessao_id'],
      ),
      tabelaPrecoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tabela_preco_id'],
      ),
      clienteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}cliente_id'],
      ),
      planoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}plano_id'],
      ),
      origem: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}origem'],
      )!,
      atk: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}atk'],
      ),
      itk: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}itk'],
      ),
      authorizationCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}authorization_code'],
      ),
      brand: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}brand'],
      ),
      cardPan: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}card_pan'],
      ),
      installments: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}installments'],
      ),
      paymentProcessor: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payment_processor'],
      ),
      fotoEntradaPath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}foto_entrada_path'],
      ),
      fotoEntradaEnviada: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}foto_entrada_enviada'],
      )!,
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
      criadoEm: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}criado_em'],
      )!,
      atualizadoEm: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}atualizado_em'],
      )!,
    );
  }

  @override
  $TicketsTable createAlias(String alias) {
    return $TicketsTable(attachedDatabase, alias);
  }
}

class Ticket extends DataClass implements Insertable<Ticket> {
  final String id;
  final String operacaoId;
  final String placa;
  final String tipoVeiculo;
  final int entradaEpoch;
  final int? saidaEpoch;
  final double? valorCalculado;
  final double? valorCobrado;
  final String? formaPagamento;
  final String? motivoIsencao;
  final String status;
  final String operadorId;
  final String? caixaSessaoId;
  final String? tabelaPrecoId;
  final String? clienteId;
  final String? planoId;
  final String origem;
  final String? atk;
  final String? itk;
  final String? authorizationCode;
  final String? brand;
  final String? cardPan;
  final int? installments;
  final String? paymentProcessor;
  final String? fotoEntradaPath;
  final bool fotoEntradaEnviada;
  final String syncStatus;
  final int criadoEm;
  final int atualizadoEm;
  const Ticket({
    required this.id,
    required this.operacaoId,
    required this.placa,
    required this.tipoVeiculo,
    required this.entradaEpoch,
    this.saidaEpoch,
    this.valorCalculado,
    this.valorCobrado,
    this.formaPagamento,
    this.motivoIsencao,
    required this.status,
    required this.operadorId,
    this.caixaSessaoId,
    this.tabelaPrecoId,
    this.clienteId,
    this.planoId,
    required this.origem,
    this.atk,
    this.itk,
    this.authorizationCode,
    this.brand,
    this.cardPan,
    this.installments,
    this.paymentProcessor,
    this.fotoEntradaPath,
    required this.fotoEntradaEnviada,
    required this.syncStatus,
    required this.criadoEm,
    required this.atualizadoEm,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operacao_id'] = Variable<String>(operacaoId);
    map['placa'] = Variable<String>(placa);
    map['tipo_veiculo'] = Variable<String>(tipoVeiculo);
    map['entrada_epoch'] = Variable<int>(entradaEpoch);
    if (!nullToAbsent || saidaEpoch != null) {
      map['saida_epoch'] = Variable<int>(saidaEpoch);
    }
    if (!nullToAbsent || valorCalculado != null) {
      map['valor_calculado'] = Variable<double>(valorCalculado);
    }
    if (!nullToAbsent || valorCobrado != null) {
      map['valor_cobrado'] = Variable<double>(valorCobrado);
    }
    if (!nullToAbsent || formaPagamento != null) {
      map['forma_pagamento'] = Variable<String>(formaPagamento);
    }
    if (!nullToAbsent || motivoIsencao != null) {
      map['motivo_isencao'] = Variable<String>(motivoIsencao);
    }
    map['status'] = Variable<String>(status);
    map['operador_id'] = Variable<String>(operadorId);
    if (!nullToAbsent || caixaSessaoId != null) {
      map['caixa_sessao_id'] = Variable<String>(caixaSessaoId);
    }
    if (!nullToAbsent || tabelaPrecoId != null) {
      map['tabela_preco_id'] = Variable<String>(tabelaPrecoId);
    }
    if (!nullToAbsent || clienteId != null) {
      map['cliente_id'] = Variable<String>(clienteId);
    }
    if (!nullToAbsent || planoId != null) {
      map['plano_id'] = Variable<String>(planoId);
    }
    map['origem'] = Variable<String>(origem);
    if (!nullToAbsent || atk != null) {
      map['atk'] = Variable<String>(atk);
    }
    if (!nullToAbsent || itk != null) {
      map['itk'] = Variable<String>(itk);
    }
    if (!nullToAbsent || authorizationCode != null) {
      map['authorization_code'] = Variable<String>(authorizationCode);
    }
    if (!nullToAbsent || brand != null) {
      map['brand'] = Variable<String>(brand);
    }
    if (!nullToAbsent || cardPan != null) {
      map['card_pan'] = Variable<String>(cardPan);
    }
    if (!nullToAbsent || installments != null) {
      map['installments'] = Variable<int>(installments);
    }
    if (!nullToAbsent || paymentProcessor != null) {
      map['payment_processor'] = Variable<String>(paymentProcessor);
    }
    if (!nullToAbsent || fotoEntradaPath != null) {
      map['foto_entrada_path'] = Variable<String>(fotoEntradaPath);
    }
    map['foto_entrada_enviada'] = Variable<bool>(fotoEntradaEnviada);
    map['sync_status'] = Variable<String>(syncStatus);
    map['criado_em'] = Variable<int>(criadoEm);
    map['atualizado_em'] = Variable<int>(atualizadoEm);
    return map;
  }

  TicketsCompanion toCompanion(bool nullToAbsent) {
    return TicketsCompanion(
      id: Value(id),
      operacaoId: Value(operacaoId),
      placa: Value(placa),
      tipoVeiculo: Value(tipoVeiculo),
      entradaEpoch: Value(entradaEpoch),
      saidaEpoch: saidaEpoch == null && nullToAbsent
          ? const Value.absent()
          : Value(saidaEpoch),
      valorCalculado: valorCalculado == null && nullToAbsent
          ? const Value.absent()
          : Value(valorCalculado),
      valorCobrado: valorCobrado == null && nullToAbsent
          ? const Value.absent()
          : Value(valorCobrado),
      formaPagamento: formaPagamento == null && nullToAbsent
          ? const Value.absent()
          : Value(formaPagamento),
      motivoIsencao: motivoIsencao == null && nullToAbsent
          ? const Value.absent()
          : Value(motivoIsencao),
      status: Value(status),
      operadorId: Value(operadorId),
      caixaSessaoId: caixaSessaoId == null && nullToAbsent
          ? const Value.absent()
          : Value(caixaSessaoId),
      tabelaPrecoId: tabelaPrecoId == null && nullToAbsent
          ? const Value.absent()
          : Value(tabelaPrecoId),
      clienteId: clienteId == null && nullToAbsent
          ? const Value.absent()
          : Value(clienteId),
      planoId: planoId == null && nullToAbsent
          ? const Value.absent()
          : Value(planoId),
      origem: Value(origem),
      atk: atk == null && nullToAbsent ? const Value.absent() : Value(atk),
      itk: itk == null && nullToAbsent ? const Value.absent() : Value(itk),
      authorizationCode: authorizationCode == null && nullToAbsent
          ? const Value.absent()
          : Value(authorizationCode),
      brand: brand == null && nullToAbsent
          ? const Value.absent()
          : Value(brand),
      cardPan: cardPan == null && nullToAbsent
          ? const Value.absent()
          : Value(cardPan),
      installments: installments == null && nullToAbsent
          ? const Value.absent()
          : Value(installments),
      paymentProcessor: paymentProcessor == null && nullToAbsent
          ? const Value.absent()
          : Value(paymentProcessor),
      fotoEntradaPath: fotoEntradaPath == null && nullToAbsent
          ? const Value.absent()
          : Value(fotoEntradaPath),
      fotoEntradaEnviada: Value(fotoEntradaEnviada),
      syncStatus: Value(syncStatus),
      criadoEm: Value(criadoEm),
      atualizadoEm: Value(atualizadoEm),
    );
  }

  factory Ticket.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Ticket(
      id: serializer.fromJson<String>(json['id']),
      operacaoId: serializer.fromJson<String>(json['operacaoId']),
      placa: serializer.fromJson<String>(json['placa']),
      tipoVeiculo: serializer.fromJson<String>(json['tipoVeiculo']),
      entradaEpoch: serializer.fromJson<int>(json['entradaEpoch']),
      saidaEpoch: serializer.fromJson<int?>(json['saidaEpoch']),
      valorCalculado: serializer.fromJson<double?>(json['valorCalculado']),
      valorCobrado: serializer.fromJson<double?>(json['valorCobrado']),
      formaPagamento: serializer.fromJson<String?>(json['formaPagamento']),
      motivoIsencao: serializer.fromJson<String?>(json['motivoIsencao']),
      status: serializer.fromJson<String>(json['status']),
      operadorId: serializer.fromJson<String>(json['operadorId']),
      caixaSessaoId: serializer.fromJson<String?>(json['caixaSessaoId']),
      tabelaPrecoId: serializer.fromJson<String?>(json['tabelaPrecoId']),
      clienteId: serializer.fromJson<String?>(json['clienteId']),
      planoId: serializer.fromJson<String?>(json['planoId']),
      origem: serializer.fromJson<String>(json['origem']),
      atk: serializer.fromJson<String?>(json['atk']),
      itk: serializer.fromJson<String?>(json['itk']),
      authorizationCode: serializer.fromJson<String?>(
        json['authorizationCode'],
      ),
      brand: serializer.fromJson<String?>(json['brand']),
      cardPan: serializer.fromJson<String?>(json['cardPan']),
      installments: serializer.fromJson<int?>(json['installments']),
      paymentProcessor: serializer.fromJson<String?>(json['paymentProcessor']),
      fotoEntradaPath: serializer.fromJson<String?>(json['fotoEntradaPath']),
      fotoEntradaEnviada: serializer.fromJson<bool>(json['fotoEntradaEnviada']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      criadoEm: serializer.fromJson<int>(json['criadoEm']),
      atualizadoEm: serializer.fromJson<int>(json['atualizadoEm']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operacaoId': serializer.toJson<String>(operacaoId),
      'placa': serializer.toJson<String>(placa),
      'tipoVeiculo': serializer.toJson<String>(tipoVeiculo),
      'entradaEpoch': serializer.toJson<int>(entradaEpoch),
      'saidaEpoch': serializer.toJson<int?>(saidaEpoch),
      'valorCalculado': serializer.toJson<double?>(valorCalculado),
      'valorCobrado': serializer.toJson<double?>(valorCobrado),
      'formaPagamento': serializer.toJson<String?>(formaPagamento),
      'motivoIsencao': serializer.toJson<String?>(motivoIsencao),
      'status': serializer.toJson<String>(status),
      'operadorId': serializer.toJson<String>(operadorId),
      'caixaSessaoId': serializer.toJson<String?>(caixaSessaoId),
      'tabelaPrecoId': serializer.toJson<String?>(tabelaPrecoId),
      'clienteId': serializer.toJson<String?>(clienteId),
      'planoId': serializer.toJson<String?>(planoId),
      'origem': serializer.toJson<String>(origem),
      'atk': serializer.toJson<String?>(atk),
      'itk': serializer.toJson<String?>(itk),
      'authorizationCode': serializer.toJson<String?>(authorizationCode),
      'brand': serializer.toJson<String?>(brand),
      'cardPan': serializer.toJson<String?>(cardPan),
      'installments': serializer.toJson<int?>(installments),
      'paymentProcessor': serializer.toJson<String?>(paymentProcessor),
      'fotoEntradaPath': serializer.toJson<String?>(fotoEntradaPath),
      'fotoEntradaEnviada': serializer.toJson<bool>(fotoEntradaEnviada),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'criadoEm': serializer.toJson<int>(criadoEm),
      'atualizadoEm': serializer.toJson<int>(atualizadoEm),
    };
  }

  Ticket copyWith({
    String? id,
    String? operacaoId,
    String? placa,
    String? tipoVeiculo,
    int? entradaEpoch,
    Value<int?> saidaEpoch = const Value.absent(),
    Value<double?> valorCalculado = const Value.absent(),
    Value<double?> valorCobrado = const Value.absent(),
    Value<String?> formaPagamento = const Value.absent(),
    Value<String?> motivoIsencao = const Value.absent(),
    String? status,
    String? operadorId,
    Value<String?> caixaSessaoId = const Value.absent(),
    Value<String?> tabelaPrecoId = const Value.absent(),
    Value<String?> clienteId = const Value.absent(),
    Value<String?> planoId = const Value.absent(),
    String? origem,
    Value<String?> atk = const Value.absent(),
    Value<String?> itk = const Value.absent(),
    Value<String?> authorizationCode = const Value.absent(),
    Value<String?> brand = const Value.absent(),
    Value<String?> cardPan = const Value.absent(),
    Value<int?> installments = const Value.absent(),
    Value<String?> paymentProcessor = const Value.absent(),
    Value<String?> fotoEntradaPath = const Value.absent(),
    bool? fotoEntradaEnviada,
    String? syncStatus,
    int? criadoEm,
    int? atualizadoEm,
  }) => Ticket(
    id: id ?? this.id,
    operacaoId: operacaoId ?? this.operacaoId,
    placa: placa ?? this.placa,
    tipoVeiculo: tipoVeiculo ?? this.tipoVeiculo,
    entradaEpoch: entradaEpoch ?? this.entradaEpoch,
    saidaEpoch: saidaEpoch.present ? saidaEpoch.value : this.saidaEpoch,
    valorCalculado: valorCalculado.present
        ? valorCalculado.value
        : this.valorCalculado,
    valorCobrado: valorCobrado.present ? valorCobrado.value : this.valorCobrado,
    formaPagamento: formaPagamento.present
        ? formaPagamento.value
        : this.formaPagamento,
    motivoIsencao: motivoIsencao.present
        ? motivoIsencao.value
        : this.motivoIsencao,
    status: status ?? this.status,
    operadorId: operadorId ?? this.operadorId,
    caixaSessaoId: caixaSessaoId.present
        ? caixaSessaoId.value
        : this.caixaSessaoId,
    tabelaPrecoId: tabelaPrecoId.present
        ? tabelaPrecoId.value
        : this.tabelaPrecoId,
    clienteId: clienteId.present ? clienteId.value : this.clienteId,
    planoId: planoId.present ? planoId.value : this.planoId,
    origem: origem ?? this.origem,
    atk: atk.present ? atk.value : this.atk,
    itk: itk.present ? itk.value : this.itk,
    authorizationCode: authorizationCode.present
        ? authorizationCode.value
        : this.authorizationCode,
    brand: brand.present ? brand.value : this.brand,
    cardPan: cardPan.present ? cardPan.value : this.cardPan,
    installments: installments.present ? installments.value : this.installments,
    paymentProcessor: paymentProcessor.present
        ? paymentProcessor.value
        : this.paymentProcessor,
    fotoEntradaPath: fotoEntradaPath.present
        ? fotoEntradaPath.value
        : this.fotoEntradaPath,
    fotoEntradaEnviada: fotoEntradaEnviada ?? this.fotoEntradaEnviada,
    syncStatus: syncStatus ?? this.syncStatus,
    criadoEm: criadoEm ?? this.criadoEm,
    atualizadoEm: atualizadoEm ?? this.atualizadoEm,
  );
  Ticket copyWithCompanion(TicketsCompanion data) {
    return Ticket(
      id: data.id.present ? data.id.value : this.id,
      operacaoId: data.operacaoId.present
          ? data.operacaoId.value
          : this.operacaoId,
      placa: data.placa.present ? data.placa.value : this.placa,
      tipoVeiculo: data.tipoVeiculo.present
          ? data.tipoVeiculo.value
          : this.tipoVeiculo,
      entradaEpoch: data.entradaEpoch.present
          ? data.entradaEpoch.value
          : this.entradaEpoch,
      saidaEpoch: data.saidaEpoch.present
          ? data.saidaEpoch.value
          : this.saidaEpoch,
      valorCalculado: data.valorCalculado.present
          ? data.valorCalculado.value
          : this.valorCalculado,
      valorCobrado: data.valorCobrado.present
          ? data.valorCobrado.value
          : this.valorCobrado,
      formaPagamento: data.formaPagamento.present
          ? data.formaPagamento.value
          : this.formaPagamento,
      motivoIsencao: data.motivoIsencao.present
          ? data.motivoIsencao.value
          : this.motivoIsencao,
      status: data.status.present ? data.status.value : this.status,
      operadorId: data.operadorId.present
          ? data.operadorId.value
          : this.operadorId,
      caixaSessaoId: data.caixaSessaoId.present
          ? data.caixaSessaoId.value
          : this.caixaSessaoId,
      tabelaPrecoId: data.tabelaPrecoId.present
          ? data.tabelaPrecoId.value
          : this.tabelaPrecoId,
      clienteId: data.clienteId.present ? data.clienteId.value : this.clienteId,
      planoId: data.planoId.present ? data.planoId.value : this.planoId,
      origem: data.origem.present ? data.origem.value : this.origem,
      atk: data.atk.present ? data.atk.value : this.atk,
      itk: data.itk.present ? data.itk.value : this.itk,
      authorizationCode: data.authorizationCode.present
          ? data.authorizationCode.value
          : this.authorizationCode,
      brand: data.brand.present ? data.brand.value : this.brand,
      cardPan: data.cardPan.present ? data.cardPan.value : this.cardPan,
      installments: data.installments.present
          ? data.installments.value
          : this.installments,
      paymentProcessor: data.paymentProcessor.present
          ? data.paymentProcessor.value
          : this.paymentProcessor,
      fotoEntradaPath: data.fotoEntradaPath.present
          ? data.fotoEntradaPath.value
          : this.fotoEntradaPath,
      fotoEntradaEnviada: data.fotoEntradaEnviada.present
          ? data.fotoEntradaEnviada.value
          : this.fotoEntradaEnviada,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
      criadoEm: data.criadoEm.present ? data.criadoEm.value : this.criadoEm,
      atualizadoEm: data.atualizadoEm.present
          ? data.atualizadoEm.value
          : this.atualizadoEm,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Ticket(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('placa: $placa, ')
          ..write('tipoVeiculo: $tipoVeiculo, ')
          ..write('entradaEpoch: $entradaEpoch, ')
          ..write('saidaEpoch: $saidaEpoch, ')
          ..write('valorCalculado: $valorCalculado, ')
          ..write('valorCobrado: $valorCobrado, ')
          ..write('formaPagamento: $formaPagamento, ')
          ..write('motivoIsencao: $motivoIsencao, ')
          ..write('status: $status, ')
          ..write('operadorId: $operadorId, ')
          ..write('caixaSessaoId: $caixaSessaoId, ')
          ..write('tabelaPrecoId: $tabelaPrecoId, ')
          ..write('clienteId: $clienteId, ')
          ..write('planoId: $planoId, ')
          ..write('origem: $origem, ')
          ..write('atk: $atk, ')
          ..write('itk: $itk, ')
          ..write('authorizationCode: $authorizationCode, ')
          ..write('brand: $brand, ')
          ..write('cardPan: $cardPan, ')
          ..write('installments: $installments, ')
          ..write('paymentProcessor: $paymentProcessor, ')
          ..write('fotoEntradaPath: $fotoEntradaPath, ')
          ..write('fotoEntradaEnviada: $fotoEntradaEnviada, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('criadoEm: $criadoEm, ')
          ..write('atualizadoEm: $atualizadoEm')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    operacaoId,
    placa,
    tipoVeiculo,
    entradaEpoch,
    saidaEpoch,
    valorCalculado,
    valorCobrado,
    formaPagamento,
    motivoIsencao,
    status,
    operadorId,
    caixaSessaoId,
    tabelaPrecoId,
    clienteId,
    planoId,
    origem,
    atk,
    itk,
    authorizationCode,
    brand,
    cardPan,
    installments,
    paymentProcessor,
    fotoEntradaPath,
    fotoEntradaEnviada,
    syncStatus,
    criadoEm,
    atualizadoEm,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Ticket &&
          other.id == this.id &&
          other.operacaoId == this.operacaoId &&
          other.placa == this.placa &&
          other.tipoVeiculo == this.tipoVeiculo &&
          other.entradaEpoch == this.entradaEpoch &&
          other.saidaEpoch == this.saidaEpoch &&
          other.valorCalculado == this.valorCalculado &&
          other.valorCobrado == this.valorCobrado &&
          other.formaPagamento == this.formaPagamento &&
          other.motivoIsencao == this.motivoIsencao &&
          other.status == this.status &&
          other.operadorId == this.operadorId &&
          other.caixaSessaoId == this.caixaSessaoId &&
          other.tabelaPrecoId == this.tabelaPrecoId &&
          other.clienteId == this.clienteId &&
          other.planoId == this.planoId &&
          other.origem == this.origem &&
          other.atk == this.atk &&
          other.itk == this.itk &&
          other.authorizationCode == this.authorizationCode &&
          other.brand == this.brand &&
          other.cardPan == this.cardPan &&
          other.installments == this.installments &&
          other.paymentProcessor == this.paymentProcessor &&
          other.fotoEntradaPath == this.fotoEntradaPath &&
          other.fotoEntradaEnviada == this.fotoEntradaEnviada &&
          other.syncStatus == this.syncStatus &&
          other.criadoEm == this.criadoEm &&
          other.atualizadoEm == this.atualizadoEm);
}

class TicketsCompanion extends UpdateCompanion<Ticket> {
  final Value<String> id;
  final Value<String> operacaoId;
  final Value<String> placa;
  final Value<String> tipoVeiculo;
  final Value<int> entradaEpoch;
  final Value<int?> saidaEpoch;
  final Value<double?> valorCalculado;
  final Value<double?> valorCobrado;
  final Value<String?> formaPagamento;
  final Value<String?> motivoIsencao;
  final Value<String> status;
  final Value<String> operadorId;
  final Value<String?> caixaSessaoId;
  final Value<String?> tabelaPrecoId;
  final Value<String?> clienteId;
  final Value<String?> planoId;
  final Value<String> origem;
  final Value<String?> atk;
  final Value<String?> itk;
  final Value<String?> authorizationCode;
  final Value<String?> brand;
  final Value<String?> cardPan;
  final Value<int?> installments;
  final Value<String?> paymentProcessor;
  final Value<String?> fotoEntradaPath;
  final Value<bool> fotoEntradaEnviada;
  final Value<String> syncStatus;
  final Value<int> criadoEm;
  final Value<int> atualizadoEm;
  final Value<int> rowid;
  const TicketsCompanion({
    this.id = const Value.absent(),
    this.operacaoId = const Value.absent(),
    this.placa = const Value.absent(),
    this.tipoVeiculo = const Value.absent(),
    this.entradaEpoch = const Value.absent(),
    this.saidaEpoch = const Value.absent(),
    this.valorCalculado = const Value.absent(),
    this.valorCobrado = const Value.absent(),
    this.formaPagamento = const Value.absent(),
    this.motivoIsencao = const Value.absent(),
    this.status = const Value.absent(),
    this.operadorId = const Value.absent(),
    this.caixaSessaoId = const Value.absent(),
    this.tabelaPrecoId = const Value.absent(),
    this.clienteId = const Value.absent(),
    this.planoId = const Value.absent(),
    this.origem = const Value.absent(),
    this.atk = const Value.absent(),
    this.itk = const Value.absent(),
    this.authorizationCode = const Value.absent(),
    this.brand = const Value.absent(),
    this.cardPan = const Value.absent(),
    this.installments = const Value.absent(),
    this.paymentProcessor = const Value.absent(),
    this.fotoEntradaPath = const Value.absent(),
    this.fotoEntradaEnviada = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.criadoEm = const Value.absent(),
    this.atualizadoEm = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TicketsCompanion.insert({
    required String id,
    required String operacaoId,
    required String placa,
    required String tipoVeiculo,
    required int entradaEpoch,
    this.saidaEpoch = const Value.absent(),
    this.valorCalculado = const Value.absent(),
    this.valorCobrado = const Value.absent(),
    this.formaPagamento = const Value.absent(),
    this.motivoIsencao = const Value.absent(),
    this.status = const Value.absent(),
    required String operadorId,
    this.caixaSessaoId = const Value.absent(),
    this.tabelaPrecoId = const Value.absent(),
    this.clienteId = const Value.absent(),
    this.planoId = const Value.absent(),
    this.origem = const Value.absent(),
    this.atk = const Value.absent(),
    this.itk = const Value.absent(),
    this.authorizationCode = const Value.absent(),
    this.brand = const Value.absent(),
    this.cardPan = const Value.absent(),
    this.installments = const Value.absent(),
    this.paymentProcessor = const Value.absent(),
    this.fotoEntradaPath = const Value.absent(),
    this.fotoEntradaEnviada = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required int criadoEm,
    required int atualizadoEm,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       operacaoId = Value(operacaoId),
       placa = Value(placa),
       tipoVeiculo = Value(tipoVeiculo),
       entradaEpoch = Value(entradaEpoch),
       operadorId = Value(operadorId),
       criadoEm = Value(criadoEm),
       atualizadoEm = Value(atualizadoEm);
  static Insertable<Ticket> custom({
    Expression<String>? id,
    Expression<String>? operacaoId,
    Expression<String>? placa,
    Expression<String>? tipoVeiculo,
    Expression<int>? entradaEpoch,
    Expression<int>? saidaEpoch,
    Expression<double>? valorCalculado,
    Expression<double>? valorCobrado,
    Expression<String>? formaPagamento,
    Expression<String>? motivoIsencao,
    Expression<String>? status,
    Expression<String>? operadorId,
    Expression<String>? caixaSessaoId,
    Expression<String>? tabelaPrecoId,
    Expression<String>? clienteId,
    Expression<String>? planoId,
    Expression<String>? origem,
    Expression<String>? atk,
    Expression<String>? itk,
    Expression<String>? authorizationCode,
    Expression<String>? brand,
    Expression<String>? cardPan,
    Expression<int>? installments,
    Expression<String>? paymentProcessor,
    Expression<String>? fotoEntradaPath,
    Expression<bool>? fotoEntradaEnviada,
    Expression<String>? syncStatus,
    Expression<int>? criadoEm,
    Expression<int>? atualizadoEm,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operacaoId != null) 'operacao_id': operacaoId,
      if (placa != null) 'placa': placa,
      if (tipoVeiculo != null) 'tipo_veiculo': tipoVeiculo,
      if (entradaEpoch != null) 'entrada_epoch': entradaEpoch,
      if (saidaEpoch != null) 'saida_epoch': saidaEpoch,
      if (valorCalculado != null) 'valor_calculado': valorCalculado,
      if (valorCobrado != null) 'valor_cobrado': valorCobrado,
      if (formaPagamento != null) 'forma_pagamento': formaPagamento,
      if (motivoIsencao != null) 'motivo_isencao': motivoIsencao,
      if (status != null) 'status': status,
      if (operadorId != null) 'operador_id': operadorId,
      if (caixaSessaoId != null) 'caixa_sessao_id': caixaSessaoId,
      if (tabelaPrecoId != null) 'tabela_preco_id': tabelaPrecoId,
      if (clienteId != null) 'cliente_id': clienteId,
      if (planoId != null) 'plano_id': planoId,
      if (origem != null) 'origem': origem,
      if (atk != null) 'atk': atk,
      if (itk != null) 'itk': itk,
      if (authorizationCode != null) 'authorization_code': authorizationCode,
      if (brand != null) 'brand': brand,
      if (cardPan != null) 'card_pan': cardPan,
      if (installments != null) 'installments': installments,
      if (paymentProcessor != null) 'payment_processor': paymentProcessor,
      if (fotoEntradaPath != null) 'foto_entrada_path': fotoEntradaPath,
      if (fotoEntradaEnviada != null)
        'foto_entrada_enviada': fotoEntradaEnviada,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (criadoEm != null) 'criado_em': criadoEm,
      if (atualizadoEm != null) 'atualizado_em': atualizadoEm,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TicketsCompanion copyWith({
    Value<String>? id,
    Value<String>? operacaoId,
    Value<String>? placa,
    Value<String>? tipoVeiculo,
    Value<int>? entradaEpoch,
    Value<int?>? saidaEpoch,
    Value<double?>? valorCalculado,
    Value<double?>? valorCobrado,
    Value<String?>? formaPagamento,
    Value<String?>? motivoIsencao,
    Value<String>? status,
    Value<String>? operadorId,
    Value<String?>? caixaSessaoId,
    Value<String?>? tabelaPrecoId,
    Value<String?>? clienteId,
    Value<String?>? planoId,
    Value<String>? origem,
    Value<String?>? atk,
    Value<String?>? itk,
    Value<String?>? authorizationCode,
    Value<String?>? brand,
    Value<String?>? cardPan,
    Value<int?>? installments,
    Value<String?>? paymentProcessor,
    Value<String?>? fotoEntradaPath,
    Value<bool>? fotoEntradaEnviada,
    Value<String>? syncStatus,
    Value<int>? criadoEm,
    Value<int>? atualizadoEm,
    Value<int>? rowid,
  }) {
    return TicketsCompanion(
      id: id ?? this.id,
      operacaoId: operacaoId ?? this.operacaoId,
      placa: placa ?? this.placa,
      tipoVeiculo: tipoVeiculo ?? this.tipoVeiculo,
      entradaEpoch: entradaEpoch ?? this.entradaEpoch,
      saidaEpoch: saidaEpoch ?? this.saidaEpoch,
      valorCalculado: valorCalculado ?? this.valorCalculado,
      valorCobrado: valorCobrado ?? this.valorCobrado,
      formaPagamento: formaPagamento ?? this.formaPagamento,
      motivoIsencao: motivoIsencao ?? this.motivoIsencao,
      status: status ?? this.status,
      operadorId: operadorId ?? this.operadorId,
      caixaSessaoId: caixaSessaoId ?? this.caixaSessaoId,
      tabelaPrecoId: tabelaPrecoId ?? this.tabelaPrecoId,
      clienteId: clienteId ?? this.clienteId,
      planoId: planoId ?? this.planoId,
      origem: origem ?? this.origem,
      atk: atk ?? this.atk,
      itk: itk ?? this.itk,
      authorizationCode: authorizationCode ?? this.authorizationCode,
      brand: brand ?? this.brand,
      cardPan: cardPan ?? this.cardPan,
      installments: installments ?? this.installments,
      paymentProcessor: paymentProcessor ?? this.paymentProcessor,
      fotoEntradaPath: fotoEntradaPath ?? this.fotoEntradaPath,
      fotoEntradaEnviada: fotoEntradaEnviada ?? this.fotoEntradaEnviada,
      syncStatus: syncStatus ?? this.syncStatus,
      criadoEm: criadoEm ?? this.criadoEm,
      atualizadoEm: atualizadoEm ?? this.atualizadoEm,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operacaoId.present) {
      map['operacao_id'] = Variable<String>(operacaoId.value);
    }
    if (placa.present) {
      map['placa'] = Variable<String>(placa.value);
    }
    if (tipoVeiculo.present) {
      map['tipo_veiculo'] = Variable<String>(tipoVeiculo.value);
    }
    if (entradaEpoch.present) {
      map['entrada_epoch'] = Variable<int>(entradaEpoch.value);
    }
    if (saidaEpoch.present) {
      map['saida_epoch'] = Variable<int>(saidaEpoch.value);
    }
    if (valorCalculado.present) {
      map['valor_calculado'] = Variable<double>(valorCalculado.value);
    }
    if (valorCobrado.present) {
      map['valor_cobrado'] = Variable<double>(valorCobrado.value);
    }
    if (formaPagamento.present) {
      map['forma_pagamento'] = Variable<String>(formaPagamento.value);
    }
    if (motivoIsencao.present) {
      map['motivo_isencao'] = Variable<String>(motivoIsencao.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (operadorId.present) {
      map['operador_id'] = Variable<String>(operadorId.value);
    }
    if (caixaSessaoId.present) {
      map['caixa_sessao_id'] = Variable<String>(caixaSessaoId.value);
    }
    if (tabelaPrecoId.present) {
      map['tabela_preco_id'] = Variable<String>(tabelaPrecoId.value);
    }
    if (clienteId.present) {
      map['cliente_id'] = Variable<String>(clienteId.value);
    }
    if (planoId.present) {
      map['plano_id'] = Variable<String>(planoId.value);
    }
    if (origem.present) {
      map['origem'] = Variable<String>(origem.value);
    }
    if (atk.present) {
      map['atk'] = Variable<String>(atk.value);
    }
    if (itk.present) {
      map['itk'] = Variable<String>(itk.value);
    }
    if (authorizationCode.present) {
      map['authorization_code'] = Variable<String>(authorizationCode.value);
    }
    if (brand.present) {
      map['brand'] = Variable<String>(brand.value);
    }
    if (cardPan.present) {
      map['card_pan'] = Variable<String>(cardPan.value);
    }
    if (installments.present) {
      map['installments'] = Variable<int>(installments.value);
    }
    if (paymentProcessor.present) {
      map['payment_processor'] = Variable<String>(paymentProcessor.value);
    }
    if (fotoEntradaPath.present) {
      map['foto_entrada_path'] = Variable<String>(fotoEntradaPath.value);
    }
    if (fotoEntradaEnviada.present) {
      map['foto_entrada_enviada'] = Variable<bool>(fotoEntradaEnviada.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (criadoEm.present) {
      map['criado_em'] = Variable<int>(criadoEm.value);
    }
    if (atualizadoEm.present) {
      map['atualizado_em'] = Variable<int>(atualizadoEm.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TicketsCompanion(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('placa: $placa, ')
          ..write('tipoVeiculo: $tipoVeiculo, ')
          ..write('entradaEpoch: $entradaEpoch, ')
          ..write('saidaEpoch: $saidaEpoch, ')
          ..write('valorCalculado: $valorCalculado, ')
          ..write('valorCobrado: $valorCobrado, ')
          ..write('formaPagamento: $formaPagamento, ')
          ..write('motivoIsencao: $motivoIsencao, ')
          ..write('status: $status, ')
          ..write('operadorId: $operadorId, ')
          ..write('caixaSessaoId: $caixaSessaoId, ')
          ..write('tabelaPrecoId: $tabelaPrecoId, ')
          ..write('clienteId: $clienteId, ')
          ..write('planoId: $planoId, ')
          ..write('origem: $origem, ')
          ..write('atk: $atk, ')
          ..write('itk: $itk, ')
          ..write('authorizationCode: $authorizationCode, ')
          ..write('brand: $brand, ')
          ..write('cardPan: $cardPan, ')
          ..write('installments: $installments, ')
          ..write('paymentProcessor: $paymentProcessor, ')
          ..write('fotoEntradaPath: $fotoEntradaPath, ')
          ..write('fotoEntradaEnviada: $fotoEntradaEnviada, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('criadoEm: $criadoEm, ')
          ..write('atualizadoEm: $atualizadoEm, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CaixaSessoesTable extends CaixaSessoes
    with TableInfo<$CaixaSessoesTable, CaixaSessoe> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CaixaSessoesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operacaoIdMeta = const VerificationMeta(
    'operacaoId',
  );
  @override
  late final GeneratedColumn<String> operacaoId = GeneratedColumn<String>(
    'operacao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operadorIdMeta = const VerificationMeta(
    'operadorId',
  );
  @override
  late final GeneratedColumn<String> operadorId = GeneratedColumn<String>(
    'operador_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operadorNomeMeta = const VerificationMeta(
    'operadorNome',
  );
  @override
  late final GeneratedColumn<String> operadorNome = GeneratedColumn<String>(
    'operador_nome',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fundoCaixaMeta = const VerificationMeta(
    'fundoCaixa',
  );
  @override
  late final GeneratedColumn<double> fundoCaixa = GeneratedColumn<double>(
    'fundo_caixa',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _totalEntradasMeta = const VerificationMeta(
    'totalEntradas',
  );
  @override
  late final GeneratedColumn<double> totalEntradas = GeneratedColumn<double>(
    'total_entradas',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _totalSangriasMeta = const VerificationMeta(
    'totalSangrias',
  );
  @override
  late final GeneratedColumn<double> totalSangrias = GeneratedColumn<double>(
    'total_sangrias',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _totalFechamentoMeta = const VerificationMeta(
    'totalFechamento',
  );
  @override
  late final GeneratedColumn<double> totalFechamento = GeneratedColumn<double>(
    'total_fechamento',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('aberta'),
  );
  static const VerificationMeta _aberturaEpochMeta = const VerificationMeta(
    'aberturaEpoch',
  );
  @override
  late final GeneratedColumn<int> aberturaEpoch = GeneratedColumn<int>(
    'abertura_epoch',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fechamentoEpochMeta = const VerificationMeta(
    'fechamentoEpoch',
  );
  @override
  late final GeneratedColumn<int> fechamentoEpoch = GeneratedColumn<int>(
    'fechamento_epoch',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _observacaoFechamentoMeta =
      const VerificationMeta('observacaoFechamento');
  @override
  late final GeneratedColumn<String> observacaoFechamento =
      GeneratedColumn<String>(
        'observacao_fechamento',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pendente'),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    operacaoId,
    operadorId,
    operadorNome,
    fundoCaixa,
    totalEntradas,
    totalSangrias,
    totalFechamento,
    status,
    aberturaEpoch,
    fechamentoEpoch,
    observacaoFechamento,
    syncStatus,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'caixa_sessoes';
  @override
  VerificationContext validateIntegrity(
    Insertable<CaixaSessoe> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('operacao_id')) {
      context.handle(
        _operacaoIdMeta,
        operacaoId.isAcceptableOrUnknown(data['operacao_id']!, _operacaoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoIdMeta);
    }
    if (data.containsKey('operador_id')) {
      context.handle(
        _operadorIdMeta,
        operadorId.isAcceptableOrUnknown(data['operador_id']!, _operadorIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operadorIdMeta);
    }
    if (data.containsKey('operador_nome')) {
      context.handle(
        _operadorNomeMeta,
        operadorNome.isAcceptableOrUnknown(
          data['operador_nome']!,
          _operadorNomeMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_operadorNomeMeta);
    }
    if (data.containsKey('fundo_caixa')) {
      context.handle(
        _fundoCaixaMeta,
        fundoCaixa.isAcceptableOrUnknown(data['fundo_caixa']!, _fundoCaixaMeta),
      );
    } else if (isInserting) {
      context.missing(_fundoCaixaMeta);
    }
    if (data.containsKey('total_entradas')) {
      context.handle(
        _totalEntradasMeta,
        totalEntradas.isAcceptableOrUnknown(
          data['total_entradas']!,
          _totalEntradasMeta,
        ),
      );
    }
    if (data.containsKey('total_sangrias')) {
      context.handle(
        _totalSangriasMeta,
        totalSangrias.isAcceptableOrUnknown(
          data['total_sangrias']!,
          _totalSangriasMeta,
        ),
      );
    }
    if (data.containsKey('total_fechamento')) {
      context.handle(
        _totalFechamentoMeta,
        totalFechamento.isAcceptableOrUnknown(
          data['total_fechamento']!,
          _totalFechamentoMeta,
        ),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('abertura_epoch')) {
      context.handle(
        _aberturaEpochMeta,
        aberturaEpoch.isAcceptableOrUnknown(
          data['abertura_epoch']!,
          _aberturaEpochMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_aberturaEpochMeta);
    }
    if (data.containsKey('fechamento_epoch')) {
      context.handle(
        _fechamentoEpochMeta,
        fechamentoEpoch.isAcceptableOrUnknown(
          data['fechamento_epoch']!,
          _fechamentoEpochMeta,
        ),
      );
    }
    if (data.containsKey('observacao_fechamento')) {
      context.handle(
        _observacaoFechamentoMeta,
        observacaoFechamento.isAcceptableOrUnknown(
          data['observacao_fechamento']!,
          _observacaoFechamentoMeta,
        ),
      );
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CaixaSessoe map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CaixaSessoe(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      operacaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao_id'],
      )!,
      operadorId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operador_id'],
      )!,
      operadorNome: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operador_nome'],
      )!,
      fundoCaixa: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}fundo_caixa'],
      )!,
      totalEntradas: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}total_entradas'],
      )!,
      totalSangrias: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}total_sangrias'],
      )!,
      totalFechamento: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}total_fechamento'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      aberturaEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}abertura_epoch'],
      )!,
      fechamentoEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}fechamento_epoch'],
      ),
      observacaoFechamento: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}observacao_fechamento'],
      ),
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
    );
  }

  @override
  $CaixaSessoesTable createAlias(String alias) {
    return $CaixaSessoesTable(attachedDatabase, alias);
  }
}

class CaixaSessoe extends DataClass implements Insertable<CaixaSessoe> {
  final String id;
  final String operacaoId;
  final String operadorId;
  final String operadorNome;
  final double fundoCaixa;
  final double totalEntradas;
  final double totalSangrias;
  final double? totalFechamento;
  final String status;
  final int aberturaEpoch;
  final int? fechamentoEpoch;
  final String? observacaoFechamento;
  final String syncStatus;
  const CaixaSessoe({
    required this.id,
    required this.operacaoId,
    required this.operadorId,
    required this.operadorNome,
    required this.fundoCaixa,
    required this.totalEntradas,
    required this.totalSangrias,
    this.totalFechamento,
    required this.status,
    required this.aberturaEpoch,
    this.fechamentoEpoch,
    this.observacaoFechamento,
    required this.syncStatus,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operacao_id'] = Variable<String>(operacaoId);
    map['operador_id'] = Variable<String>(operadorId);
    map['operador_nome'] = Variable<String>(operadorNome);
    map['fundo_caixa'] = Variable<double>(fundoCaixa);
    map['total_entradas'] = Variable<double>(totalEntradas);
    map['total_sangrias'] = Variable<double>(totalSangrias);
    if (!nullToAbsent || totalFechamento != null) {
      map['total_fechamento'] = Variable<double>(totalFechamento);
    }
    map['status'] = Variable<String>(status);
    map['abertura_epoch'] = Variable<int>(aberturaEpoch);
    if (!nullToAbsent || fechamentoEpoch != null) {
      map['fechamento_epoch'] = Variable<int>(fechamentoEpoch);
    }
    if (!nullToAbsent || observacaoFechamento != null) {
      map['observacao_fechamento'] = Variable<String>(observacaoFechamento);
    }
    map['sync_status'] = Variable<String>(syncStatus);
    return map;
  }

  CaixaSessoesCompanion toCompanion(bool nullToAbsent) {
    return CaixaSessoesCompanion(
      id: Value(id),
      operacaoId: Value(operacaoId),
      operadorId: Value(operadorId),
      operadorNome: Value(operadorNome),
      fundoCaixa: Value(fundoCaixa),
      totalEntradas: Value(totalEntradas),
      totalSangrias: Value(totalSangrias),
      totalFechamento: totalFechamento == null && nullToAbsent
          ? const Value.absent()
          : Value(totalFechamento),
      status: Value(status),
      aberturaEpoch: Value(aberturaEpoch),
      fechamentoEpoch: fechamentoEpoch == null && nullToAbsent
          ? const Value.absent()
          : Value(fechamentoEpoch),
      observacaoFechamento: observacaoFechamento == null && nullToAbsent
          ? const Value.absent()
          : Value(observacaoFechamento),
      syncStatus: Value(syncStatus),
    );
  }

  factory CaixaSessoe.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CaixaSessoe(
      id: serializer.fromJson<String>(json['id']),
      operacaoId: serializer.fromJson<String>(json['operacaoId']),
      operadorId: serializer.fromJson<String>(json['operadorId']),
      operadorNome: serializer.fromJson<String>(json['operadorNome']),
      fundoCaixa: serializer.fromJson<double>(json['fundoCaixa']),
      totalEntradas: serializer.fromJson<double>(json['totalEntradas']),
      totalSangrias: serializer.fromJson<double>(json['totalSangrias']),
      totalFechamento: serializer.fromJson<double?>(json['totalFechamento']),
      status: serializer.fromJson<String>(json['status']),
      aberturaEpoch: serializer.fromJson<int>(json['aberturaEpoch']),
      fechamentoEpoch: serializer.fromJson<int?>(json['fechamentoEpoch']),
      observacaoFechamento: serializer.fromJson<String?>(
        json['observacaoFechamento'],
      ),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operacaoId': serializer.toJson<String>(operacaoId),
      'operadorId': serializer.toJson<String>(operadorId),
      'operadorNome': serializer.toJson<String>(operadorNome),
      'fundoCaixa': serializer.toJson<double>(fundoCaixa),
      'totalEntradas': serializer.toJson<double>(totalEntradas),
      'totalSangrias': serializer.toJson<double>(totalSangrias),
      'totalFechamento': serializer.toJson<double?>(totalFechamento),
      'status': serializer.toJson<String>(status),
      'aberturaEpoch': serializer.toJson<int>(aberturaEpoch),
      'fechamentoEpoch': serializer.toJson<int?>(fechamentoEpoch),
      'observacaoFechamento': serializer.toJson<String?>(observacaoFechamento),
      'syncStatus': serializer.toJson<String>(syncStatus),
    };
  }

  CaixaSessoe copyWith({
    String? id,
    String? operacaoId,
    String? operadorId,
    String? operadorNome,
    double? fundoCaixa,
    double? totalEntradas,
    double? totalSangrias,
    Value<double?> totalFechamento = const Value.absent(),
    String? status,
    int? aberturaEpoch,
    Value<int?> fechamentoEpoch = const Value.absent(),
    Value<String?> observacaoFechamento = const Value.absent(),
    String? syncStatus,
  }) => CaixaSessoe(
    id: id ?? this.id,
    operacaoId: operacaoId ?? this.operacaoId,
    operadorId: operadorId ?? this.operadorId,
    operadorNome: operadorNome ?? this.operadorNome,
    fundoCaixa: fundoCaixa ?? this.fundoCaixa,
    totalEntradas: totalEntradas ?? this.totalEntradas,
    totalSangrias: totalSangrias ?? this.totalSangrias,
    totalFechamento: totalFechamento.present
        ? totalFechamento.value
        : this.totalFechamento,
    status: status ?? this.status,
    aberturaEpoch: aberturaEpoch ?? this.aberturaEpoch,
    fechamentoEpoch: fechamentoEpoch.present
        ? fechamentoEpoch.value
        : this.fechamentoEpoch,
    observacaoFechamento: observacaoFechamento.present
        ? observacaoFechamento.value
        : this.observacaoFechamento,
    syncStatus: syncStatus ?? this.syncStatus,
  );
  CaixaSessoe copyWithCompanion(CaixaSessoesCompanion data) {
    return CaixaSessoe(
      id: data.id.present ? data.id.value : this.id,
      operacaoId: data.operacaoId.present
          ? data.operacaoId.value
          : this.operacaoId,
      operadorId: data.operadorId.present
          ? data.operadorId.value
          : this.operadorId,
      operadorNome: data.operadorNome.present
          ? data.operadorNome.value
          : this.operadorNome,
      fundoCaixa: data.fundoCaixa.present
          ? data.fundoCaixa.value
          : this.fundoCaixa,
      totalEntradas: data.totalEntradas.present
          ? data.totalEntradas.value
          : this.totalEntradas,
      totalSangrias: data.totalSangrias.present
          ? data.totalSangrias.value
          : this.totalSangrias,
      totalFechamento: data.totalFechamento.present
          ? data.totalFechamento.value
          : this.totalFechamento,
      status: data.status.present ? data.status.value : this.status,
      aberturaEpoch: data.aberturaEpoch.present
          ? data.aberturaEpoch.value
          : this.aberturaEpoch,
      fechamentoEpoch: data.fechamentoEpoch.present
          ? data.fechamentoEpoch.value
          : this.fechamentoEpoch,
      observacaoFechamento: data.observacaoFechamento.present
          ? data.observacaoFechamento.value
          : this.observacaoFechamento,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CaixaSessoe(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('operadorId: $operadorId, ')
          ..write('operadorNome: $operadorNome, ')
          ..write('fundoCaixa: $fundoCaixa, ')
          ..write('totalEntradas: $totalEntradas, ')
          ..write('totalSangrias: $totalSangrias, ')
          ..write('totalFechamento: $totalFechamento, ')
          ..write('status: $status, ')
          ..write('aberturaEpoch: $aberturaEpoch, ')
          ..write('fechamentoEpoch: $fechamentoEpoch, ')
          ..write('observacaoFechamento: $observacaoFechamento, ')
          ..write('syncStatus: $syncStatus')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    operacaoId,
    operadorId,
    operadorNome,
    fundoCaixa,
    totalEntradas,
    totalSangrias,
    totalFechamento,
    status,
    aberturaEpoch,
    fechamentoEpoch,
    observacaoFechamento,
    syncStatus,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CaixaSessoe &&
          other.id == this.id &&
          other.operacaoId == this.operacaoId &&
          other.operadorId == this.operadorId &&
          other.operadorNome == this.operadorNome &&
          other.fundoCaixa == this.fundoCaixa &&
          other.totalEntradas == this.totalEntradas &&
          other.totalSangrias == this.totalSangrias &&
          other.totalFechamento == this.totalFechamento &&
          other.status == this.status &&
          other.aberturaEpoch == this.aberturaEpoch &&
          other.fechamentoEpoch == this.fechamentoEpoch &&
          other.observacaoFechamento == this.observacaoFechamento &&
          other.syncStatus == this.syncStatus);
}

class CaixaSessoesCompanion extends UpdateCompanion<CaixaSessoe> {
  final Value<String> id;
  final Value<String> operacaoId;
  final Value<String> operadorId;
  final Value<String> operadorNome;
  final Value<double> fundoCaixa;
  final Value<double> totalEntradas;
  final Value<double> totalSangrias;
  final Value<double?> totalFechamento;
  final Value<String> status;
  final Value<int> aberturaEpoch;
  final Value<int?> fechamentoEpoch;
  final Value<String?> observacaoFechamento;
  final Value<String> syncStatus;
  final Value<int> rowid;
  const CaixaSessoesCompanion({
    this.id = const Value.absent(),
    this.operacaoId = const Value.absent(),
    this.operadorId = const Value.absent(),
    this.operadorNome = const Value.absent(),
    this.fundoCaixa = const Value.absent(),
    this.totalEntradas = const Value.absent(),
    this.totalSangrias = const Value.absent(),
    this.totalFechamento = const Value.absent(),
    this.status = const Value.absent(),
    this.aberturaEpoch = const Value.absent(),
    this.fechamentoEpoch = const Value.absent(),
    this.observacaoFechamento = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CaixaSessoesCompanion.insert({
    required String id,
    required String operacaoId,
    required String operadorId,
    required String operadorNome,
    required double fundoCaixa,
    this.totalEntradas = const Value.absent(),
    this.totalSangrias = const Value.absent(),
    this.totalFechamento = const Value.absent(),
    this.status = const Value.absent(),
    required int aberturaEpoch,
    this.fechamentoEpoch = const Value.absent(),
    this.observacaoFechamento = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       operacaoId = Value(operacaoId),
       operadorId = Value(operadorId),
       operadorNome = Value(operadorNome),
       fundoCaixa = Value(fundoCaixa),
       aberturaEpoch = Value(aberturaEpoch);
  static Insertable<CaixaSessoe> custom({
    Expression<String>? id,
    Expression<String>? operacaoId,
    Expression<String>? operadorId,
    Expression<String>? operadorNome,
    Expression<double>? fundoCaixa,
    Expression<double>? totalEntradas,
    Expression<double>? totalSangrias,
    Expression<double>? totalFechamento,
    Expression<String>? status,
    Expression<int>? aberturaEpoch,
    Expression<int>? fechamentoEpoch,
    Expression<String>? observacaoFechamento,
    Expression<String>? syncStatus,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operacaoId != null) 'operacao_id': operacaoId,
      if (operadorId != null) 'operador_id': operadorId,
      if (operadorNome != null) 'operador_nome': operadorNome,
      if (fundoCaixa != null) 'fundo_caixa': fundoCaixa,
      if (totalEntradas != null) 'total_entradas': totalEntradas,
      if (totalSangrias != null) 'total_sangrias': totalSangrias,
      if (totalFechamento != null) 'total_fechamento': totalFechamento,
      if (status != null) 'status': status,
      if (aberturaEpoch != null) 'abertura_epoch': aberturaEpoch,
      if (fechamentoEpoch != null) 'fechamento_epoch': fechamentoEpoch,
      if (observacaoFechamento != null)
        'observacao_fechamento': observacaoFechamento,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CaixaSessoesCompanion copyWith({
    Value<String>? id,
    Value<String>? operacaoId,
    Value<String>? operadorId,
    Value<String>? operadorNome,
    Value<double>? fundoCaixa,
    Value<double>? totalEntradas,
    Value<double>? totalSangrias,
    Value<double?>? totalFechamento,
    Value<String>? status,
    Value<int>? aberturaEpoch,
    Value<int?>? fechamentoEpoch,
    Value<String?>? observacaoFechamento,
    Value<String>? syncStatus,
    Value<int>? rowid,
  }) {
    return CaixaSessoesCompanion(
      id: id ?? this.id,
      operacaoId: operacaoId ?? this.operacaoId,
      operadorId: operadorId ?? this.operadorId,
      operadorNome: operadorNome ?? this.operadorNome,
      fundoCaixa: fundoCaixa ?? this.fundoCaixa,
      totalEntradas: totalEntradas ?? this.totalEntradas,
      totalSangrias: totalSangrias ?? this.totalSangrias,
      totalFechamento: totalFechamento ?? this.totalFechamento,
      status: status ?? this.status,
      aberturaEpoch: aberturaEpoch ?? this.aberturaEpoch,
      fechamentoEpoch: fechamentoEpoch ?? this.fechamentoEpoch,
      observacaoFechamento: observacaoFechamento ?? this.observacaoFechamento,
      syncStatus: syncStatus ?? this.syncStatus,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operacaoId.present) {
      map['operacao_id'] = Variable<String>(operacaoId.value);
    }
    if (operadorId.present) {
      map['operador_id'] = Variable<String>(operadorId.value);
    }
    if (operadorNome.present) {
      map['operador_nome'] = Variable<String>(operadorNome.value);
    }
    if (fundoCaixa.present) {
      map['fundo_caixa'] = Variable<double>(fundoCaixa.value);
    }
    if (totalEntradas.present) {
      map['total_entradas'] = Variable<double>(totalEntradas.value);
    }
    if (totalSangrias.present) {
      map['total_sangrias'] = Variable<double>(totalSangrias.value);
    }
    if (totalFechamento.present) {
      map['total_fechamento'] = Variable<double>(totalFechamento.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (aberturaEpoch.present) {
      map['abertura_epoch'] = Variable<int>(aberturaEpoch.value);
    }
    if (fechamentoEpoch.present) {
      map['fechamento_epoch'] = Variable<int>(fechamentoEpoch.value);
    }
    if (observacaoFechamento.present) {
      map['observacao_fechamento'] = Variable<String>(
        observacaoFechamento.value,
      );
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CaixaSessoesCompanion(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('operadorId: $operadorId, ')
          ..write('operadorNome: $operadorNome, ')
          ..write('fundoCaixa: $fundoCaixa, ')
          ..write('totalEntradas: $totalEntradas, ')
          ..write('totalSangrias: $totalSangrias, ')
          ..write('totalFechamento: $totalFechamento, ')
          ..write('status: $status, ')
          ..write('aberturaEpoch: $aberturaEpoch, ')
          ..write('fechamentoEpoch: $fechamentoEpoch, ')
          ..write('observacaoFechamento: $observacaoFechamento, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CaixaMovimentosTable extends CaixaMovimentos
    with TableInfo<$CaixaMovimentosTable, CaixaMovimento> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CaixaMovimentosTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _caixaSessaoIdMeta = const VerificationMeta(
    'caixaSessaoId',
  );
  @override
  late final GeneratedColumn<String> caixaSessaoId = GeneratedColumn<String>(
    'caixa_sessao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tipoMeta = const VerificationMeta('tipo');
  @override
  late final GeneratedColumn<String> tipo = GeneratedColumn<String>(
    'tipo',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valorMeta = const VerificationMeta('valor');
  @override
  late final GeneratedColumn<double> valor = GeneratedColumn<double>(
    'valor',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descricaoMeta = const VerificationMeta(
    'descricao',
  );
  @override
  late final GeneratedColumn<String> descricao = GeneratedColumn<String>(
    'descricao',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ticketIdMeta = const VerificationMeta(
    'ticketId',
  );
  @override
  late final GeneratedColumn<String> ticketId = GeneratedColumn<String>(
    'ticket_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _formaPagamentoMeta = const VerificationMeta(
    'formaPagamento',
  );
  @override
  late final GeneratedColumn<String> formaPagamento = GeneratedColumn<String>(
    'forma_pagamento',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _criadoEmMeta = const VerificationMeta(
    'criadoEm',
  );
  @override
  late final GeneratedColumn<int> criadoEm = GeneratedColumn<int>(
    'criado_em',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pendente'),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    caixaSessaoId,
    tipo,
    valor,
    descricao,
    ticketId,
    formaPagamento,
    criadoEm,
    syncStatus,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'caixa_movimentos';
  @override
  VerificationContext validateIntegrity(
    Insertable<CaixaMovimento> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('caixa_sessao_id')) {
      context.handle(
        _caixaSessaoIdMeta,
        caixaSessaoId.isAcceptableOrUnknown(
          data['caixa_sessao_id']!,
          _caixaSessaoIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_caixaSessaoIdMeta);
    }
    if (data.containsKey('tipo')) {
      context.handle(
        _tipoMeta,
        tipo.isAcceptableOrUnknown(data['tipo']!, _tipoMeta),
      );
    } else if (isInserting) {
      context.missing(_tipoMeta);
    }
    if (data.containsKey('valor')) {
      context.handle(
        _valorMeta,
        valor.isAcceptableOrUnknown(data['valor']!, _valorMeta),
      );
    } else if (isInserting) {
      context.missing(_valorMeta);
    }
    if (data.containsKey('descricao')) {
      context.handle(
        _descricaoMeta,
        descricao.isAcceptableOrUnknown(data['descricao']!, _descricaoMeta),
      );
    } else if (isInserting) {
      context.missing(_descricaoMeta);
    }
    if (data.containsKey('ticket_id')) {
      context.handle(
        _ticketIdMeta,
        ticketId.isAcceptableOrUnknown(data['ticket_id']!, _ticketIdMeta),
      );
    }
    if (data.containsKey('forma_pagamento')) {
      context.handle(
        _formaPagamentoMeta,
        formaPagamento.isAcceptableOrUnknown(
          data['forma_pagamento']!,
          _formaPagamentoMeta,
        ),
      );
    }
    if (data.containsKey('criado_em')) {
      context.handle(
        _criadoEmMeta,
        criadoEm.isAcceptableOrUnknown(data['criado_em']!, _criadoEmMeta),
      );
    } else if (isInserting) {
      context.missing(_criadoEmMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CaixaMovimento map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CaixaMovimento(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      caixaSessaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}caixa_sessao_id'],
      )!,
      tipo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo'],
      )!,
      valor: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor'],
      )!,
      descricao: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descricao'],
      )!,
      ticketId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ticket_id'],
      ),
      formaPagamento: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}forma_pagamento'],
      ),
      criadoEm: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}criado_em'],
      )!,
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
    );
  }

  @override
  $CaixaMovimentosTable createAlias(String alias) {
    return $CaixaMovimentosTable(attachedDatabase, alias);
  }
}

class CaixaMovimento extends DataClass implements Insertable<CaixaMovimento> {
  final String id;
  final String caixaSessaoId;
  final String tipo;
  final double valor;
  final String descricao;
  final String? ticketId;
  final String? formaPagamento;
  final int criadoEm;
  final String syncStatus;
  const CaixaMovimento({
    required this.id,
    required this.caixaSessaoId,
    required this.tipo,
    required this.valor,
    required this.descricao,
    this.ticketId,
    this.formaPagamento,
    required this.criadoEm,
    required this.syncStatus,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['caixa_sessao_id'] = Variable<String>(caixaSessaoId);
    map['tipo'] = Variable<String>(tipo);
    map['valor'] = Variable<double>(valor);
    map['descricao'] = Variable<String>(descricao);
    if (!nullToAbsent || ticketId != null) {
      map['ticket_id'] = Variable<String>(ticketId);
    }
    if (!nullToAbsent || formaPagamento != null) {
      map['forma_pagamento'] = Variable<String>(formaPagamento);
    }
    map['criado_em'] = Variable<int>(criadoEm);
    map['sync_status'] = Variable<String>(syncStatus);
    return map;
  }

  CaixaMovimentosCompanion toCompanion(bool nullToAbsent) {
    return CaixaMovimentosCompanion(
      id: Value(id),
      caixaSessaoId: Value(caixaSessaoId),
      tipo: Value(tipo),
      valor: Value(valor),
      descricao: Value(descricao),
      ticketId: ticketId == null && nullToAbsent
          ? const Value.absent()
          : Value(ticketId),
      formaPagamento: formaPagamento == null && nullToAbsent
          ? const Value.absent()
          : Value(formaPagamento),
      criadoEm: Value(criadoEm),
      syncStatus: Value(syncStatus),
    );
  }

  factory CaixaMovimento.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CaixaMovimento(
      id: serializer.fromJson<String>(json['id']),
      caixaSessaoId: serializer.fromJson<String>(json['caixaSessaoId']),
      tipo: serializer.fromJson<String>(json['tipo']),
      valor: serializer.fromJson<double>(json['valor']),
      descricao: serializer.fromJson<String>(json['descricao']),
      ticketId: serializer.fromJson<String?>(json['ticketId']),
      formaPagamento: serializer.fromJson<String?>(json['formaPagamento']),
      criadoEm: serializer.fromJson<int>(json['criadoEm']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'caixaSessaoId': serializer.toJson<String>(caixaSessaoId),
      'tipo': serializer.toJson<String>(tipo),
      'valor': serializer.toJson<double>(valor),
      'descricao': serializer.toJson<String>(descricao),
      'ticketId': serializer.toJson<String?>(ticketId),
      'formaPagamento': serializer.toJson<String?>(formaPagamento),
      'criadoEm': serializer.toJson<int>(criadoEm),
      'syncStatus': serializer.toJson<String>(syncStatus),
    };
  }

  CaixaMovimento copyWith({
    String? id,
    String? caixaSessaoId,
    String? tipo,
    double? valor,
    String? descricao,
    Value<String?> ticketId = const Value.absent(),
    Value<String?> formaPagamento = const Value.absent(),
    int? criadoEm,
    String? syncStatus,
  }) => CaixaMovimento(
    id: id ?? this.id,
    caixaSessaoId: caixaSessaoId ?? this.caixaSessaoId,
    tipo: tipo ?? this.tipo,
    valor: valor ?? this.valor,
    descricao: descricao ?? this.descricao,
    ticketId: ticketId.present ? ticketId.value : this.ticketId,
    formaPagamento: formaPagamento.present
        ? formaPagamento.value
        : this.formaPagamento,
    criadoEm: criadoEm ?? this.criadoEm,
    syncStatus: syncStatus ?? this.syncStatus,
  );
  CaixaMovimento copyWithCompanion(CaixaMovimentosCompanion data) {
    return CaixaMovimento(
      id: data.id.present ? data.id.value : this.id,
      caixaSessaoId: data.caixaSessaoId.present
          ? data.caixaSessaoId.value
          : this.caixaSessaoId,
      tipo: data.tipo.present ? data.tipo.value : this.tipo,
      valor: data.valor.present ? data.valor.value : this.valor,
      descricao: data.descricao.present ? data.descricao.value : this.descricao,
      ticketId: data.ticketId.present ? data.ticketId.value : this.ticketId,
      formaPagamento: data.formaPagamento.present
          ? data.formaPagamento.value
          : this.formaPagamento,
      criadoEm: data.criadoEm.present ? data.criadoEm.value : this.criadoEm,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CaixaMovimento(')
          ..write('id: $id, ')
          ..write('caixaSessaoId: $caixaSessaoId, ')
          ..write('tipo: $tipo, ')
          ..write('valor: $valor, ')
          ..write('descricao: $descricao, ')
          ..write('ticketId: $ticketId, ')
          ..write('formaPagamento: $formaPagamento, ')
          ..write('criadoEm: $criadoEm, ')
          ..write('syncStatus: $syncStatus')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    caixaSessaoId,
    tipo,
    valor,
    descricao,
    ticketId,
    formaPagamento,
    criadoEm,
    syncStatus,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CaixaMovimento &&
          other.id == this.id &&
          other.caixaSessaoId == this.caixaSessaoId &&
          other.tipo == this.tipo &&
          other.valor == this.valor &&
          other.descricao == this.descricao &&
          other.ticketId == this.ticketId &&
          other.formaPagamento == this.formaPagamento &&
          other.criadoEm == this.criadoEm &&
          other.syncStatus == this.syncStatus);
}

class CaixaMovimentosCompanion extends UpdateCompanion<CaixaMovimento> {
  final Value<String> id;
  final Value<String> caixaSessaoId;
  final Value<String> tipo;
  final Value<double> valor;
  final Value<String> descricao;
  final Value<String?> ticketId;
  final Value<String?> formaPagamento;
  final Value<int> criadoEm;
  final Value<String> syncStatus;
  final Value<int> rowid;
  const CaixaMovimentosCompanion({
    this.id = const Value.absent(),
    this.caixaSessaoId = const Value.absent(),
    this.tipo = const Value.absent(),
    this.valor = const Value.absent(),
    this.descricao = const Value.absent(),
    this.ticketId = const Value.absent(),
    this.formaPagamento = const Value.absent(),
    this.criadoEm = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CaixaMovimentosCompanion.insert({
    required String id,
    required String caixaSessaoId,
    required String tipo,
    required double valor,
    required String descricao,
    this.ticketId = const Value.absent(),
    this.formaPagamento = const Value.absent(),
    required int criadoEm,
    this.syncStatus = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       caixaSessaoId = Value(caixaSessaoId),
       tipo = Value(tipo),
       valor = Value(valor),
       descricao = Value(descricao),
       criadoEm = Value(criadoEm);
  static Insertable<CaixaMovimento> custom({
    Expression<String>? id,
    Expression<String>? caixaSessaoId,
    Expression<String>? tipo,
    Expression<double>? valor,
    Expression<String>? descricao,
    Expression<String>? ticketId,
    Expression<String>? formaPagamento,
    Expression<int>? criadoEm,
    Expression<String>? syncStatus,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (caixaSessaoId != null) 'caixa_sessao_id': caixaSessaoId,
      if (tipo != null) 'tipo': tipo,
      if (valor != null) 'valor': valor,
      if (descricao != null) 'descricao': descricao,
      if (ticketId != null) 'ticket_id': ticketId,
      if (formaPagamento != null) 'forma_pagamento': formaPagamento,
      if (criadoEm != null) 'criado_em': criadoEm,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CaixaMovimentosCompanion copyWith({
    Value<String>? id,
    Value<String>? caixaSessaoId,
    Value<String>? tipo,
    Value<double>? valor,
    Value<String>? descricao,
    Value<String?>? ticketId,
    Value<String?>? formaPagamento,
    Value<int>? criadoEm,
    Value<String>? syncStatus,
    Value<int>? rowid,
  }) {
    return CaixaMovimentosCompanion(
      id: id ?? this.id,
      caixaSessaoId: caixaSessaoId ?? this.caixaSessaoId,
      tipo: tipo ?? this.tipo,
      valor: valor ?? this.valor,
      descricao: descricao ?? this.descricao,
      ticketId: ticketId ?? this.ticketId,
      formaPagamento: formaPagamento ?? this.formaPagamento,
      criadoEm: criadoEm ?? this.criadoEm,
      syncStatus: syncStatus ?? this.syncStatus,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (caixaSessaoId.present) {
      map['caixa_sessao_id'] = Variable<String>(caixaSessaoId.value);
    }
    if (tipo.present) {
      map['tipo'] = Variable<String>(tipo.value);
    }
    if (valor.present) {
      map['valor'] = Variable<double>(valor.value);
    }
    if (descricao.present) {
      map['descricao'] = Variable<String>(descricao.value);
    }
    if (ticketId.present) {
      map['ticket_id'] = Variable<String>(ticketId.value);
    }
    if (formaPagamento.present) {
      map['forma_pagamento'] = Variable<String>(formaPagamento.value);
    }
    if (criadoEm.present) {
      map['criado_em'] = Variable<int>(criadoEm.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CaixaMovimentosCompanion(')
          ..write('id: $id, ')
          ..write('caixaSessaoId: $caixaSessaoId, ')
          ..write('tipo: $tipo, ')
          ..write('valor: $valor, ')
          ..write('descricao: $descricao, ')
          ..write('ticketId: $ticketId, ')
          ..write('formaPagamento: $formaPagamento, ')
          ..write('criadoEm: $criadoEm, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncLogTable extends SyncLog with TableInfo<$SyncLogTable, SyncLogData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncLogTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _entidadeMeta = const VerificationMeta(
    'entidade',
  );
  @override
  late final GeneratedColumn<String> entidade = GeneratedColumn<String>(
    'entidade',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _entidadeIdMeta = const VerificationMeta(
    'entidadeId',
  );
  @override
  late final GeneratedColumn<String> entidadeId = GeneratedColumn<String>(
    'entidade_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operacaoMeta = const VerificationMeta(
    'operacao',
  );
  @override
  late final GeneratedColumn<String> operacao = GeneratedColumn<String>(
    'operacao',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pendente'),
  );
  static const VerificationMeta _tentativasMeta = const VerificationMeta(
    'tentativas',
  );
  @override
  late final GeneratedColumn<int> tentativas = GeneratedColumn<int>(
    'tentativas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _proximaTentativaEpochMeta =
      const VerificationMeta('proximaTentativaEpoch');
  @override
  late final GeneratedColumn<int> proximaTentativaEpoch = GeneratedColumn<int>(
    'proxima_tentativa_epoch',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _erroUltimaTentativaMeta =
      const VerificationMeta('erroUltimaTentativa');
  @override
  late final GeneratedColumn<String> erroUltimaTentativa =
      GeneratedColumn<String>(
        'erro_ultima_tentativa',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _criadoEmMeta = const VerificationMeta(
    'criadoEm',
  );
  @override
  late final GeneratedColumn<int> criadoEm = GeneratedColumn<int>(
    'criado_em',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    entidade,
    entidadeId,
    operacao,
    payload,
    status,
    tentativas,
    proximaTentativaEpoch,
    erroUltimaTentativa,
    criadoEm,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_log';
  @override
  VerificationContext validateIntegrity(
    Insertable<SyncLogData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('entidade')) {
      context.handle(
        _entidadeMeta,
        entidade.isAcceptableOrUnknown(data['entidade']!, _entidadeMeta),
      );
    } else if (isInserting) {
      context.missing(_entidadeMeta);
    }
    if (data.containsKey('entidade_id')) {
      context.handle(
        _entidadeIdMeta,
        entidadeId.isAcceptableOrUnknown(data['entidade_id']!, _entidadeIdMeta),
      );
    } else if (isInserting) {
      context.missing(_entidadeIdMeta);
    }
    if (data.containsKey('operacao')) {
      context.handle(
        _operacaoMeta,
        operacao.isAcceptableOrUnknown(data['operacao']!, _operacaoMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('tentativas')) {
      context.handle(
        _tentativasMeta,
        tentativas.isAcceptableOrUnknown(data['tentativas']!, _tentativasMeta),
      );
    }
    if (data.containsKey('proxima_tentativa_epoch')) {
      context.handle(
        _proximaTentativaEpochMeta,
        proximaTentativaEpoch.isAcceptableOrUnknown(
          data['proxima_tentativa_epoch']!,
          _proximaTentativaEpochMeta,
        ),
      );
    }
    if (data.containsKey('erro_ultima_tentativa')) {
      context.handle(
        _erroUltimaTentativaMeta,
        erroUltimaTentativa.isAcceptableOrUnknown(
          data['erro_ultima_tentativa']!,
          _erroUltimaTentativaMeta,
        ),
      );
    }
    if (data.containsKey('criado_em')) {
      context.handle(
        _criadoEmMeta,
        criadoEm.isAcceptableOrUnknown(data['criado_em']!, _criadoEmMeta),
      );
    } else if (isInserting) {
      context.missing(_criadoEmMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncLogData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncLogData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      entidade: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entidade'],
      )!,
      entidadeId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entidade_id'],
      )!,
      operacao: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      tentativas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}tentativas'],
      )!,
      proximaTentativaEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}proxima_tentativa_epoch'],
      ),
      erroUltimaTentativa: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}erro_ultima_tentativa'],
      ),
      criadoEm: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}criado_em'],
      )!,
    );
  }

  @override
  $SyncLogTable createAlias(String alias) {
    return $SyncLogTable(attachedDatabase, alias);
  }
}

class SyncLogData extends DataClass implements Insertable<SyncLogData> {
  final int id;
  final String entidade;
  final String entidadeId;
  final String operacao;
  final String payload;
  final String status;
  final int tentativas;
  final int? proximaTentativaEpoch;
  final String? erroUltimaTentativa;
  final int criadoEm;
  const SyncLogData({
    required this.id,
    required this.entidade,
    required this.entidadeId,
    required this.operacao,
    required this.payload,
    required this.status,
    required this.tentativas,
    this.proximaTentativaEpoch,
    this.erroUltimaTentativa,
    required this.criadoEm,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['entidade'] = Variable<String>(entidade);
    map['entidade_id'] = Variable<String>(entidadeId);
    map['operacao'] = Variable<String>(operacao);
    map['payload'] = Variable<String>(payload);
    map['status'] = Variable<String>(status);
    map['tentativas'] = Variable<int>(tentativas);
    if (!nullToAbsent || proximaTentativaEpoch != null) {
      map['proxima_tentativa_epoch'] = Variable<int>(proximaTentativaEpoch);
    }
    if (!nullToAbsent || erroUltimaTentativa != null) {
      map['erro_ultima_tentativa'] = Variable<String>(erroUltimaTentativa);
    }
    map['criado_em'] = Variable<int>(criadoEm);
    return map;
  }

  SyncLogCompanion toCompanion(bool nullToAbsent) {
    return SyncLogCompanion(
      id: Value(id),
      entidade: Value(entidade),
      entidadeId: Value(entidadeId),
      operacao: Value(operacao),
      payload: Value(payload),
      status: Value(status),
      tentativas: Value(tentativas),
      proximaTentativaEpoch: proximaTentativaEpoch == null && nullToAbsent
          ? const Value.absent()
          : Value(proximaTentativaEpoch),
      erroUltimaTentativa: erroUltimaTentativa == null && nullToAbsent
          ? const Value.absent()
          : Value(erroUltimaTentativa),
      criadoEm: Value(criadoEm),
    );
  }

  factory SyncLogData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncLogData(
      id: serializer.fromJson<int>(json['id']),
      entidade: serializer.fromJson<String>(json['entidade']),
      entidadeId: serializer.fromJson<String>(json['entidadeId']),
      operacao: serializer.fromJson<String>(json['operacao']),
      payload: serializer.fromJson<String>(json['payload']),
      status: serializer.fromJson<String>(json['status']),
      tentativas: serializer.fromJson<int>(json['tentativas']),
      proximaTentativaEpoch: serializer.fromJson<int?>(
        json['proximaTentativaEpoch'],
      ),
      erroUltimaTentativa: serializer.fromJson<String?>(
        json['erroUltimaTentativa'],
      ),
      criadoEm: serializer.fromJson<int>(json['criadoEm']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'entidade': serializer.toJson<String>(entidade),
      'entidadeId': serializer.toJson<String>(entidadeId),
      'operacao': serializer.toJson<String>(operacao),
      'payload': serializer.toJson<String>(payload),
      'status': serializer.toJson<String>(status),
      'tentativas': serializer.toJson<int>(tentativas),
      'proximaTentativaEpoch': serializer.toJson<int?>(proximaTentativaEpoch),
      'erroUltimaTentativa': serializer.toJson<String?>(erroUltimaTentativa),
      'criadoEm': serializer.toJson<int>(criadoEm),
    };
  }

  SyncLogData copyWith({
    int? id,
    String? entidade,
    String? entidadeId,
    String? operacao,
    String? payload,
    String? status,
    int? tentativas,
    Value<int?> proximaTentativaEpoch = const Value.absent(),
    Value<String?> erroUltimaTentativa = const Value.absent(),
    int? criadoEm,
  }) => SyncLogData(
    id: id ?? this.id,
    entidade: entidade ?? this.entidade,
    entidadeId: entidadeId ?? this.entidadeId,
    operacao: operacao ?? this.operacao,
    payload: payload ?? this.payload,
    status: status ?? this.status,
    tentativas: tentativas ?? this.tentativas,
    proximaTentativaEpoch: proximaTentativaEpoch.present
        ? proximaTentativaEpoch.value
        : this.proximaTentativaEpoch,
    erroUltimaTentativa: erroUltimaTentativa.present
        ? erroUltimaTentativa.value
        : this.erroUltimaTentativa,
    criadoEm: criadoEm ?? this.criadoEm,
  );
  SyncLogData copyWithCompanion(SyncLogCompanion data) {
    return SyncLogData(
      id: data.id.present ? data.id.value : this.id,
      entidade: data.entidade.present ? data.entidade.value : this.entidade,
      entidadeId: data.entidadeId.present
          ? data.entidadeId.value
          : this.entidadeId,
      operacao: data.operacao.present ? data.operacao.value : this.operacao,
      payload: data.payload.present ? data.payload.value : this.payload,
      status: data.status.present ? data.status.value : this.status,
      tentativas: data.tentativas.present
          ? data.tentativas.value
          : this.tentativas,
      proximaTentativaEpoch: data.proximaTentativaEpoch.present
          ? data.proximaTentativaEpoch.value
          : this.proximaTentativaEpoch,
      erroUltimaTentativa: data.erroUltimaTentativa.present
          ? data.erroUltimaTentativa.value
          : this.erroUltimaTentativa,
      criadoEm: data.criadoEm.present ? data.criadoEm.value : this.criadoEm,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncLogData(')
          ..write('id: $id, ')
          ..write('entidade: $entidade, ')
          ..write('entidadeId: $entidadeId, ')
          ..write('operacao: $operacao, ')
          ..write('payload: $payload, ')
          ..write('status: $status, ')
          ..write('tentativas: $tentativas, ')
          ..write('proximaTentativaEpoch: $proximaTentativaEpoch, ')
          ..write('erroUltimaTentativa: $erroUltimaTentativa, ')
          ..write('criadoEm: $criadoEm')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    entidade,
    entidadeId,
    operacao,
    payload,
    status,
    tentativas,
    proximaTentativaEpoch,
    erroUltimaTentativa,
    criadoEm,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncLogData &&
          other.id == this.id &&
          other.entidade == this.entidade &&
          other.entidadeId == this.entidadeId &&
          other.operacao == this.operacao &&
          other.payload == this.payload &&
          other.status == this.status &&
          other.tentativas == this.tentativas &&
          other.proximaTentativaEpoch == this.proximaTentativaEpoch &&
          other.erroUltimaTentativa == this.erroUltimaTentativa &&
          other.criadoEm == this.criadoEm);
}

class SyncLogCompanion extends UpdateCompanion<SyncLogData> {
  final Value<int> id;
  final Value<String> entidade;
  final Value<String> entidadeId;
  final Value<String> operacao;
  final Value<String> payload;
  final Value<String> status;
  final Value<int> tentativas;
  final Value<int?> proximaTentativaEpoch;
  final Value<String?> erroUltimaTentativa;
  final Value<int> criadoEm;
  const SyncLogCompanion({
    this.id = const Value.absent(),
    this.entidade = const Value.absent(),
    this.entidadeId = const Value.absent(),
    this.operacao = const Value.absent(),
    this.payload = const Value.absent(),
    this.status = const Value.absent(),
    this.tentativas = const Value.absent(),
    this.proximaTentativaEpoch = const Value.absent(),
    this.erroUltimaTentativa = const Value.absent(),
    this.criadoEm = const Value.absent(),
  });
  SyncLogCompanion.insert({
    this.id = const Value.absent(),
    required String entidade,
    required String entidadeId,
    required String operacao,
    required String payload,
    this.status = const Value.absent(),
    this.tentativas = const Value.absent(),
    this.proximaTentativaEpoch = const Value.absent(),
    this.erroUltimaTentativa = const Value.absent(),
    required int criadoEm,
  }) : entidade = Value(entidade),
       entidadeId = Value(entidadeId),
       operacao = Value(operacao),
       payload = Value(payload),
       criadoEm = Value(criadoEm);
  static Insertable<SyncLogData> custom({
    Expression<int>? id,
    Expression<String>? entidade,
    Expression<String>? entidadeId,
    Expression<String>? operacao,
    Expression<String>? payload,
    Expression<String>? status,
    Expression<int>? tentativas,
    Expression<int>? proximaTentativaEpoch,
    Expression<String>? erroUltimaTentativa,
    Expression<int>? criadoEm,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (entidade != null) 'entidade': entidade,
      if (entidadeId != null) 'entidade_id': entidadeId,
      if (operacao != null) 'operacao': operacao,
      if (payload != null) 'payload': payload,
      if (status != null) 'status': status,
      if (tentativas != null) 'tentativas': tentativas,
      if (proximaTentativaEpoch != null)
        'proxima_tentativa_epoch': proximaTentativaEpoch,
      if (erroUltimaTentativa != null)
        'erro_ultima_tentativa': erroUltimaTentativa,
      if (criadoEm != null) 'criado_em': criadoEm,
    });
  }

  SyncLogCompanion copyWith({
    Value<int>? id,
    Value<String>? entidade,
    Value<String>? entidadeId,
    Value<String>? operacao,
    Value<String>? payload,
    Value<String>? status,
    Value<int>? tentativas,
    Value<int?>? proximaTentativaEpoch,
    Value<String?>? erroUltimaTentativa,
    Value<int>? criadoEm,
  }) {
    return SyncLogCompanion(
      id: id ?? this.id,
      entidade: entidade ?? this.entidade,
      entidadeId: entidadeId ?? this.entidadeId,
      operacao: operacao ?? this.operacao,
      payload: payload ?? this.payload,
      status: status ?? this.status,
      tentativas: tentativas ?? this.tentativas,
      proximaTentativaEpoch:
          proximaTentativaEpoch ?? this.proximaTentativaEpoch,
      erroUltimaTentativa: erroUltimaTentativa ?? this.erroUltimaTentativa,
      criadoEm: criadoEm ?? this.criadoEm,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (entidade.present) {
      map['entidade'] = Variable<String>(entidade.value);
    }
    if (entidadeId.present) {
      map['entidade_id'] = Variable<String>(entidadeId.value);
    }
    if (operacao.present) {
      map['operacao'] = Variable<String>(operacao.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (tentativas.present) {
      map['tentativas'] = Variable<int>(tentativas.value);
    }
    if (proximaTentativaEpoch.present) {
      map['proxima_tentativa_epoch'] = Variable<int>(
        proximaTentativaEpoch.value,
      );
    }
    if (erroUltimaTentativa.present) {
      map['erro_ultima_tentativa'] = Variable<String>(
        erroUltimaTentativa.value,
      );
    }
    if (criadoEm.present) {
      map['criado_em'] = Variable<int>(criadoEm.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncLogCompanion(')
          ..write('id: $id, ')
          ..write('entidade: $entidade, ')
          ..write('entidadeId: $entidadeId, ')
          ..write('operacao: $operacao, ')
          ..write('payload: $payload, ')
          ..write('status: $status, ')
          ..write('tentativas: $tentativas, ')
          ..write('proximaTentativaEpoch: $proximaTentativaEpoch, ')
          ..write('erroUltimaTentativa: $erroUltimaTentativa, ')
          ..write('criadoEm: $criadoEm')
          ..write(')'))
        .toString();
  }
}

class $PatioClientesTable extends PatioClientes
    with TableInfo<$PatioClientesTable, PatioCliente> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PatioClientesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operacaoIdMeta = const VerificationMeta(
    'operacaoId',
  );
  @override
  late final GeneratedColumn<String> operacaoId = GeneratedColumn<String>(
    'operacao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nomeMeta = const VerificationMeta('nome');
  @override
  late final GeneratedColumn<String> nome = GeneratedColumn<String>(
    'nome',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _planoIdMeta = const VerificationMeta(
    'planoId',
  );
  @override
  late final GeneratedColumn<String> planoId = GeneratedColumn<String>(
    'plano_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _planoNomeMeta = const VerificationMeta(
    'planoNome',
  );
  @override
  late final GeneratedColumn<String> planoNome = GeneratedColumn<String>(
    'plano_nome',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _planoTipoMeta = const VerificationMeta(
    'planoTipo',
  );
  @override
  late final GeneratedColumn<String> planoTipo = GeneratedColumn<String>(
    'plano_tipo',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _vagasMeta = const VerificationMeta('vagas');
  @override
  late final GeneratedColumn<int> vagas = GeneratedColumn<int>(
    'vagas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _vencimentoEpochMeta = const VerificationMeta(
    'vencimentoEpoch',
  );
  @override
  late final GeneratedColumn<int> vencimentoEpoch = GeneratedColumn<int>(
    'vencimento_epoch',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _bloqueadoMeta = const VerificationMeta(
    'bloqueado',
  );
  @override
  late final GeneratedColumn<bool> bloqueado = GeneratedColumn<bool>(
    'bloqueado',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("bloqueado" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    operacaoId,
    nome,
    planoId,
    planoNome,
    planoTipo,
    vagas,
    vencimentoEpoch,
    bloqueado,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'patio_clientes';
  @override
  VerificationContext validateIntegrity(
    Insertable<PatioCliente> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('operacao_id')) {
      context.handle(
        _operacaoIdMeta,
        operacaoId.isAcceptableOrUnknown(data['operacao_id']!, _operacaoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoIdMeta);
    }
    if (data.containsKey('nome')) {
      context.handle(
        _nomeMeta,
        nome.isAcceptableOrUnknown(data['nome']!, _nomeMeta),
      );
    } else if (isInserting) {
      context.missing(_nomeMeta);
    }
    if (data.containsKey('plano_id')) {
      context.handle(
        _planoIdMeta,
        planoId.isAcceptableOrUnknown(data['plano_id']!, _planoIdMeta),
      );
    }
    if (data.containsKey('plano_nome')) {
      context.handle(
        _planoNomeMeta,
        planoNome.isAcceptableOrUnknown(data['plano_nome']!, _planoNomeMeta),
      );
    }
    if (data.containsKey('plano_tipo')) {
      context.handle(
        _planoTipoMeta,
        planoTipo.isAcceptableOrUnknown(data['plano_tipo']!, _planoTipoMeta),
      );
    }
    if (data.containsKey('vagas')) {
      context.handle(
        _vagasMeta,
        vagas.isAcceptableOrUnknown(data['vagas']!, _vagasMeta),
      );
    }
    if (data.containsKey('vencimento_epoch')) {
      context.handle(
        _vencimentoEpochMeta,
        vencimentoEpoch.isAcceptableOrUnknown(
          data['vencimento_epoch']!,
          _vencimentoEpochMeta,
        ),
      );
    }
    if (data.containsKey('bloqueado')) {
      context.handle(
        _bloqueadoMeta,
        bloqueado.isAcceptableOrUnknown(data['bloqueado']!, _bloqueadoMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PatioCliente map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PatioCliente(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      operacaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao_id'],
      )!,
      nome: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nome'],
      )!,
      planoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}plano_id'],
      ),
      planoNome: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}plano_nome'],
      ),
      planoTipo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}plano_tipo'],
      ),
      vagas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}vagas'],
      )!,
      vencimentoEpoch: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}vencimento_epoch'],
      ),
      bloqueado: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}bloqueado'],
      )!,
    );
  }

  @override
  $PatioClientesTable createAlias(String alias) {
    return $PatioClientesTable(attachedDatabase, alias);
  }
}

class PatioCliente extends DataClass implements Insertable<PatioCliente> {
  final String id;
  final String operacaoId;
  final String nome;
  final String? planoId;
  final String? planoNome;
  final String? planoTipo;
  final int vagas;
  final int? vencimentoEpoch;
  final bool bloqueado;
  const PatioCliente({
    required this.id,
    required this.operacaoId,
    required this.nome,
    this.planoId,
    this.planoNome,
    this.planoTipo,
    required this.vagas,
    this.vencimentoEpoch,
    required this.bloqueado,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operacao_id'] = Variable<String>(operacaoId);
    map['nome'] = Variable<String>(nome);
    if (!nullToAbsent || planoId != null) {
      map['plano_id'] = Variable<String>(planoId);
    }
    if (!nullToAbsent || planoNome != null) {
      map['plano_nome'] = Variable<String>(planoNome);
    }
    if (!nullToAbsent || planoTipo != null) {
      map['plano_tipo'] = Variable<String>(planoTipo);
    }
    map['vagas'] = Variable<int>(vagas);
    if (!nullToAbsent || vencimentoEpoch != null) {
      map['vencimento_epoch'] = Variable<int>(vencimentoEpoch);
    }
    map['bloqueado'] = Variable<bool>(bloqueado);
    return map;
  }

  PatioClientesCompanion toCompanion(bool nullToAbsent) {
    return PatioClientesCompanion(
      id: Value(id),
      operacaoId: Value(operacaoId),
      nome: Value(nome),
      planoId: planoId == null && nullToAbsent
          ? const Value.absent()
          : Value(planoId),
      planoNome: planoNome == null && nullToAbsent
          ? const Value.absent()
          : Value(planoNome),
      planoTipo: planoTipo == null && nullToAbsent
          ? const Value.absent()
          : Value(planoTipo),
      vagas: Value(vagas),
      vencimentoEpoch: vencimentoEpoch == null && nullToAbsent
          ? const Value.absent()
          : Value(vencimentoEpoch),
      bloqueado: Value(bloqueado),
    );
  }

  factory PatioCliente.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PatioCliente(
      id: serializer.fromJson<String>(json['id']),
      operacaoId: serializer.fromJson<String>(json['operacaoId']),
      nome: serializer.fromJson<String>(json['nome']),
      planoId: serializer.fromJson<String?>(json['planoId']),
      planoNome: serializer.fromJson<String?>(json['planoNome']),
      planoTipo: serializer.fromJson<String?>(json['planoTipo']),
      vagas: serializer.fromJson<int>(json['vagas']),
      vencimentoEpoch: serializer.fromJson<int?>(json['vencimentoEpoch']),
      bloqueado: serializer.fromJson<bool>(json['bloqueado']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operacaoId': serializer.toJson<String>(operacaoId),
      'nome': serializer.toJson<String>(nome),
      'planoId': serializer.toJson<String?>(planoId),
      'planoNome': serializer.toJson<String?>(planoNome),
      'planoTipo': serializer.toJson<String?>(planoTipo),
      'vagas': serializer.toJson<int>(vagas),
      'vencimentoEpoch': serializer.toJson<int?>(vencimentoEpoch),
      'bloqueado': serializer.toJson<bool>(bloqueado),
    };
  }

  PatioCliente copyWith({
    String? id,
    String? operacaoId,
    String? nome,
    Value<String?> planoId = const Value.absent(),
    Value<String?> planoNome = const Value.absent(),
    Value<String?> planoTipo = const Value.absent(),
    int? vagas,
    Value<int?> vencimentoEpoch = const Value.absent(),
    bool? bloqueado,
  }) => PatioCliente(
    id: id ?? this.id,
    operacaoId: operacaoId ?? this.operacaoId,
    nome: nome ?? this.nome,
    planoId: planoId.present ? planoId.value : this.planoId,
    planoNome: planoNome.present ? planoNome.value : this.planoNome,
    planoTipo: planoTipo.present ? planoTipo.value : this.planoTipo,
    vagas: vagas ?? this.vagas,
    vencimentoEpoch: vencimentoEpoch.present
        ? vencimentoEpoch.value
        : this.vencimentoEpoch,
    bloqueado: bloqueado ?? this.bloqueado,
  );
  PatioCliente copyWithCompanion(PatioClientesCompanion data) {
    return PatioCliente(
      id: data.id.present ? data.id.value : this.id,
      operacaoId: data.operacaoId.present
          ? data.operacaoId.value
          : this.operacaoId,
      nome: data.nome.present ? data.nome.value : this.nome,
      planoId: data.planoId.present ? data.planoId.value : this.planoId,
      planoNome: data.planoNome.present ? data.planoNome.value : this.planoNome,
      planoTipo: data.planoTipo.present ? data.planoTipo.value : this.planoTipo,
      vagas: data.vagas.present ? data.vagas.value : this.vagas,
      vencimentoEpoch: data.vencimentoEpoch.present
          ? data.vencimentoEpoch.value
          : this.vencimentoEpoch,
      bloqueado: data.bloqueado.present ? data.bloqueado.value : this.bloqueado,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PatioCliente(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('nome: $nome, ')
          ..write('planoId: $planoId, ')
          ..write('planoNome: $planoNome, ')
          ..write('planoTipo: $planoTipo, ')
          ..write('vagas: $vagas, ')
          ..write('vencimentoEpoch: $vencimentoEpoch, ')
          ..write('bloqueado: $bloqueado')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    operacaoId,
    nome,
    planoId,
    planoNome,
    planoTipo,
    vagas,
    vencimentoEpoch,
    bloqueado,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PatioCliente &&
          other.id == this.id &&
          other.operacaoId == this.operacaoId &&
          other.nome == this.nome &&
          other.planoId == this.planoId &&
          other.planoNome == this.planoNome &&
          other.planoTipo == this.planoTipo &&
          other.vagas == this.vagas &&
          other.vencimentoEpoch == this.vencimentoEpoch &&
          other.bloqueado == this.bloqueado);
}

class PatioClientesCompanion extends UpdateCompanion<PatioCliente> {
  final Value<String> id;
  final Value<String> operacaoId;
  final Value<String> nome;
  final Value<String?> planoId;
  final Value<String?> planoNome;
  final Value<String?> planoTipo;
  final Value<int> vagas;
  final Value<int?> vencimentoEpoch;
  final Value<bool> bloqueado;
  final Value<int> rowid;
  const PatioClientesCompanion({
    this.id = const Value.absent(),
    this.operacaoId = const Value.absent(),
    this.nome = const Value.absent(),
    this.planoId = const Value.absent(),
    this.planoNome = const Value.absent(),
    this.planoTipo = const Value.absent(),
    this.vagas = const Value.absent(),
    this.vencimentoEpoch = const Value.absent(),
    this.bloqueado = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PatioClientesCompanion.insert({
    required String id,
    required String operacaoId,
    required String nome,
    this.planoId = const Value.absent(),
    this.planoNome = const Value.absent(),
    this.planoTipo = const Value.absent(),
    this.vagas = const Value.absent(),
    this.vencimentoEpoch = const Value.absent(),
    this.bloqueado = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       operacaoId = Value(operacaoId),
       nome = Value(nome);
  static Insertable<PatioCliente> custom({
    Expression<String>? id,
    Expression<String>? operacaoId,
    Expression<String>? nome,
    Expression<String>? planoId,
    Expression<String>? planoNome,
    Expression<String>? planoTipo,
    Expression<int>? vagas,
    Expression<int>? vencimentoEpoch,
    Expression<bool>? bloqueado,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operacaoId != null) 'operacao_id': operacaoId,
      if (nome != null) 'nome': nome,
      if (planoId != null) 'plano_id': planoId,
      if (planoNome != null) 'plano_nome': planoNome,
      if (planoTipo != null) 'plano_tipo': planoTipo,
      if (vagas != null) 'vagas': vagas,
      if (vencimentoEpoch != null) 'vencimento_epoch': vencimentoEpoch,
      if (bloqueado != null) 'bloqueado': bloqueado,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PatioClientesCompanion copyWith({
    Value<String>? id,
    Value<String>? operacaoId,
    Value<String>? nome,
    Value<String?>? planoId,
    Value<String?>? planoNome,
    Value<String?>? planoTipo,
    Value<int>? vagas,
    Value<int?>? vencimentoEpoch,
    Value<bool>? bloqueado,
    Value<int>? rowid,
  }) {
    return PatioClientesCompanion(
      id: id ?? this.id,
      operacaoId: operacaoId ?? this.operacaoId,
      nome: nome ?? this.nome,
      planoId: planoId ?? this.planoId,
      planoNome: planoNome ?? this.planoNome,
      planoTipo: planoTipo ?? this.planoTipo,
      vagas: vagas ?? this.vagas,
      vencimentoEpoch: vencimentoEpoch ?? this.vencimentoEpoch,
      bloqueado: bloqueado ?? this.bloqueado,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operacaoId.present) {
      map['operacao_id'] = Variable<String>(operacaoId.value);
    }
    if (nome.present) {
      map['nome'] = Variable<String>(nome.value);
    }
    if (planoId.present) {
      map['plano_id'] = Variable<String>(planoId.value);
    }
    if (planoNome.present) {
      map['plano_nome'] = Variable<String>(planoNome.value);
    }
    if (planoTipo.present) {
      map['plano_tipo'] = Variable<String>(planoTipo.value);
    }
    if (vagas.present) {
      map['vagas'] = Variable<int>(vagas.value);
    }
    if (vencimentoEpoch.present) {
      map['vencimento_epoch'] = Variable<int>(vencimentoEpoch.value);
    }
    if (bloqueado.present) {
      map['bloqueado'] = Variable<bool>(bloqueado.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PatioClientesCompanion(')
          ..write('id: $id, ')
          ..write('operacaoId: $operacaoId, ')
          ..write('nome: $nome, ')
          ..write('planoId: $planoId, ')
          ..write('planoNome: $planoNome, ')
          ..write('planoTipo: $planoTipo, ')
          ..write('vagas: $vagas, ')
          ..write('vencimentoEpoch: $vencimentoEpoch, ')
          ..write('bloqueado: $bloqueado, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PatioClientePlacasTable extends PatioClientePlacas
    with TableInfo<$PatioClientePlacasTable, PatioClientePlaca> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PatioClientePlacasTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _operacaoIdMeta = const VerificationMeta(
    'operacaoId',
  );
  @override
  late final GeneratedColumn<String> operacaoId = GeneratedColumn<String>(
    'operacao_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _placaMeta = const VerificationMeta('placa');
  @override
  late final GeneratedColumn<String> placa = GeneratedColumn<String>(
    'placa',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _clienteIdMeta = const VerificationMeta(
    'clienteId',
  );
  @override
  late final GeneratedColumn<String> clienteId = GeneratedColumn<String>(
    'cliente_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descricaoMeta = const VerificationMeta(
    'descricao',
  );
  @override
  late final GeneratedColumn<String> descricao = GeneratedColumn<String>(
    'descricao',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    operacaoId,
    placa,
    clienteId,
    descricao,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'patio_cliente_placas';
  @override
  VerificationContext validateIntegrity(
    Insertable<PatioClientePlaca> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('operacao_id')) {
      context.handle(
        _operacaoIdMeta,
        operacaoId.isAcceptableOrUnknown(data['operacao_id']!, _operacaoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_operacaoIdMeta);
    }
    if (data.containsKey('placa')) {
      context.handle(
        _placaMeta,
        placa.isAcceptableOrUnknown(data['placa']!, _placaMeta),
      );
    } else if (isInserting) {
      context.missing(_placaMeta);
    }
    if (data.containsKey('cliente_id')) {
      context.handle(
        _clienteIdMeta,
        clienteId.isAcceptableOrUnknown(data['cliente_id']!, _clienteIdMeta),
      );
    } else if (isInserting) {
      context.missing(_clienteIdMeta);
    }
    if (data.containsKey('descricao')) {
      context.handle(
        _descricaoMeta,
        descricao.isAcceptableOrUnknown(data['descricao']!, _descricaoMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {operacaoId, placa};
  @override
  PatioClientePlaca map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PatioClientePlaca(
      operacaoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operacao_id'],
      )!,
      placa: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}placa'],
      )!,
      clienteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}cliente_id'],
      )!,
      descricao: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descricao'],
      ),
    );
  }

  @override
  $PatioClientePlacasTable createAlias(String alias) {
    return $PatioClientePlacasTable(attachedDatabase, alias);
  }
}

class PatioClientePlaca extends DataClass
    implements Insertable<PatioClientePlaca> {
  final String operacaoId;
  final String placa;
  final String clienteId;
  final String? descricao;
  const PatioClientePlaca({
    required this.operacaoId,
    required this.placa,
    required this.clienteId,
    this.descricao,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['operacao_id'] = Variable<String>(operacaoId);
    map['placa'] = Variable<String>(placa);
    map['cliente_id'] = Variable<String>(clienteId);
    if (!nullToAbsent || descricao != null) {
      map['descricao'] = Variable<String>(descricao);
    }
    return map;
  }

  PatioClientePlacasCompanion toCompanion(bool nullToAbsent) {
    return PatioClientePlacasCompanion(
      operacaoId: Value(operacaoId),
      placa: Value(placa),
      clienteId: Value(clienteId),
      descricao: descricao == null && nullToAbsent
          ? const Value.absent()
          : Value(descricao),
    );
  }

  factory PatioClientePlaca.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PatioClientePlaca(
      operacaoId: serializer.fromJson<String>(json['operacaoId']),
      placa: serializer.fromJson<String>(json['placa']),
      clienteId: serializer.fromJson<String>(json['clienteId']),
      descricao: serializer.fromJson<String?>(json['descricao']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'operacaoId': serializer.toJson<String>(operacaoId),
      'placa': serializer.toJson<String>(placa),
      'clienteId': serializer.toJson<String>(clienteId),
      'descricao': serializer.toJson<String?>(descricao),
    };
  }

  PatioClientePlaca copyWith({
    String? operacaoId,
    String? placa,
    String? clienteId,
    Value<String?> descricao = const Value.absent(),
  }) => PatioClientePlaca(
    operacaoId: operacaoId ?? this.operacaoId,
    placa: placa ?? this.placa,
    clienteId: clienteId ?? this.clienteId,
    descricao: descricao.present ? descricao.value : this.descricao,
  );
  PatioClientePlaca copyWithCompanion(PatioClientePlacasCompanion data) {
    return PatioClientePlaca(
      operacaoId: data.operacaoId.present
          ? data.operacaoId.value
          : this.operacaoId,
      placa: data.placa.present ? data.placa.value : this.placa,
      clienteId: data.clienteId.present ? data.clienteId.value : this.clienteId,
      descricao: data.descricao.present ? data.descricao.value : this.descricao,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PatioClientePlaca(')
          ..write('operacaoId: $operacaoId, ')
          ..write('placa: $placa, ')
          ..write('clienteId: $clienteId, ')
          ..write('descricao: $descricao')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(operacaoId, placa, clienteId, descricao);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PatioClientePlaca &&
          other.operacaoId == this.operacaoId &&
          other.placa == this.placa &&
          other.clienteId == this.clienteId &&
          other.descricao == this.descricao);
}

class PatioClientePlacasCompanion extends UpdateCompanion<PatioClientePlaca> {
  final Value<String> operacaoId;
  final Value<String> placa;
  final Value<String> clienteId;
  final Value<String?> descricao;
  final Value<int> rowid;
  const PatioClientePlacasCompanion({
    this.operacaoId = const Value.absent(),
    this.placa = const Value.absent(),
    this.clienteId = const Value.absent(),
    this.descricao = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PatioClientePlacasCompanion.insert({
    required String operacaoId,
    required String placa,
    required String clienteId,
    this.descricao = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : operacaoId = Value(operacaoId),
       placa = Value(placa),
       clienteId = Value(clienteId);
  static Insertable<PatioClientePlaca> custom({
    Expression<String>? operacaoId,
    Expression<String>? placa,
    Expression<String>? clienteId,
    Expression<String>? descricao,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (operacaoId != null) 'operacao_id': operacaoId,
      if (placa != null) 'placa': placa,
      if (clienteId != null) 'cliente_id': clienteId,
      if (descricao != null) 'descricao': descricao,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PatioClientePlacasCompanion copyWith({
    Value<String>? operacaoId,
    Value<String>? placa,
    Value<String>? clienteId,
    Value<String?>? descricao,
    Value<int>? rowid,
  }) {
    return PatioClientePlacasCompanion(
      operacaoId: operacaoId ?? this.operacaoId,
      placa: placa ?? this.placa,
      clienteId: clienteId ?? this.clienteId,
      descricao: descricao ?? this.descricao,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (operacaoId.present) {
      map['operacao_id'] = Variable<String>(operacaoId.value);
    }
    if (placa.present) {
      map['placa'] = Variable<String>(placa.value);
    }
    if (clienteId.present) {
      map['cliente_id'] = Variable<String>(clienteId.value);
    }
    if (descricao.present) {
      map['descricao'] = Variable<String>(descricao.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PatioClientePlacasCompanion(')
          ..write('operacaoId: $operacaoId, ')
          ..write('placa: $placa, ')
          ..write('clienteId: $clienteId, ')
          ..write('descricao: $descricao, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $OperacaoCacheTable operacaoCache = $OperacaoCacheTable(this);
  late final $TarifasTable tarifas = $TarifasTable(this);
  late final $TicketsTable tickets = $TicketsTable(this);
  late final $CaixaSessoesTable caixaSessoes = $CaixaSessoesTable(this);
  late final $CaixaMovimentosTable caixaMovimentos = $CaixaMovimentosTable(
    this,
  );
  late final $SyncLogTable syncLog = $SyncLogTable(this);
  late final $PatioClientesTable patioClientes = $PatioClientesTable(this);
  late final $PatioClientePlacasTable patioClientePlacas =
      $PatioClientePlacasTable(this);
  late final OperacaoDao operacaoDao = OperacaoDao(this as AppDatabase);
  late final TicketsDao ticketsDao = TicketsDao(this as AppDatabase);
  late final CaixaDao caixaDao = CaixaDao(this as AppDatabase);
  late final SyncDao syncDao = SyncDao(this as AppDatabase);
  late final ClientesDao clientesDao = ClientesDao(this as AppDatabase);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    operacaoCache,
    tarifas,
    tickets,
    caixaSessoes,
    caixaMovimentos,
    syncLog,
    patioClientes,
    patioClientePlacas,
  ];
}

typedef $$OperacaoCacheTableCreateCompanionBuilder =
    OperacaoCacheCompanion Function({
      required String operacaoId,
      required String nome,
      required String codigo,
      required int qtdVagas,
      required String configJson,
      required int sincronizadoEm,
      Value<int> rowid,
    });
typedef $$OperacaoCacheTableUpdateCompanionBuilder =
    OperacaoCacheCompanion Function({
      Value<String> operacaoId,
      Value<String> nome,
      Value<String> codigo,
      Value<int> qtdVagas,
      Value<String> configJson,
      Value<int> sincronizadoEm,
      Value<int> rowid,
    });

class $$OperacaoCacheTableFilterComposer
    extends Composer<_$AppDatabase, $OperacaoCacheTable> {
  $$OperacaoCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nome => $composableBuilder(
    column: $table.nome,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get qtdVagas => $composableBuilder(
    column: $table.qtdVagas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get configJson => $composableBuilder(
    column: $table.configJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sincronizadoEm => $composableBuilder(
    column: $table.sincronizadoEm,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OperacaoCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $OperacaoCacheTable> {
  $$OperacaoCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nome => $composableBuilder(
    column: $table.nome,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get qtdVagas => $composableBuilder(
    column: $table.qtdVagas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get configJson => $composableBuilder(
    column: $table.configJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sincronizadoEm => $composableBuilder(
    column: $table.sincronizadoEm,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OperacaoCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $OperacaoCacheTable> {
  $$OperacaoCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get nome =>
      $composableBuilder(column: $table.nome, builder: (column) => column);

  GeneratedColumn<String> get codigo =>
      $composableBuilder(column: $table.codigo, builder: (column) => column);

  GeneratedColumn<int> get qtdVagas =>
      $composableBuilder(column: $table.qtdVagas, builder: (column) => column);

  GeneratedColumn<String> get configJson => $composableBuilder(
    column: $table.configJson,
    builder: (column) => column,
  );

  GeneratedColumn<int> get sincronizadoEm => $composableBuilder(
    column: $table.sincronizadoEm,
    builder: (column) => column,
  );
}

class $$OperacaoCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OperacaoCacheTable,
          OperacaoCacheData,
          $$OperacaoCacheTableFilterComposer,
          $$OperacaoCacheTableOrderingComposer,
          $$OperacaoCacheTableAnnotationComposer,
          $$OperacaoCacheTableCreateCompanionBuilder,
          $$OperacaoCacheTableUpdateCompanionBuilder,
          (
            OperacaoCacheData,
            BaseReferences<
              _$AppDatabase,
              $OperacaoCacheTable,
              OperacaoCacheData
            >,
          ),
          OperacaoCacheData,
          PrefetchHooks Function()
        > {
  $$OperacaoCacheTableTableManager(_$AppDatabase db, $OperacaoCacheTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OperacaoCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OperacaoCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OperacaoCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> operacaoId = const Value.absent(),
                Value<String> nome = const Value.absent(),
                Value<String> codigo = const Value.absent(),
                Value<int> qtdVagas = const Value.absent(),
                Value<String> configJson = const Value.absent(),
                Value<int> sincronizadoEm = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OperacaoCacheCompanion(
                operacaoId: operacaoId,
                nome: nome,
                codigo: codigo,
                qtdVagas: qtdVagas,
                configJson: configJson,
                sincronizadoEm: sincronizadoEm,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String operacaoId,
                required String nome,
                required String codigo,
                required int qtdVagas,
                required String configJson,
                required int sincronizadoEm,
                Value<int> rowid = const Value.absent(),
              }) => OperacaoCacheCompanion.insert(
                operacaoId: operacaoId,
                nome: nome,
                codigo: codigo,
                qtdVagas: qtdVagas,
                configJson: configJson,
                sincronizadoEm: sincronizadoEm,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OperacaoCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OperacaoCacheTable,
      OperacaoCacheData,
      $$OperacaoCacheTableFilterComposer,
      $$OperacaoCacheTableOrderingComposer,
      $$OperacaoCacheTableAnnotationComposer,
      $$OperacaoCacheTableCreateCompanionBuilder,
      $$OperacaoCacheTableUpdateCompanionBuilder,
      (
        OperacaoCacheData,
        BaseReferences<_$AppDatabase, $OperacaoCacheTable, OperacaoCacheData>,
      ),
      OperacaoCacheData,
      PrefetchHooks Function()
    >;
typedef $$TarifasTableCreateCompanionBuilder =
    TarifasCompanion Function({
      required String id,
      required String operacaoId,
      Value<String> nome,
      required String tipoVeiculo,
      Value<int> ordem,
      Value<bool> visivelOperador,
      required int fracaoInicialMinutos,
      required double fracaoInicialValor,
      required int fracaoAdicionalMinutos,
      required double fracaoAdicionalValor,
      required double tetoDiaria,
      required int toleranciaMinutos,
      required double pernoiteValor,
      required int pernoiteHoraInicio,
      required int pernoiteHoraFim,
      required int vigenciaInicioEpoch,
      Value<int?> vigenciaFimEpoch,
      Value<int> rowid,
    });
typedef $$TarifasTableUpdateCompanionBuilder =
    TarifasCompanion Function({
      Value<String> id,
      Value<String> operacaoId,
      Value<String> nome,
      Value<String> tipoVeiculo,
      Value<int> ordem,
      Value<bool> visivelOperador,
      Value<int> fracaoInicialMinutos,
      Value<double> fracaoInicialValor,
      Value<int> fracaoAdicionalMinutos,
      Value<double> fracaoAdicionalValor,
      Value<double> tetoDiaria,
      Value<int> toleranciaMinutos,
      Value<double> pernoiteValor,
      Value<int> pernoiteHoraInicio,
      Value<int> pernoiteHoraFim,
      Value<int> vigenciaInicioEpoch,
      Value<int?> vigenciaFimEpoch,
      Value<int> rowid,
    });

class $$TarifasTableFilterComposer
    extends Composer<_$AppDatabase, $TarifasTable> {
  $$TarifasTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nome => $composableBuilder(
    column: $table.nome,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoVeiculo => $composableBuilder(
    column: $table.tipoVeiculo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get ordem => $composableBuilder(
    column: $table.ordem,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get visivelOperador => $composableBuilder(
    column: $table.visivelOperador,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get fracaoInicialMinutos => $composableBuilder(
    column: $table.fracaoInicialMinutos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get fracaoInicialValor => $composableBuilder(
    column: $table.fracaoInicialValor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get fracaoAdicionalMinutos => $composableBuilder(
    column: $table.fracaoAdicionalMinutos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get fracaoAdicionalValor => $composableBuilder(
    column: $table.fracaoAdicionalValor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get tetoDiaria => $composableBuilder(
    column: $table.tetoDiaria,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get toleranciaMinutos => $composableBuilder(
    column: $table.toleranciaMinutos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get pernoiteValor => $composableBuilder(
    column: $table.pernoiteValor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get pernoiteHoraInicio => $composableBuilder(
    column: $table.pernoiteHoraInicio,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get pernoiteHoraFim => $composableBuilder(
    column: $table.pernoiteHoraFim,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get vigenciaInicioEpoch => $composableBuilder(
    column: $table.vigenciaInicioEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get vigenciaFimEpoch => $composableBuilder(
    column: $table.vigenciaFimEpoch,
    builder: (column) => ColumnFilters(column),
  );
}

class $$TarifasTableOrderingComposer
    extends Composer<_$AppDatabase, $TarifasTable> {
  $$TarifasTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nome => $composableBuilder(
    column: $table.nome,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoVeiculo => $composableBuilder(
    column: $table.tipoVeiculo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get ordem => $composableBuilder(
    column: $table.ordem,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get visivelOperador => $composableBuilder(
    column: $table.visivelOperador,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get fracaoInicialMinutos => $composableBuilder(
    column: $table.fracaoInicialMinutos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get fracaoInicialValor => $composableBuilder(
    column: $table.fracaoInicialValor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get fracaoAdicionalMinutos => $composableBuilder(
    column: $table.fracaoAdicionalMinutos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get fracaoAdicionalValor => $composableBuilder(
    column: $table.fracaoAdicionalValor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get tetoDiaria => $composableBuilder(
    column: $table.tetoDiaria,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get toleranciaMinutos => $composableBuilder(
    column: $table.toleranciaMinutos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get pernoiteValor => $composableBuilder(
    column: $table.pernoiteValor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get pernoiteHoraInicio => $composableBuilder(
    column: $table.pernoiteHoraInicio,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get pernoiteHoraFim => $composableBuilder(
    column: $table.pernoiteHoraFim,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get vigenciaInicioEpoch => $composableBuilder(
    column: $table.vigenciaInicioEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get vigenciaFimEpoch => $composableBuilder(
    column: $table.vigenciaFimEpoch,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TarifasTableAnnotationComposer
    extends Composer<_$AppDatabase, $TarifasTable> {
  $$TarifasTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get nome =>
      $composableBuilder(column: $table.nome, builder: (column) => column);

  GeneratedColumn<String> get tipoVeiculo => $composableBuilder(
    column: $table.tipoVeiculo,
    builder: (column) => column,
  );

  GeneratedColumn<int> get ordem =>
      $composableBuilder(column: $table.ordem, builder: (column) => column);

  GeneratedColumn<bool> get visivelOperador => $composableBuilder(
    column: $table.visivelOperador,
    builder: (column) => column,
  );

  GeneratedColumn<int> get fracaoInicialMinutos => $composableBuilder(
    column: $table.fracaoInicialMinutos,
    builder: (column) => column,
  );

  GeneratedColumn<double> get fracaoInicialValor => $composableBuilder(
    column: $table.fracaoInicialValor,
    builder: (column) => column,
  );

  GeneratedColumn<int> get fracaoAdicionalMinutos => $composableBuilder(
    column: $table.fracaoAdicionalMinutos,
    builder: (column) => column,
  );

  GeneratedColumn<double> get fracaoAdicionalValor => $composableBuilder(
    column: $table.fracaoAdicionalValor,
    builder: (column) => column,
  );

  GeneratedColumn<double> get tetoDiaria => $composableBuilder(
    column: $table.tetoDiaria,
    builder: (column) => column,
  );

  GeneratedColumn<int> get toleranciaMinutos => $composableBuilder(
    column: $table.toleranciaMinutos,
    builder: (column) => column,
  );

  GeneratedColumn<double> get pernoiteValor => $composableBuilder(
    column: $table.pernoiteValor,
    builder: (column) => column,
  );

  GeneratedColumn<int> get pernoiteHoraInicio => $composableBuilder(
    column: $table.pernoiteHoraInicio,
    builder: (column) => column,
  );

  GeneratedColumn<int> get pernoiteHoraFim => $composableBuilder(
    column: $table.pernoiteHoraFim,
    builder: (column) => column,
  );

  GeneratedColumn<int> get vigenciaInicioEpoch => $composableBuilder(
    column: $table.vigenciaInicioEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<int> get vigenciaFimEpoch => $composableBuilder(
    column: $table.vigenciaFimEpoch,
    builder: (column) => column,
  );
}

class $$TarifasTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TarifasTable,
          Tarifa,
          $$TarifasTableFilterComposer,
          $$TarifasTableOrderingComposer,
          $$TarifasTableAnnotationComposer,
          $$TarifasTableCreateCompanionBuilder,
          $$TarifasTableUpdateCompanionBuilder,
          (Tarifa, BaseReferences<_$AppDatabase, $TarifasTable, Tarifa>),
          Tarifa,
          PrefetchHooks Function()
        > {
  $$TarifasTableTableManager(_$AppDatabase db, $TarifasTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TarifasTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TarifasTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TarifasTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> operacaoId = const Value.absent(),
                Value<String> nome = const Value.absent(),
                Value<String> tipoVeiculo = const Value.absent(),
                Value<int> ordem = const Value.absent(),
                Value<bool> visivelOperador = const Value.absent(),
                Value<int> fracaoInicialMinutos = const Value.absent(),
                Value<double> fracaoInicialValor = const Value.absent(),
                Value<int> fracaoAdicionalMinutos = const Value.absent(),
                Value<double> fracaoAdicionalValor = const Value.absent(),
                Value<double> tetoDiaria = const Value.absent(),
                Value<int> toleranciaMinutos = const Value.absent(),
                Value<double> pernoiteValor = const Value.absent(),
                Value<int> pernoiteHoraInicio = const Value.absent(),
                Value<int> pernoiteHoraFim = const Value.absent(),
                Value<int> vigenciaInicioEpoch = const Value.absent(),
                Value<int?> vigenciaFimEpoch = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TarifasCompanion(
                id: id,
                operacaoId: operacaoId,
                nome: nome,
                tipoVeiculo: tipoVeiculo,
                ordem: ordem,
                visivelOperador: visivelOperador,
                fracaoInicialMinutos: fracaoInicialMinutos,
                fracaoInicialValor: fracaoInicialValor,
                fracaoAdicionalMinutos: fracaoAdicionalMinutos,
                fracaoAdicionalValor: fracaoAdicionalValor,
                tetoDiaria: tetoDiaria,
                toleranciaMinutos: toleranciaMinutos,
                pernoiteValor: pernoiteValor,
                pernoiteHoraInicio: pernoiteHoraInicio,
                pernoiteHoraFim: pernoiteHoraFim,
                vigenciaInicioEpoch: vigenciaInicioEpoch,
                vigenciaFimEpoch: vigenciaFimEpoch,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String operacaoId,
                Value<String> nome = const Value.absent(),
                required String tipoVeiculo,
                Value<int> ordem = const Value.absent(),
                Value<bool> visivelOperador = const Value.absent(),
                required int fracaoInicialMinutos,
                required double fracaoInicialValor,
                required int fracaoAdicionalMinutos,
                required double fracaoAdicionalValor,
                required double tetoDiaria,
                required int toleranciaMinutos,
                required double pernoiteValor,
                required int pernoiteHoraInicio,
                required int pernoiteHoraFim,
                required int vigenciaInicioEpoch,
                Value<int?> vigenciaFimEpoch = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TarifasCompanion.insert(
                id: id,
                operacaoId: operacaoId,
                nome: nome,
                tipoVeiculo: tipoVeiculo,
                ordem: ordem,
                visivelOperador: visivelOperador,
                fracaoInicialMinutos: fracaoInicialMinutos,
                fracaoInicialValor: fracaoInicialValor,
                fracaoAdicionalMinutos: fracaoAdicionalMinutos,
                fracaoAdicionalValor: fracaoAdicionalValor,
                tetoDiaria: tetoDiaria,
                toleranciaMinutos: toleranciaMinutos,
                pernoiteValor: pernoiteValor,
                pernoiteHoraInicio: pernoiteHoraInicio,
                pernoiteHoraFim: pernoiteHoraFim,
                vigenciaInicioEpoch: vigenciaInicioEpoch,
                vigenciaFimEpoch: vigenciaFimEpoch,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TarifasTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TarifasTable,
      Tarifa,
      $$TarifasTableFilterComposer,
      $$TarifasTableOrderingComposer,
      $$TarifasTableAnnotationComposer,
      $$TarifasTableCreateCompanionBuilder,
      $$TarifasTableUpdateCompanionBuilder,
      (Tarifa, BaseReferences<_$AppDatabase, $TarifasTable, Tarifa>),
      Tarifa,
      PrefetchHooks Function()
    >;
typedef $$TicketsTableCreateCompanionBuilder =
    TicketsCompanion Function({
      required String id,
      required String operacaoId,
      required String placa,
      required String tipoVeiculo,
      required int entradaEpoch,
      Value<int?> saidaEpoch,
      Value<double?> valorCalculado,
      Value<double?> valorCobrado,
      Value<String?> formaPagamento,
      Value<String?> motivoIsencao,
      Value<String> status,
      required String operadorId,
      Value<String?> caixaSessaoId,
      Value<String?> tabelaPrecoId,
      Value<String?> clienteId,
      Value<String?> planoId,
      Value<String> origem,
      Value<String?> atk,
      Value<String?> itk,
      Value<String?> authorizationCode,
      Value<String?> brand,
      Value<String?> cardPan,
      Value<int?> installments,
      Value<String?> paymentProcessor,
      Value<String?> fotoEntradaPath,
      Value<bool> fotoEntradaEnviada,
      Value<String> syncStatus,
      required int criadoEm,
      required int atualizadoEm,
      Value<int> rowid,
    });
typedef $$TicketsTableUpdateCompanionBuilder =
    TicketsCompanion Function({
      Value<String> id,
      Value<String> operacaoId,
      Value<String> placa,
      Value<String> tipoVeiculo,
      Value<int> entradaEpoch,
      Value<int?> saidaEpoch,
      Value<double?> valorCalculado,
      Value<double?> valorCobrado,
      Value<String?> formaPagamento,
      Value<String?> motivoIsencao,
      Value<String> status,
      Value<String> operadorId,
      Value<String?> caixaSessaoId,
      Value<String?> tabelaPrecoId,
      Value<String?> clienteId,
      Value<String?> planoId,
      Value<String> origem,
      Value<String?> atk,
      Value<String?> itk,
      Value<String?> authorizationCode,
      Value<String?> brand,
      Value<String?> cardPan,
      Value<int?> installments,
      Value<String?> paymentProcessor,
      Value<String?> fotoEntradaPath,
      Value<bool> fotoEntradaEnviada,
      Value<String> syncStatus,
      Value<int> criadoEm,
      Value<int> atualizadoEm,
      Value<int> rowid,
    });

class $$TicketsTableFilterComposer
    extends Composer<_$AppDatabase, $TicketsTable> {
  $$TicketsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get placa => $composableBuilder(
    column: $table.placa,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoVeiculo => $composableBuilder(
    column: $table.tipoVeiculo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get entradaEpoch => $composableBuilder(
    column: $table.entradaEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get saidaEpoch => $composableBuilder(
    column: $table.saidaEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorCalculado => $composableBuilder(
    column: $table.valorCalculado,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorCobrado => $composableBuilder(
    column: $table.valorCobrado,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get formaPagamento => $composableBuilder(
    column: $table.formaPagamento,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get motivoIsencao => $composableBuilder(
    column: $table.motivoIsencao,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operadorId => $composableBuilder(
    column: $table.operadorId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get caixaSessaoId => $composableBuilder(
    column: $table.caixaSessaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tabelaPrecoId => $composableBuilder(
    column: $table.tabelaPrecoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get clienteId => $composableBuilder(
    column: $table.clienteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get planoId => $composableBuilder(
    column: $table.planoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get origem => $composableBuilder(
    column: $table.origem,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get atk => $composableBuilder(
    column: $table.atk,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get itk => $composableBuilder(
    column: $table.itk,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get authorizationCode => $composableBuilder(
    column: $table.authorizationCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get brand => $composableBuilder(
    column: $table.brand,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get cardPan => $composableBuilder(
    column: $table.cardPan,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get installments => $composableBuilder(
    column: $table.installments,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get paymentProcessor => $composableBuilder(
    column: $table.paymentProcessor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get fotoEntradaPath => $composableBuilder(
    column: $table.fotoEntradaPath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get fotoEntradaEnviada => $composableBuilder(
    column: $table.fotoEntradaEnviada,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get criadoEm => $composableBuilder(
    column: $table.criadoEm,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get atualizadoEm => $composableBuilder(
    column: $table.atualizadoEm,
    builder: (column) => ColumnFilters(column),
  );
}

class $$TicketsTableOrderingComposer
    extends Composer<_$AppDatabase, $TicketsTable> {
  $$TicketsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get placa => $composableBuilder(
    column: $table.placa,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoVeiculo => $composableBuilder(
    column: $table.tipoVeiculo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get entradaEpoch => $composableBuilder(
    column: $table.entradaEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get saidaEpoch => $composableBuilder(
    column: $table.saidaEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorCalculado => $composableBuilder(
    column: $table.valorCalculado,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorCobrado => $composableBuilder(
    column: $table.valorCobrado,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get formaPagamento => $composableBuilder(
    column: $table.formaPagamento,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get motivoIsencao => $composableBuilder(
    column: $table.motivoIsencao,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operadorId => $composableBuilder(
    column: $table.operadorId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get caixaSessaoId => $composableBuilder(
    column: $table.caixaSessaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tabelaPrecoId => $composableBuilder(
    column: $table.tabelaPrecoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get clienteId => $composableBuilder(
    column: $table.clienteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get planoId => $composableBuilder(
    column: $table.planoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get origem => $composableBuilder(
    column: $table.origem,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get atk => $composableBuilder(
    column: $table.atk,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get itk => $composableBuilder(
    column: $table.itk,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get authorizationCode => $composableBuilder(
    column: $table.authorizationCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get brand => $composableBuilder(
    column: $table.brand,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get cardPan => $composableBuilder(
    column: $table.cardPan,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get installments => $composableBuilder(
    column: $table.installments,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get paymentProcessor => $composableBuilder(
    column: $table.paymentProcessor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get fotoEntradaPath => $composableBuilder(
    column: $table.fotoEntradaPath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get fotoEntradaEnviada => $composableBuilder(
    column: $table.fotoEntradaEnviada,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get criadoEm => $composableBuilder(
    column: $table.criadoEm,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get atualizadoEm => $composableBuilder(
    column: $table.atualizadoEm,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TicketsTableAnnotationComposer
    extends Composer<_$AppDatabase, $TicketsTable> {
  $$TicketsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get placa =>
      $composableBuilder(column: $table.placa, builder: (column) => column);

  GeneratedColumn<String> get tipoVeiculo => $composableBuilder(
    column: $table.tipoVeiculo,
    builder: (column) => column,
  );

  GeneratedColumn<int> get entradaEpoch => $composableBuilder(
    column: $table.entradaEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<int> get saidaEpoch => $composableBuilder(
    column: $table.saidaEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorCalculado => $composableBuilder(
    column: $table.valorCalculado,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorCobrado => $composableBuilder(
    column: $table.valorCobrado,
    builder: (column) => column,
  );

  GeneratedColumn<String> get formaPagamento => $composableBuilder(
    column: $table.formaPagamento,
    builder: (column) => column,
  );

  GeneratedColumn<String> get motivoIsencao => $composableBuilder(
    column: $table.motivoIsencao,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get operadorId => $composableBuilder(
    column: $table.operadorId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get caixaSessaoId => $composableBuilder(
    column: $table.caixaSessaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get tabelaPrecoId => $composableBuilder(
    column: $table.tabelaPrecoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get clienteId =>
      $composableBuilder(column: $table.clienteId, builder: (column) => column);

  GeneratedColumn<String> get planoId =>
      $composableBuilder(column: $table.planoId, builder: (column) => column);

  GeneratedColumn<String> get origem =>
      $composableBuilder(column: $table.origem, builder: (column) => column);

  GeneratedColumn<String> get atk =>
      $composableBuilder(column: $table.atk, builder: (column) => column);

  GeneratedColumn<String> get itk =>
      $composableBuilder(column: $table.itk, builder: (column) => column);

  GeneratedColumn<String> get authorizationCode => $composableBuilder(
    column: $table.authorizationCode,
    builder: (column) => column,
  );

  GeneratedColumn<String> get brand =>
      $composableBuilder(column: $table.brand, builder: (column) => column);

  GeneratedColumn<String> get cardPan =>
      $composableBuilder(column: $table.cardPan, builder: (column) => column);

  GeneratedColumn<int> get installments => $composableBuilder(
    column: $table.installments,
    builder: (column) => column,
  );

  GeneratedColumn<String> get paymentProcessor => $composableBuilder(
    column: $table.paymentProcessor,
    builder: (column) => column,
  );

  GeneratedColumn<String> get fotoEntradaPath => $composableBuilder(
    column: $table.fotoEntradaPath,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get fotoEntradaEnviada => $composableBuilder(
    column: $table.fotoEntradaEnviada,
    builder: (column) => column,
  );

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );

  GeneratedColumn<int> get criadoEm =>
      $composableBuilder(column: $table.criadoEm, builder: (column) => column);

  GeneratedColumn<int> get atualizadoEm => $composableBuilder(
    column: $table.atualizadoEm,
    builder: (column) => column,
  );
}

class $$TicketsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TicketsTable,
          Ticket,
          $$TicketsTableFilterComposer,
          $$TicketsTableOrderingComposer,
          $$TicketsTableAnnotationComposer,
          $$TicketsTableCreateCompanionBuilder,
          $$TicketsTableUpdateCompanionBuilder,
          (Ticket, BaseReferences<_$AppDatabase, $TicketsTable, Ticket>),
          Ticket,
          PrefetchHooks Function()
        > {
  $$TicketsTableTableManager(_$AppDatabase db, $TicketsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TicketsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TicketsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TicketsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> operacaoId = const Value.absent(),
                Value<String> placa = const Value.absent(),
                Value<String> tipoVeiculo = const Value.absent(),
                Value<int> entradaEpoch = const Value.absent(),
                Value<int?> saidaEpoch = const Value.absent(),
                Value<double?> valorCalculado = const Value.absent(),
                Value<double?> valorCobrado = const Value.absent(),
                Value<String?> formaPagamento = const Value.absent(),
                Value<String?> motivoIsencao = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> operadorId = const Value.absent(),
                Value<String?> caixaSessaoId = const Value.absent(),
                Value<String?> tabelaPrecoId = const Value.absent(),
                Value<String?> clienteId = const Value.absent(),
                Value<String?> planoId = const Value.absent(),
                Value<String> origem = const Value.absent(),
                Value<String?> atk = const Value.absent(),
                Value<String?> itk = const Value.absent(),
                Value<String?> authorizationCode = const Value.absent(),
                Value<String?> brand = const Value.absent(),
                Value<String?> cardPan = const Value.absent(),
                Value<int?> installments = const Value.absent(),
                Value<String?> paymentProcessor = const Value.absent(),
                Value<String?> fotoEntradaPath = const Value.absent(),
                Value<bool> fotoEntradaEnviada = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> criadoEm = const Value.absent(),
                Value<int> atualizadoEm = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TicketsCompanion(
                id: id,
                operacaoId: operacaoId,
                placa: placa,
                tipoVeiculo: tipoVeiculo,
                entradaEpoch: entradaEpoch,
                saidaEpoch: saidaEpoch,
                valorCalculado: valorCalculado,
                valorCobrado: valorCobrado,
                formaPagamento: formaPagamento,
                motivoIsencao: motivoIsencao,
                status: status,
                operadorId: operadorId,
                caixaSessaoId: caixaSessaoId,
                tabelaPrecoId: tabelaPrecoId,
                clienteId: clienteId,
                planoId: planoId,
                origem: origem,
                atk: atk,
                itk: itk,
                authorizationCode: authorizationCode,
                brand: brand,
                cardPan: cardPan,
                installments: installments,
                paymentProcessor: paymentProcessor,
                fotoEntradaPath: fotoEntradaPath,
                fotoEntradaEnviada: fotoEntradaEnviada,
                syncStatus: syncStatus,
                criadoEm: criadoEm,
                atualizadoEm: atualizadoEm,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String operacaoId,
                required String placa,
                required String tipoVeiculo,
                required int entradaEpoch,
                Value<int?> saidaEpoch = const Value.absent(),
                Value<double?> valorCalculado = const Value.absent(),
                Value<double?> valorCobrado = const Value.absent(),
                Value<String?> formaPagamento = const Value.absent(),
                Value<String?> motivoIsencao = const Value.absent(),
                Value<String> status = const Value.absent(),
                required String operadorId,
                Value<String?> caixaSessaoId = const Value.absent(),
                Value<String?> tabelaPrecoId = const Value.absent(),
                Value<String?> clienteId = const Value.absent(),
                Value<String?> planoId = const Value.absent(),
                Value<String> origem = const Value.absent(),
                Value<String?> atk = const Value.absent(),
                Value<String?> itk = const Value.absent(),
                Value<String?> authorizationCode = const Value.absent(),
                Value<String?> brand = const Value.absent(),
                Value<String?> cardPan = const Value.absent(),
                Value<int?> installments = const Value.absent(),
                Value<String?> paymentProcessor = const Value.absent(),
                Value<String?> fotoEntradaPath = const Value.absent(),
                Value<bool> fotoEntradaEnviada = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                required int criadoEm,
                required int atualizadoEm,
                Value<int> rowid = const Value.absent(),
              }) => TicketsCompanion.insert(
                id: id,
                operacaoId: operacaoId,
                placa: placa,
                tipoVeiculo: tipoVeiculo,
                entradaEpoch: entradaEpoch,
                saidaEpoch: saidaEpoch,
                valorCalculado: valorCalculado,
                valorCobrado: valorCobrado,
                formaPagamento: formaPagamento,
                motivoIsencao: motivoIsencao,
                status: status,
                operadorId: operadorId,
                caixaSessaoId: caixaSessaoId,
                tabelaPrecoId: tabelaPrecoId,
                clienteId: clienteId,
                planoId: planoId,
                origem: origem,
                atk: atk,
                itk: itk,
                authorizationCode: authorizationCode,
                brand: brand,
                cardPan: cardPan,
                installments: installments,
                paymentProcessor: paymentProcessor,
                fotoEntradaPath: fotoEntradaPath,
                fotoEntradaEnviada: fotoEntradaEnviada,
                syncStatus: syncStatus,
                criadoEm: criadoEm,
                atualizadoEm: atualizadoEm,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TicketsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TicketsTable,
      Ticket,
      $$TicketsTableFilterComposer,
      $$TicketsTableOrderingComposer,
      $$TicketsTableAnnotationComposer,
      $$TicketsTableCreateCompanionBuilder,
      $$TicketsTableUpdateCompanionBuilder,
      (Ticket, BaseReferences<_$AppDatabase, $TicketsTable, Ticket>),
      Ticket,
      PrefetchHooks Function()
    >;
typedef $$CaixaSessoesTableCreateCompanionBuilder =
    CaixaSessoesCompanion Function({
      required String id,
      required String operacaoId,
      required String operadorId,
      required String operadorNome,
      required double fundoCaixa,
      Value<double> totalEntradas,
      Value<double> totalSangrias,
      Value<double?> totalFechamento,
      Value<String> status,
      required int aberturaEpoch,
      Value<int?> fechamentoEpoch,
      Value<String?> observacaoFechamento,
      Value<String> syncStatus,
      Value<int> rowid,
    });
typedef $$CaixaSessoesTableUpdateCompanionBuilder =
    CaixaSessoesCompanion Function({
      Value<String> id,
      Value<String> operacaoId,
      Value<String> operadorId,
      Value<String> operadorNome,
      Value<double> fundoCaixa,
      Value<double> totalEntradas,
      Value<double> totalSangrias,
      Value<double?> totalFechamento,
      Value<String> status,
      Value<int> aberturaEpoch,
      Value<int?> fechamentoEpoch,
      Value<String?> observacaoFechamento,
      Value<String> syncStatus,
      Value<int> rowid,
    });

class $$CaixaSessoesTableFilterComposer
    extends Composer<_$AppDatabase, $CaixaSessoesTable> {
  $$CaixaSessoesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operadorId => $composableBuilder(
    column: $table.operadorId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operadorNome => $composableBuilder(
    column: $table.operadorNome,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get fundoCaixa => $composableBuilder(
    column: $table.fundoCaixa,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get totalEntradas => $composableBuilder(
    column: $table.totalEntradas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get totalSangrias => $composableBuilder(
    column: $table.totalSangrias,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get totalFechamento => $composableBuilder(
    column: $table.totalFechamento,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get aberturaEpoch => $composableBuilder(
    column: $table.aberturaEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get fechamentoEpoch => $composableBuilder(
    column: $table.fechamentoEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get observacaoFechamento => $composableBuilder(
    column: $table.observacaoFechamento,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CaixaSessoesTableOrderingComposer
    extends Composer<_$AppDatabase, $CaixaSessoesTable> {
  $$CaixaSessoesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operadorId => $composableBuilder(
    column: $table.operadorId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operadorNome => $composableBuilder(
    column: $table.operadorNome,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get fundoCaixa => $composableBuilder(
    column: $table.fundoCaixa,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get totalEntradas => $composableBuilder(
    column: $table.totalEntradas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get totalSangrias => $composableBuilder(
    column: $table.totalSangrias,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get totalFechamento => $composableBuilder(
    column: $table.totalFechamento,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get aberturaEpoch => $composableBuilder(
    column: $table.aberturaEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get fechamentoEpoch => $composableBuilder(
    column: $table.fechamentoEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get observacaoFechamento => $composableBuilder(
    column: $table.observacaoFechamento,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CaixaSessoesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CaixaSessoesTable> {
  $$CaixaSessoesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get operadorId => $composableBuilder(
    column: $table.operadorId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get operadorNome => $composableBuilder(
    column: $table.operadorNome,
    builder: (column) => column,
  );

  GeneratedColumn<double> get fundoCaixa => $composableBuilder(
    column: $table.fundoCaixa,
    builder: (column) => column,
  );

  GeneratedColumn<double> get totalEntradas => $composableBuilder(
    column: $table.totalEntradas,
    builder: (column) => column,
  );

  GeneratedColumn<double> get totalSangrias => $composableBuilder(
    column: $table.totalSangrias,
    builder: (column) => column,
  );

  GeneratedColumn<double> get totalFechamento => $composableBuilder(
    column: $table.totalFechamento,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get aberturaEpoch => $composableBuilder(
    column: $table.aberturaEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<int> get fechamentoEpoch => $composableBuilder(
    column: $table.fechamentoEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<String> get observacaoFechamento => $composableBuilder(
    column: $table.observacaoFechamento,
    builder: (column) => column,
  );

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );
}

class $$CaixaSessoesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CaixaSessoesTable,
          CaixaSessoe,
          $$CaixaSessoesTableFilterComposer,
          $$CaixaSessoesTableOrderingComposer,
          $$CaixaSessoesTableAnnotationComposer,
          $$CaixaSessoesTableCreateCompanionBuilder,
          $$CaixaSessoesTableUpdateCompanionBuilder,
          (
            CaixaSessoe,
            BaseReferences<_$AppDatabase, $CaixaSessoesTable, CaixaSessoe>,
          ),
          CaixaSessoe,
          PrefetchHooks Function()
        > {
  $$CaixaSessoesTableTableManager(_$AppDatabase db, $CaixaSessoesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CaixaSessoesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CaixaSessoesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CaixaSessoesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> operacaoId = const Value.absent(),
                Value<String> operadorId = const Value.absent(),
                Value<String> operadorNome = const Value.absent(),
                Value<double> fundoCaixa = const Value.absent(),
                Value<double> totalEntradas = const Value.absent(),
                Value<double> totalSangrias = const Value.absent(),
                Value<double?> totalFechamento = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<int> aberturaEpoch = const Value.absent(),
                Value<int?> fechamentoEpoch = const Value.absent(),
                Value<String?> observacaoFechamento = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CaixaSessoesCompanion(
                id: id,
                operacaoId: operacaoId,
                operadorId: operadorId,
                operadorNome: operadorNome,
                fundoCaixa: fundoCaixa,
                totalEntradas: totalEntradas,
                totalSangrias: totalSangrias,
                totalFechamento: totalFechamento,
                status: status,
                aberturaEpoch: aberturaEpoch,
                fechamentoEpoch: fechamentoEpoch,
                observacaoFechamento: observacaoFechamento,
                syncStatus: syncStatus,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String operacaoId,
                required String operadorId,
                required String operadorNome,
                required double fundoCaixa,
                Value<double> totalEntradas = const Value.absent(),
                Value<double> totalSangrias = const Value.absent(),
                Value<double?> totalFechamento = const Value.absent(),
                Value<String> status = const Value.absent(),
                required int aberturaEpoch,
                Value<int?> fechamentoEpoch = const Value.absent(),
                Value<String?> observacaoFechamento = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CaixaSessoesCompanion.insert(
                id: id,
                operacaoId: operacaoId,
                operadorId: operadorId,
                operadorNome: operadorNome,
                fundoCaixa: fundoCaixa,
                totalEntradas: totalEntradas,
                totalSangrias: totalSangrias,
                totalFechamento: totalFechamento,
                status: status,
                aberturaEpoch: aberturaEpoch,
                fechamentoEpoch: fechamentoEpoch,
                observacaoFechamento: observacaoFechamento,
                syncStatus: syncStatus,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CaixaSessoesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CaixaSessoesTable,
      CaixaSessoe,
      $$CaixaSessoesTableFilterComposer,
      $$CaixaSessoesTableOrderingComposer,
      $$CaixaSessoesTableAnnotationComposer,
      $$CaixaSessoesTableCreateCompanionBuilder,
      $$CaixaSessoesTableUpdateCompanionBuilder,
      (
        CaixaSessoe,
        BaseReferences<_$AppDatabase, $CaixaSessoesTable, CaixaSessoe>,
      ),
      CaixaSessoe,
      PrefetchHooks Function()
    >;
typedef $$CaixaMovimentosTableCreateCompanionBuilder =
    CaixaMovimentosCompanion Function({
      required String id,
      required String caixaSessaoId,
      required String tipo,
      required double valor,
      required String descricao,
      Value<String?> ticketId,
      Value<String?> formaPagamento,
      required int criadoEm,
      Value<String> syncStatus,
      Value<int> rowid,
    });
typedef $$CaixaMovimentosTableUpdateCompanionBuilder =
    CaixaMovimentosCompanion Function({
      Value<String> id,
      Value<String> caixaSessaoId,
      Value<String> tipo,
      Value<double> valor,
      Value<String> descricao,
      Value<String?> ticketId,
      Value<String?> formaPagamento,
      Value<int> criadoEm,
      Value<String> syncStatus,
      Value<int> rowid,
    });

class $$CaixaMovimentosTableFilterComposer
    extends Composer<_$AppDatabase, $CaixaMovimentosTable> {
  $$CaixaMovimentosTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get caixaSessaoId => $composableBuilder(
    column: $table.caixaSessaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipo => $composableBuilder(
    column: $table.tipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valor => $composableBuilder(
    column: $table.valor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descricao => $composableBuilder(
    column: $table.descricao,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ticketId => $composableBuilder(
    column: $table.ticketId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get formaPagamento => $composableBuilder(
    column: $table.formaPagamento,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get criadoEm => $composableBuilder(
    column: $table.criadoEm,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CaixaMovimentosTableOrderingComposer
    extends Composer<_$AppDatabase, $CaixaMovimentosTable> {
  $$CaixaMovimentosTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get caixaSessaoId => $composableBuilder(
    column: $table.caixaSessaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipo => $composableBuilder(
    column: $table.tipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valor => $composableBuilder(
    column: $table.valor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descricao => $composableBuilder(
    column: $table.descricao,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ticketId => $composableBuilder(
    column: $table.ticketId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get formaPagamento => $composableBuilder(
    column: $table.formaPagamento,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get criadoEm => $composableBuilder(
    column: $table.criadoEm,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CaixaMovimentosTableAnnotationComposer
    extends Composer<_$AppDatabase, $CaixaMovimentosTable> {
  $$CaixaMovimentosTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get caixaSessaoId => $composableBuilder(
    column: $table.caixaSessaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get tipo =>
      $composableBuilder(column: $table.tipo, builder: (column) => column);

  GeneratedColumn<double> get valor =>
      $composableBuilder(column: $table.valor, builder: (column) => column);

  GeneratedColumn<String> get descricao =>
      $composableBuilder(column: $table.descricao, builder: (column) => column);

  GeneratedColumn<String> get ticketId =>
      $composableBuilder(column: $table.ticketId, builder: (column) => column);

  GeneratedColumn<String> get formaPagamento => $composableBuilder(
    column: $table.formaPagamento,
    builder: (column) => column,
  );

  GeneratedColumn<int> get criadoEm =>
      $composableBuilder(column: $table.criadoEm, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );
}

class $$CaixaMovimentosTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CaixaMovimentosTable,
          CaixaMovimento,
          $$CaixaMovimentosTableFilterComposer,
          $$CaixaMovimentosTableOrderingComposer,
          $$CaixaMovimentosTableAnnotationComposer,
          $$CaixaMovimentosTableCreateCompanionBuilder,
          $$CaixaMovimentosTableUpdateCompanionBuilder,
          (
            CaixaMovimento,
            BaseReferences<
              _$AppDatabase,
              $CaixaMovimentosTable,
              CaixaMovimento
            >,
          ),
          CaixaMovimento,
          PrefetchHooks Function()
        > {
  $$CaixaMovimentosTableTableManager(
    _$AppDatabase db,
    $CaixaMovimentosTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CaixaMovimentosTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CaixaMovimentosTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CaixaMovimentosTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> caixaSessaoId = const Value.absent(),
                Value<String> tipo = const Value.absent(),
                Value<double> valor = const Value.absent(),
                Value<String> descricao = const Value.absent(),
                Value<String?> ticketId = const Value.absent(),
                Value<String?> formaPagamento = const Value.absent(),
                Value<int> criadoEm = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CaixaMovimentosCompanion(
                id: id,
                caixaSessaoId: caixaSessaoId,
                tipo: tipo,
                valor: valor,
                descricao: descricao,
                ticketId: ticketId,
                formaPagamento: formaPagamento,
                criadoEm: criadoEm,
                syncStatus: syncStatus,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String caixaSessaoId,
                required String tipo,
                required double valor,
                required String descricao,
                Value<String?> ticketId = const Value.absent(),
                Value<String?> formaPagamento = const Value.absent(),
                required int criadoEm,
                Value<String> syncStatus = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CaixaMovimentosCompanion.insert(
                id: id,
                caixaSessaoId: caixaSessaoId,
                tipo: tipo,
                valor: valor,
                descricao: descricao,
                ticketId: ticketId,
                formaPagamento: formaPagamento,
                criadoEm: criadoEm,
                syncStatus: syncStatus,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CaixaMovimentosTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CaixaMovimentosTable,
      CaixaMovimento,
      $$CaixaMovimentosTableFilterComposer,
      $$CaixaMovimentosTableOrderingComposer,
      $$CaixaMovimentosTableAnnotationComposer,
      $$CaixaMovimentosTableCreateCompanionBuilder,
      $$CaixaMovimentosTableUpdateCompanionBuilder,
      (
        CaixaMovimento,
        BaseReferences<_$AppDatabase, $CaixaMovimentosTable, CaixaMovimento>,
      ),
      CaixaMovimento,
      PrefetchHooks Function()
    >;
typedef $$SyncLogTableCreateCompanionBuilder =
    SyncLogCompanion Function({
      Value<int> id,
      required String entidade,
      required String entidadeId,
      required String operacao,
      required String payload,
      Value<String> status,
      Value<int> tentativas,
      Value<int?> proximaTentativaEpoch,
      Value<String?> erroUltimaTentativa,
      required int criadoEm,
    });
typedef $$SyncLogTableUpdateCompanionBuilder =
    SyncLogCompanion Function({
      Value<int> id,
      Value<String> entidade,
      Value<String> entidadeId,
      Value<String> operacao,
      Value<String> payload,
      Value<String> status,
      Value<int> tentativas,
      Value<int?> proximaTentativaEpoch,
      Value<String?> erroUltimaTentativa,
      Value<int> criadoEm,
    });

class $$SyncLogTableFilterComposer
    extends Composer<_$AppDatabase, $SyncLogTable> {
  $$SyncLogTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entidade => $composableBuilder(
    column: $table.entidade,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entidadeId => $composableBuilder(
    column: $table.entidadeId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operacao => $composableBuilder(
    column: $table.operacao,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get tentativas => $composableBuilder(
    column: $table.tentativas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get proximaTentativaEpoch => $composableBuilder(
    column: $table.proximaTentativaEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get erroUltimaTentativa => $composableBuilder(
    column: $table.erroUltimaTentativa,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get criadoEm => $composableBuilder(
    column: $table.criadoEm,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncLogTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncLogTable> {
  $$SyncLogTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entidade => $composableBuilder(
    column: $table.entidade,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entidadeId => $composableBuilder(
    column: $table.entidadeId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operacao => $composableBuilder(
    column: $table.operacao,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get tentativas => $composableBuilder(
    column: $table.tentativas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get proximaTentativaEpoch => $composableBuilder(
    column: $table.proximaTentativaEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get erroUltimaTentativa => $composableBuilder(
    column: $table.erroUltimaTentativa,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get criadoEm => $composableBuilder(
    column: $table.criadoEm,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncLogTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncLogTable> {
  $$SyncLogTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get entidade =>
      $composableBuilder(column: $table.entidade, builder: (column) => column);

  GeneratedColumn<String> get entidadeId => $composableBuilder(
    column: $table.entidadeId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get operacao =>
      $composableBuilder(column: $table.operacao, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get tentativas => $composableBuilder(
    column: $table.tentativas,
    builder: (column) => column,
  );

  GeneratedColumn<int> get proximaTentativaEpoch => $composableBuilder(
    column: $table.proximaTentativaEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<String> get erroUltimaTentativa => $composableBuilder(
    column: $table.erroUltimaTentativa,
    builder: (column) => column,
  );

  GeneratedColumn<int> get criadoEm =>
      $composableBuilder(column: $table.criadoEm, builder: (column) => column);
}

class $$SyncLogTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncLogTable,
          SyncLogData,
          $$SyncLogTableFilterComposer,
          $$SyncLogTableOrderingComposer,
          $$SyncLogTableAnnotationComposer,
          $$SyncLogTableCreateCompanionBuilder,
          $$SyncLogTableUpdateCompanionBuilder,
          (
            SyncLogData,
            BaseReferences<_$AppDatabase, $SyncLogTable, SyncLogData>,
          ),
          SyncLogData,
          PrefetchHooks Function()
        > {
  $$SyncLogTableTableManager(_$AppDatabase db, $SyncLogTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncLogTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncLogTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncLogTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> entidade = const Value.absent(),
                Value<String> entidadeId = const Value.absent(),
                Value<String> operacao = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<int> tentativas = const Value.absent(),
                Value<int?> proximaTentativaEpoch = const Value.absent(),
                Value<String?> erroUltimaTentativa = const Value.absent(),
                Value<int> criadoEm = const Value.absent(),
              }) => SyncLogCompanion(
                id: id,
                entidade: entidade,
                entidadeId: entidadeId,
                operacao: operacao,
                payload: payload,
                status: status,
                tentativas: tentativas,
                proximaTentativaEpoch: proximaTentativaEpoch,
                erroUltimaTentativa: erroUltimaTentativa,
                criadoEm: criadoEm,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String entidade,
                required String entidadeId,
                required String operacao,
                required String payload,
                Value<String> status = const Value.absent(),
                Value<int> tentativas = const Value.absent(),
                Value<int?> proximaTentativaEpoch = const Value.absent(),
                Value<String?> erroUltimaTentativa = const Value.absent(),
                required int criadoEm,
              }) => SyncLogCompanion.insert(
                id: id,
                entidade: entidade,
                entidadeId: entidadeId,
                operacao: operacao,
                payload: payload,
                status: status,
                tentativas: tentativas,
                proximaTentativaEpoch: proximaTentativaEpoch,
                erroUltimaTentativa: erroUltimaTentativa,
                criadoEm: criadoEm,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncLogTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncLogTable,
      SyncLogData,
      $$SyncLogTableFilterComposer,
      $$SyncLogTableOrderingComposer,
      $$SyncLogTableAnnotationComposer,
      $$SyncLogTableCreateCompanionBuilder,
      $$SyncLogTableUpdateCompanionBuilder,
      (SyncLogData, BaseReferences<_$AppDatabase, $SyncLogTable, SyncLogData>),
      SyncLogData,
      PrefetchHooks Function()
    >;
typedef $$PatioClientesTableCreateCompanionBuilder =
    PatioClientesCompanion Function({
      required String id,
      required String operacaoId,
      required String nome,
      Value<String?> planoId,
      Value<String?> planoNome,
      Value<String?> planoTipo,
      Value<int> vagas,
      Value<int?> vencimentoEpoch,
      Value<bool> bloqueado,
      Value<int> rowid,
    });
typedef $$PatioClientesTableUpdateCompanionBuilder =
    PatioClientesCompanion Function({
      Value<String> id,
      Value<String> operacaoId,
      Value<String> nome,
      Value<String?> planoId,
      Value<String?> planoNome,
      Value<String?> planoTipo,
      Value<int> vagas,
      Value<int?> vencimentoEpoch,
      Value<bool> bloqueado,
      Value<int> rowid,
    });

class $$PatioClientesTableFilterComposer
    extends Composer<_$AppDatabase, $PatioClientesTable> {
  $$PatioClientesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nome => $composableBuilder(
    column: $table.nome,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get planoId => $composableBuilder(
    column: $table.planoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get planoNome => $composableBuilder(
    column: $table.planoNome,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get planoTipo => $composableBuilder(
    column: $table.planoTipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get vagas => $composableBuilder(
    column: $table.vagas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get vencimentoEpoch => $composableBuilder(
    column: $table.vencimentoEpoch,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get bloqueado => $composableBuilder(
    column: $table.bloqueado,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PatioClientesTableOrderingComposer
    extends Composer<_$AppDatabase, $PatioClientesTable> {
  $$PatioClientesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nome => $composableBuilder(
    column: $table.nome,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get planoId => $composableBuilder(
    column: $table.planoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get planoNome => $composableBuilder(
    column: $table.planoNome,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get planoTipo => $composableBuilder(
    column: $table.planoTipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get vagas => $composableBuilder(
    column: $table.vagas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get vencimentoEpoch => $composableBuilder(
    column: $table.vencimentoEpoch,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get bloqueado => $composableBuilder(
    column: $table.bloqueado,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PatioClientesTableAnnotationComposer
    extends Composer<_$AppDatabase, $PatioClientesTable> {
  $$PatioClientesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get nome =>
      $composableBuilder(column: $table.nome, builder: (column) => column);

  GeneratedColumn<String> get planoId =>
      $composableBuilder(column: $table.planoId, builder: (column) => column);

  GeneratedColumn<String> get planoNome =>
      $composableBuilder(column: $table.planoNome, builder: (column) => column);

  GeneratedColumn<String> get planoTipo =>
      $composableBuilder(column: $table.planoTipo, builder: (column) => column);

  GeneratedColumn<int> get vagas =>
      $composableBuilder(column: $table.vagas, builder: (column) => column);

  GeneratedColumn<int> get vencimentoEpoch => $composableBuilder(
    column: $table.vencimentoEpoch,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get bloqueado =>
      $composableBuilder(column: $table.bloqueado, builder: (column) => column);
}

class $$PatioClientesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PatioClientesTable,
          PatioCliente,
          $$PatioClientesTableFilterComposer,
          $$PatioClientesTableOrderingComposer,
          $$PatioClientesTableAnnotationComposer,
          $$PatioClientesTableCreateCompanionBuilder,
          $$PatioClientesTableUpdateCompanionBuilder,
          (
            PatioCliente,
            BaseReferences<_$AppDatabase, $PatioClientesTable, PatioCliente>,
          ),
          PatioCliente,
          PrefetchHooks Function()
        > {
  $$PatioClientesTableTableManager(_$AppDatabase db, $PatioClientesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PatioClientesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PatioClientesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PatioClientesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> operacaoId = const Value.absent(),
                Value<String> nome = const Value.absent(),
                Value<String?> planoId = const Value.absent(),
                Value<String?> planoNome = const Value.absent(),
                Value<String?> planoTipo = const Value.absent(),
                Value<int> vagas = const Value.absent(),
                Value<int?> vencimentoEpoch = const Value.absent(),
                Value<bool> bloqueado = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PatioClientesCompanion(
                id: id,
                operacaoId: operacaoId,
                nome: nome,
                planoId: planoId,
                planoNome: planoNome,
                planoTipo: planoTipo,
                vagas: vagas,
                vencimentoEpoch: vencimentoEpoch,
                bloqueado: bloqueado,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String operacaoId,
                required String nome,
                Value<String?> planoId = const Value.absent(),
                Value<String?> planoNome = const Value.absent(),
                Value<String?> planoTipo = const Value.absent(),
                Value<int> vagas = const Value.absent(),
                Value<int?> vencimentoEpoch = const Value.absent(),
                Value<bool> bloqueado = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PatioClientesCompanion.insert(
                id: id,
                operacaoId: operacaoId,
                nome: nome,
                planoId: planoId,
                planoNome: planoNome,
                planoTipo: planoTipo,
                vagas: vagas,
                vencimentoEpoch: vencimentoEpoch,
                bloqueado: bloqueado,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PatioClientesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PatioClientesTable,
      PatioCliente,
      $$PatioClientesTableFilterComposer,
      $$PatioClientesTableOrderingComposer,
      $$PatioClientesTableAnnotationComposer,
      $$PatioClientesTableCreateCompanionBuilder,
      $$PatioClientesTableUpdateCompanionBuilder,
      (
        PatioCliente,
        BaseReferences<_$AppDatabase, $PatioClientesTable, PatioCliente>,
      ),
      PatioCliente,
      PrefetchHooks Function()
    >;
typedef $$PatioClientePlacasTableCreateCompanionBuilder =
    PatioClientePlacasCompanion Function({
      required String operacaoId,
      required String placa,
      required String clienteId,
      Value<String?> descricao,
      Value<int> rowid,
    });
typedef $$PatioClientePlacasTableUpdateCompanionBuilder =
    PatioClientePlacasCompanion Function({
      Value<String> operacaoId,
      Value<String> placa,
      Value<String> clienteId,
      Value<String?> descricao,
      Value<int> rowid,
    });

class $$PatioClientePlacasTableFilterComposer
    extends Composer<_$AppDatabase, $PatioClientePlacasTable> {
  $$PatioClientePlacasTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get placa => $composableBuilder(
    column: $table.placa,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get clienteId => $composableBuilder(
    column: $table.clienteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descricao => $composableBuilder(
    column: $table.descricao,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PatioClientePlacasTableOrderingComposer
    extends Composer<_$AppDatabase, $PatioClientePlacasTable> {
  $$PatioClientePlacasTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get placa => $composableBuilder(
    column: $table.placa,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get clienteId => $composableBuilder(
    column: $table.clienteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descricao => $composableBuilder(
    column: $table.descricao,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PatioClientePlacasTableAnnotationComposer
    extends Composer<_$AppDatabase, $PatioClientePlacasTable> {
  $$PatioClientePlacasTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get operacaoId => $composableBuilder(
    column: $table.operacaoId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get placa =>
      $composableBuilder(column: $table.placa, builder: (column) => column);

  GeneratedColumn<String> get clienteId =>
      $composableBuilder(column: $table.clienteId, builder: (column) => column);

  GeneratedColumn<String> get descricao =>
      $composableBuilder(column: $table.descricao, builder: (column) => column);
}

class $$PatioClientePlacasTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PatioClientePlacasTable,
          PatioClientePlaca,
          $$PatioClientePlacasTableFilterComposer,
          $$PatioClientePlacasTableOrderingComposer,
          $$PatioClientePlacasTableAnnotationComposer,
          $$PatioClientePlacasTableCreateCompanionBuilder,
          $$PatioClientePlacasTableUpdateCompanionBuilder,
          (
            PatioClientePlaca,
            BaseReferences<
              _$AppDatabase,
              $PatioClientePlacasTable,
              PatioClientePlaca
            >,
          ),
          PatioClientePlaca,
          PrefetchHooks Function()
        > {
  $$PatioClientePlacasTableTableManager(
    _$AppDatabase db,
    $PatioClientePlacasTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PatioClientePlacasTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PatioClientePlacasTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PatioClientePlacasTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> operacaoId = const Value.absent(),
                Value<String> placa = const Value.absent(),
                Value<String> clienteId = const Value.absent(),
                Value<String?> descricao = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PatioClientePlacasCompanion(
                operacaoId: operacaoId,
                placa: placa,
                clienteId: clienteId,
                descricao: descricao,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String operacaoId,
                required String placa,
                required String clienteId,
                Value<String?> descricao = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PatioClientePlacasCompanion.insert(
                operacaoId: operacaoId,
                placa: placa,
                clienteId: clienteId,
                descricao: descricao,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PatioClientePlacasTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PatioClientePlacasTable,
      PatioClientePlaca,
      $$PatioClientePlacasTableFilterComposer,
      $$PatioClientePlacasTableOrderingComposer,
      $$PatioClientePlacasTableAnnotationComposer,
      $$PatioClientePlacasTableCreateCompanionBuilder,
      $$PatioClientePlacasTableUpdateCompanionBuilder,
      (
        PatioClientePlaca,
        BaseReferences<
          _$AppDatabase,
          $PatioClientePlacasTable,
          PatioClientePlaca
        >,
      ),
      PatioClientePlaca,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$OperacaoCacheTableTableManager get operacaoCache =>
      $$OperacaoCacheTableTableManager(_db, _db.operacaoCache);
  $$TarifasTableTableManager get tarifas =>
      $$TarifasTableTableManager(_db, _db.tarifas);
  $$TicketsTableTableManager get tickets =>
      $$TicketsTableTableManager(_db, _db.tickets);
  $$CaixaSessoesTableTableManager get caixaSessoes =>
      $$CaixaSessoesTableTableManager(_db, _db.caixaSessoes);
  $$CaixaMovimentosTableTableManager get caixaMovimentos =>
      $$CaixaMovimentosTableTableManager(_db, _db.caixaMovimentos);
  $$SyncLogTableTableManager get syncLog =>
      $$SyncLogTableTableManager(_db, _db.syncLog);
  $$PatioClientesTableTableManager get patioClientes =>
      $$PatioClientesTableTableManager(_db, _db.patioClientes);
  $$PatioClientePlacasTableTableManager get patioClientePlacas =>
      $$PatioClientePlacasTableTableManager(_db, _db.patioClientePlacas);
}

mixin _$OperacaoDaoMixin on DatabaseAccessor<AppDatabase> {
  $OperacaoCacheTable get operacaoCache => attachedDatabase.operacaoCache;
  $TarifasTable get tarifas => attachedDatabase.tarifas;
  OperacaoDaoManager get managers => OperacaoDaoManager(this);
}

class OperacaoDaoManager {
  final _$OperacaoDaoMixin _db;
  OperacaoDaoManager(this._db);
  $$OperacaoCacheTableTableManager get operacaoCache =>
      $$OperacaoCacheTableTableManager(_db.attachedDatabase, _db.operacaoCache);
  $$TarifasTableTableManager get tarifas =>
      $$TarifasTableTableManager(_db.attachedDatabase, _db.tarifas);
}

mixin _$TicketsDaoMixin on DatabaseAccessor<AppDatabase> {
  $TicketsTable get tickets => attachedDatabase.tickets;
  TicketsDaoManager get managers => TicketsDaoManager(this);
}

class TicketsDaoManager {
  final _$TicketsDaoMixin _db;
  TicketsDaoManager(this._db);
  $$TicketsTableTableManager get tickets =>
      $$TicketsTableTableManager(_db.attachedDatabase, _db.tickets);
}

mixin _$CaixaDaoMixin on DatabaseAccessor<AppDatabase> {
  $CaixaSessoesTable get caixaSessoes => attachedDatabase.caixaSessoes;
  $CaixaMovimentosTable get caixaMovimentos => attachedDatabase.caixaMovimentos;
  CaixaDaoManager get managers => CaixaDaoManager(this);
}

class CaixaDaoManager {
  final _$CaixaDaoMixin _db;
  CaixaDaoManager(this._db);
  $$CaixaSessoesTableTableManager get caixaSessoes =>
      $$CaixaSessoesTableTableManager(_db.attachedDatabase, _db.caixaSessoes);
  $$CaixaMovimentosTableTableManager get caixaMovimentos =>
      $$CaixaMovimentosTableTableManager(
        _db.attachedDatabase,
        _db.caixaMovimentos,
      );
}

mixin _$SyncDaoMixin on DatabaseAccessor<AppDatabase> {
  $SyncLogTable get syncLog => attachedDatabase.syncLog;
  SyncDaoManager get managers => SyncDaoManager(this);
}

class SyncDaoManager {
  final _$SyncDaoMixin _db;
  SyncDaoManager(this._db);
  $$SyncLogTableTableManager get syncLog =>
      $$SyncLogTableTableManager(_db.attachedDatabase, _db.syncLog);
}

mixin _$ClientesDaoMixin on DatabaseAccessor<AppDatabase> {
  $PatioClientesTable get patioClientes => attachedDatabase.patioClientes;
  $PatioClientePlacasTable get patioClientePlacas =>
      attachedDatabase.patioClientePlacas;
  ClientesDaoManager get managers => ClientesDaoManager(this);
}

class ClientesDaoManager {
  final _$ClientesDaoMixin _db;
  ClientesDaoManager(this._db);
  $$PatioClientesTableTableManager get patioClientes =>
      $$PatioClientesTableTableManager(_db.attachedDatabase, _db.patioClientes);
  $$PatioClientePlacasTableTableManager get patioClientePlacas =>
      $$PatioClientePlacasTableTableManager(
        _db.attachedDatabase,
        _db.patioClientePlacas,
      );
}
