"""Gera golden/tarifa-contrato.json a partir de golden/origem/.

Uso (na raiz do repositório):  python3 golden/gerar.py

origem/06-grade-simulador.csv e origem/resultados.jsonl são as respostas do
simulador de contrato do CloudPark (ver README.md). A tradução dos contratos
para o modelo do NuvemPark está em `contratos` abaixo: é o ponto de maior
risco — confira contra a grade antes de mudar.
"""
import csv, json, os
from datetime import datetime, timedelta, timezone
aqui = os.path.dirname(os.path.abspath(__file__))
origem = os.path.join(aqui, 'origem')
saida = os.path.join(aqui, 'tarifa-contrato.json')
BRT = timezone(timedelta(hours=-3))  # Brasília sem horário de verão em 2026
def utc(local):
    d = datetime.strptime(local, '%Y-%m-%d %H:%M').replace(tzinfo=BRT)
    return d.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def c(v): return round(float(v) * 100)
def regra(nome, faixas, fracao=None, inicio=None, fim=None, dias=None, usar=False, recomecar=False):
    return {"nome": nome, "inicio": inicio, "fim": fim, "dias": dias,
            "usar_minutos_pagos": usar, "recomecar_tabela": recomecar,
            "faixas": [{"ate_minutos": a, "valor_centavos": v} for a, v in faixas],
            "fracao": None if fracao is None else {"minutos": fracao[0], "valor_centavos": fracao[1]}}
def contrato(regras, diaria=None, menor=False, mais24=False):
    return {"versao": 1, "mais_de_24h": mais24, "diaria_centavos": diaria,
            "cobrar_menor_valor": menor, "regras": regras}
padrao_c1 = regra("Padrão", [(15, 0), (60, 1000), (120, 1500)], (60, 500))
padrao_c4 = regra("Padrão", [(60, 1000)], (60, 500))
noturno = lambda usar: regra("Noturno", [(720, 2500)], (60, 500), "20:00", "06:00", [1,2,3,4,5,6,7], usar)
contratos = {
  "C1": contrato([padrao_c1]),
  "C2": contrato([padrao_c1], diaria=4000),
  "C3": contrato([regra("Padrão", [(60, 1000), (180, 2000)], None, recomecar=True)]),
  "C4": contrato([padrao_c4, noturno(False)]),
  "C5": contrato([padrao_c4, noturno(True)]),
  "C6": contrato([padrao_c4, noturno(False)], menor=True),
  "C7": contrato([padrao_c4, regra("FDS", [(60, 1500)], (60, 800), "00:00", "23:59", [6, 7])]),
  "C10": contrato([regra("Padrão", [(1440, 4000), (2880, 7000)], (1440, 3000))], mais24=True),
}
grade = {r['caso']: r for r in csv.DictReader(open(os.path.join(origem, '06-grade-simulador.csv'), encoding='utf-8'))}
casos = []
for l in open(os.path.join(origem, 'resultados.jsonl'), encoding='utf-8'):
    r = json.loads(l)
    if r['contrato'] in ('C8', 'C9'): continue
    g = grade[r['caso']]
    total, _, restantes, _, mem = r['raw']
    fatias = []
    for m in mem:
        if m['name'] == 'Diária':
            q = int(m['description'].split(' por ')[1].split()[0])
            fatias.append({"diarias": q, "valor_centavos": c(m['value'])})
        else:
            fatias.append({"regra": m['name'], "valor_centavos": c(m['value'])})
    assert sum(f['valor_centavos'] for f in fatias) == c(total), r['caso']
    casos.append({
        "id": r['caso'], "contrato": r['contrato'], "objetivo": g['objetivo'],
        "entrada_local": g['entrada'], "saida_local": g['validacao'],
        "entrada": utc(g['entrada']), "saida": utc(g['validacao']),
        "total_centavos": c(total), "minutos_restantes": int(restantes),
        "fatias": fatias,
        "memoria_cloudpark": " / ".join(f"{m['name']}: {m['description']}" for m in mem),
    })
out = {
  "versao": 1,
  "fuso": "America/Sao_Paulo",
  "origem": "Simulador de contrato do CloudPark, pátio 1639 (fora de uso), contratos REF C1–C10, rodado em 2026-10-14. Respostas brutas em golden/origem/. C8 (hotel) e C9 (convênio) ficam fora: spec tarifa-contrato, decisão 2.",
  "contratos": contratos,
  "casos": casos,
}
with open(saida, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(len(casos), 'casos;', len(contratos), 'contratos')
