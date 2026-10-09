"use client";

import { useState } from "react";

/** Tarifa avulsa candidata a cobrar o atraso de uma estadia. */
export type AvulsaAtraso = {
  id: string;
  nome: string;
  tipo_veiculo: string;
  tolerancia_minutos: number;
};

const cssLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};
const cssInput: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#FAFBFC",
  fontSize: 13,
  color: "#1F2937",
  padding: "0 13px",
  outline: "none",
};
const cssGrid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * "Como cobra": avulso (pelo tempo) ou diária de hóspede (db/41). É o primeiro
 * campo do formulário porque decide quais outros aparecem.
 */
export function ComoCobra({
  valor,
  aoMudar,
}: {
  valor: "avulso" | "hospede";
  aoMudar: (v: "avulso" | "hospede") => void;
}) {
  const opcao = (
    v: "avulso" | "hospede",
    titulo: string,
    descricao: string,
  ) => {
    const sel = valor === v;
    return (
      <label
        style={{
          border: `2px solid ${sel ? "#16A34A" : "#E4E8EC"}`,
          background: sel ? "#F0FDF4" : "#fff",
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          cursor: "pointer",
        }}
      >
        <input
          type="radio"
          name="como_cobra"
          checked={sel}
          onChange={() => aoMudar(v)}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: "#15803D" }}
        />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1F2937" }}>{titulo}</span>
          <span style={{ fontSize: 12, color: "#6B7280" }}>{descricao}</span>
        </span>
      </label>
    );
  };
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ ...cssLabel, padding: 0 }}>COMO COBRA</legend>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {opcao(
          "avulso",
          "Avulso",
          "Cobra pelo tempo na saída: frações, tolerância, teto e pernoite.",
        )}
        {opcao(
          "hospede",
          "Diária de hóspede",
          "Paga na chegada, por diária. Entra e sai à vontade até vencer.",
        )}
      </div>
    </fieldset>
  );
}

/** Campos da tarifa de hóspede + prévia de como fica para o hóspede. */
export function CamposHospede({
  tipo,
  avulsas,
  inicial,
}: {
  tipo: string;
  avulsas: AvulsaAtraso[];
  inicial?: {
    diaria_valor: number | null;
    diaria_horas: number | null;
    tarifa_atraso_id: string | null;
  };
}) {
  const [valor, setValor] = useState(String(inicial?.diaria_valor ?? "30.00"));
  const [horas, setHoras] = useState(String(inicial?.diaria_horas ?? "24"));
  const [atrasoId, setAtrasoId] = useState(inicial?.tarifa_atraso_id ?? "");

  const doTipo = avulsas.filter((a) => a.tipo_veiculo === tipo || a.tipo_veiculo === "ambos");
  const atraso = doTipo.find((a) => a.id === atrasoId) ?? doTipo[0];
  const v = Number(valor.replace(",", ".")) || 0;
  const h = Number(horas) || 0;

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={cssGrid3}>
        <div>
          <label style={cssLabel} htmlFor="diaria_valor">
            VALOR DA DIÁRIA (R$)
          </label>
          <input
            id="diaria_valor"
            name="diaria_valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="mono"
            style={cssInput}
          />
        </div>
        <div>
          <label style={cssLabel} htmlFor="diaria_horas">
            DURAÇÃO DA DIÁRIA (H)
          </label>
          <input
            id="diaria_horas"
            name="diaria_horas"
            type="number"
            min={1}
            max={168}
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            className="mono"
            style={cssInput}
          />
        </div>
        <div>
          <label style={cssLabel} htmlFor="tarifa_atraso_id">
            TABELA DO ATRASO
          </label>
          <select
            id="tarifa_atraso_id"
            name="tarifa_atraso_id"
            value={atrasoId}
            onChange={(e) => setAtrasoId(e.target.value)}
            style={{ ...cssInput, fontWeight: 600 }}
          >
            <option value="">
              {doTipo[0] ? `Primeira avulsa (${doTipo[0].nome})` : "Nenhuma avulsa — atraso em diárias"}
            </option>
            {doTipo.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          background: "#F4F8F5",
          borderRadius: 14,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 13,
          color: "#1F2937",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "#15803D" }}>
          COMO FICA PARA O HÓSPEDE
        </span>
        <span>
          3 diárias = <b>{brl(3 * v)}</b>, válidas por {3 * h} h a partir da contratação.
        </span>
        <span>
          {atraso ? (
            <>
              Se sair depois do vencimento, o atraso é cobrado pela tabela <b>{atraso.nome}</b> (com a
              tolerância de {atraso.tolerancia_minutos} min dela), no máximo <b>{brl(v)}</b> a cada {h} h.
            </>
          ) : (
            <>Sem tabela avulsa deste tipo: cada período de atraso começado vale uma diária ({brl(v)}).</>
          )}
        </span>
      </div>
    </div>
  );
}
