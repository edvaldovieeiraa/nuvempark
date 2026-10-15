"use client";

import { Plus, Trash2, X } from "lucide-react";
import { Confirmar } from "@/components/ui/confirmar";
import {
  adicionarFaixa,
  horaDoDia,
  novaFaixa,
  type Disponibilidade,
  type ErroCampo,
  type RegraForm,
} from "@/lib/contrato-painel";
import {
  aria,
  AvisoInfo,
  BlocoNaoSuportado,
  Chip,
  COR,
  cssBtnOutline,
  cssInput,
  cssInputErro,
  cssLabel,
  MensagemErro,
  Motivo,
  Origem,
} from "./estilo-contrato";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_EXTENSO = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

/** Campo de valor com o "R$" fora do texto (design, observação 14). */
function CampoReais({
  campo,
  rotulo,
  valor,
  erro,
  aoMudar,
  aoSair,
  largura,
}: {
  campo: string;
  rotulo: string;
  valor: string;
  erro: ErroCampo | undefined;
  aoMudar: (v: string) => void;
  aoSair: () => void;
  largura?: number;
}) {
  return (
    <div style={{ position: "relative", width: largura }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 12,
          color: "#8695A0",
          pointerEvents: "none",
        }}
      >
        R$
      </span>
      <input
        {...aria(campo, erro)}
        aria-label={rotulo}
        inputMode="decimal"
        autoComplete="off"
        className="mono"
        value={valor}
        placeholder="0,00"
        onChange={(e) => aoMudar(e.target.value)}
        onBlur={aoSair}
        style={{ ...cssInput, paddingLeft: 34, ...(erro ? cssInputErro : {}) }}
      />
    </div>
  );
}

function CampoHora({
  campo,
  rotulo,
  valor,
  erro,
  aoMudar,
  aoSair,
  placeholder = "1:00",
}: {
  campo: string;
  /** Sem rótulo visível por linha (faixas); com `<label>` visível, omitir. */
  rotulo?: string;
  valor: string;
  erro: ErroCampo | undefined;
  aoMudar: (v: string) => void;
  aoSair: () => void;
  placeholder?: string;
}) {
  return (
    <input
      {...aria(campo, erro)}
      aria-label={rotulo}
      inputMode="numeric"
      autoComplete="off"
      className="mono"
      value={valor}
      placeholder={placeholder}
      onChange={(e) => aoMudar(e.target.value)}
      onBlur={aoSair}
      style={{ ...cssInput, ...(erro ? cssInputErro : {}) }}
    />
  );
}

/**
 * Cartão de uma regra do contrato: nome, janela e dias (regra por horário),
 * faixas "até / total até aqui", o que cobrar depois da última faixa e o
 * exemplo calculado ao vivo. A Padrão não tem janela nem pode ser removida.
 */
export function RegraContrato({
  regra,
  indice,
  disp,
  erro,
  naoSuportados,
  tocar,
  mudar,
  remover,
  origem,
  exemplo,
}: {
  regra: RegraForm;
  indice: number;
  disp: Disponibilidade;
  erro: (campo: string) => ErroCampo | undefined;
  naoSuportados: ErroCampo[];
  tocar: (campo: string) => void;
  /** `tocado`: campo a marcar como visto na mesma mudança (chips e caixas). */
  mudar: (fn: (r: RegraForm) => RegraForm, tocado?: string) => void;
  remover?: () => void;
  origem?: (caminho: string) => string | undefined;
  exemplo: string | null;
}) {
  const p = `ct-r${indice}`;
  const padrao = indice === 0;
  const titulo = padrao ? "Padrão" : regra.nome.trim() || "Regra por horário";
  const recomecar = disp.recomecar(indice);
  const pagos = disp.minutosPagos(indice);
  const maisFaixa = adicionarFaixa(regra.faixas.length);

  const inicio = horaDoDia(regra.inicio);
  const fim = horaDoDia(regra.fim);
  const viraODia = inicio.ok && fim.ok && fim.minutos < inicio.minutos;

  const mudarFaixa = (j: number, campo: "ate" | "valor", v: string) =>
    mudar((r) => ({
      ...r,
      faixas: r.faixas.map((f, k) => (k === j ? { ...f, [campo]: v } : f)),
    }));

  const erroLista = erro(`${p}-faixas`);
  const erroDepois = erro(`${p}-depois`);

  return (
    <section
      aria-labelledby={`${p}-titulo`}
      style={{
        border: `1px solid ${naoSuportados.length > 0 ? COR.ambar.borda : "#E4E8EC"}`,
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 id={`${p}-titulo`} style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1F2937" }}>
            {titulo}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
            {padrao
              ? "Vale sempre que nenhuma regra por horário vale."
              : "Vale nos dias e no horário escolhidos."}
          </p>
        </div>
        {remover && (
          <Confirmar
            titulo="Remover regra?"
            descricao={`A regra “${titulo}” sai do contrato. Nada é gravado até você salvar.`}
            rotuloConfirmar="Remover"
            aoConfirmar={async () => remover()}
          >
            {(abrir) => (
              <button
                type="button"
                onClick={abrir}
                aria-label={`Remover a regra ${titulo}`}
                title="Remover regra"
                style={{ ...cssBtnOutline, width: 44, padding: 0 }}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            )}
          </Confirmar>
        )}
      </div>

      {!padrao && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 12 }}>
            <div>
              <label htmlFor={`${p}-nome`} style={cssLabel}>
                NOME
              </label>
              <input
                {...aria(`${p}-nome`, erro(`${p}-nome`))}
                value={regra.nome}
                maxLength={60}
                onChange={(e) => mudar((r) => ({ ...r, nome: e.target.value }))}
                onBlur={() => tocar(`${p}-nome`)}
                style={{ ...cssInput, ...(erro(`${p}-nome`) ? cssInputErro : {}) }}
              />
              <MensagemErro erro={erro(`${p}-nome`)} />
            </div>
            <div>
              <label htmlFor={`${p}-inicio`} style={cssLabel}>
                DE
              </label>
              <CampoHora
                campo={`${p}-inicio`}
                valor={regra.inicio}
                erro={erro(`${p}-inicio`)}
                placeholder="20:00"
                aoMudar={(v) => mudar((r) => ({ ...r, inicio: v }))}
                aoSair={() => tocar(`${p}-inicio`)}
              />
              <MensagemErro erro={erro(`${p}-inicio`)} />
            </div>
            <div>
              <label htmlFor={`${p}-fim`} style={cssLabel}>
                ATÉ
              </label>
              <CampoHora
                campo={`${p}-fim`}
                valor={regra.fim}
                erro={erro(`${p}-fim`)}
                placeholder="06:00"
                aoMudar={(v) => mudar((r) => ({ ...r, fim: v }))}
                aoSair={() => tocar(`${p}-fim`)}
              />
              <MensagemErro erro={erro(`${p}-fim`)} />
            </div>
          </div>
          {viraODia && (
            <AvisoInfo>Termina às {regra.fim.trim()} do dia seguinte.</AvisoInfo>
          )}

          <div>
            <span id={`${p}-dias-rotulo`} style={cssLabel}>
              DIAS EM QUE COMEÇA
            </span>
            <div
              id={`${p}-dias`}
              tabIndex={-1}
              role="group"
              aria-labelledby={`${p}-dias-rotulo`}
              aria-describedby={erro(`${p}-dias`) ? `${p}-dias-erro` : undefined}
              className="grid grid-cols-4 sm:flex sm:flex-wrap"
              style={{ gap: 8 }}
            >
              {DIAS.map((d, k) => {
                const dia = k + 1;
                const sel = regra.dias.includes(dia);
                return (
                  <Chip
                    key={d}
                    papel="toggle"
                    selecionado={sel}
                    aria-label={DIAS_EXTENSO[k]}
                    aoClicar={() =>
                      mudar(
                        (r) => ({
                          ...r,
                          dias: sel
                            ? r.dias.filter((x) => x !== dia)
                            : [...r.dias, dia].sort((a, b) => a - b),
                        }),
                        `${p}-dias`,
                      )
                    }
                  >
                    {d}
                  </Chip>
                );
              })}
            </div>
            <MensagemErro erro={erro(`${p}-dias`)} />
          </div>

          {pagos !== "ausente" && (
            <div>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  minHeight: 44,
                  cursor: pagos && !regra.usarMinutosPagos ? "not-allowed" : "pointer",
                }}
              >
                <input
                  id={`${p}-pagos`}
                  type="checkbox"
                  checked={regra.usarMinutosPagos}
                  disabled={!!pagos && !regra.usarMinutosPagos}
                  aria-describedby={pagos ? `${p}-pagos-motivo` : undefined}
                  onChange={(e) =>
                    mudar((r) => ({ ...r, usarMinutosPagos: e.target.checked }), `${p}-pagos`)
                  }
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: COR.verde }}
                />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>
                    Usar todos os minutos pagos
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    Quem pagou a faixa inteira pode ficar até o fim dela, mesmo depois do fim da janela.
                  </span>
                </span>
              </label>
              {pagos && <Motivo id={`${p}-pagos-motivo`} motivo={pagos} />}
            </div>
          )}
        </>
      )}

      {/* ── Faixas ── */}
      <div id={`${p}-faixas`} tabIndex={-1} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          aria-hidden
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr) 44px",
            gap: 10,
            maxWidth: 560,
            fontSize: 11,
            fontWeight: 700,
            color: "#6B7280",
          }}
        >
          <span>ATÉ</span>
          <span>TOTAL ATÉ AQUI</span>
          <span />
        </div>
        {regra.faixas.map((f, j) => {
          const eAte = erro(`${p}-f${j}-ate`);
          const eValor = erro(`${p}-f${j}-valor`);
          const n = j + 1;
          const gratis = j === 0 && /^\s*(R\$\s*)?0+([.,]0+)?\s*$/.test(f.valor);
          const etiqueta = origem?.(`regras[${indice}].faixas[${j}]`);
          return (
            <div key={f.id}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr) 44px",
                  gap: 10,
                  maxWidth: 560,
                  alignItems: "center",
                }}
              >
                <CampoHora
                  campo={`${p}-f${j}-ate`}
                  rotulo={`${titulo}, faixa ${n}: até`}
                  valor={f.ate}
                  erro={eAte}
                  aoMudar={(v) => mudarFaixa(j, "ate", v)}
                  aoSair={() => tocar(`${p}-f${j}-ate`)}
                />
                <CampoReais
                  campo={`${p}-f${j}-valor`}
                  rotulo={`${titulo}, faixa ${n}: total até aqui`}
                  valor={f.valor}
                  erro={eValor}
                  aoMudar={(v) => mudarFaixa(j, "valor", v)}
                  aoSair={() => tocar(`${p}-f${j}-valor`)}
                />
                <button
                  type="button"
                  disabled={regra.faixas.length === 1}
                  onClick={() => mudar((r) => ({ ...r, faixas: r.faixas.filter((_, k) => k !== j) }))}
                  aria-label={`Remover a faixa ${n} de ${titulo}`}
                  title="Remover faixa"
                  className="disabled:opacity-30"
                  style={{ ...cssBtnOutline, width: 44, padding: 0 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              {(gratis || etiqueta) && (
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {gratis && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: COR.verde,
                        background: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: 999,
                        padding: "1px 8px",
                      }}
                    >
                      Grátis
                    </span>
                  )}
                  {etiqueta && <Origem texto={etiqueta} />}
                </div>
              )}
              <MensagemErro erro={eAte} />
              <MensagemErro erro={eValor} />
            </div>
          );
        })}
        <div>
          <button
            type="button"
            disabled={!!maisFaixa}
            aria-describedby={maisFaixa ? `${p}-faixa-motivo` : undefined}
            onClick={() => mudar((r) => ({ ...r, faixas: [...r.faixas, novaFaixa()] }))}
            className="disabled:opacity-50"
            style={{ ...cssBtnOutline, color: COR.verde }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Adicionar faixa
          </button>
          {maisFaixa && <Motivo id={`${p}-faixa-motivo`} motivo={maisFaixa} />}
        </div>
        <MensagemErro erro={erroLista} />
      </div>

      {/* ── Depois da última faixa ── */}
      <div>
        <span id={`${p}-depois-rotulo`} style={cssLabel}>
          DEPOIS DA ÚLTIMA FAIXA
        </span>
        <div
          id={`${p}-depois`}
          tabIndex={-1}
          role="radiogroup"
          aria-labelledby={`${p}-depois-rotulo`}
          aria-describedby={recomecar ? `${p}-recomecar-motivo` : undefined}
          onKeyDown={(e) => {
            // Radiogroup: as setas trocam a escolha (o Tab entra só na escolhida).
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
            e.preventDefault();
            const proximo = !regra.recomecarTabela;
            if (proximo && recomecar) return;
            mudar((r) => ({ ...r, recomecarTabela: proximo }), `${p}-depois`);
            requestAnimationFrame(() =>
              document.getElementById(`${p}-depois-${proximo ? "recomecar" : "fracao"}`)?.focus(),
            );
          }}
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          <Chip
            papel="radio"
            id={`${p}-depois-fracao`}
            tabIndex={regra.recomecarTabela ? -1 : 0}
            selecionado={!regra.recomecarTabela}
            aoClicar={() => mudar((r) => ({ ...r, recomecarTabela: false }), `${p}-depois`)}
          >
            Cobrar fração
          </Chip>
          <Chip
            papel="radio"
            id={`${p}-depois-recomecar`}
            tabIndex={regra.recomecarTabela ? 0 : -1}
            selecionado={regra.recomecarTabela}
            desabilitado={!!recomecar && !regra.recomecarTabela}
            aoClicar={() => mudar((r) => ({ ...r, recomecarTabela: true }), `${p}-depois`)}
          >
            Recomeçar a tabela
          </Chip>
        </div>
        {recomecar && !regra.recomecarTabela && (
          <Motivo id={`${p}-recomecar-motivo`} motivo={recomecar} />
        )}
        {erroDepois && !erroDepois.codigo.startsWith("nao_provado_") && (
          <MensagemErro erro={erroDepois} />
        )}
      </div>

      {!regra.recomecarTabela && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 13 }}>
          <CampoReais
            campo={`${p}-fracao-valor`}
            rotulo={`${titulo}: valor de cada fração`}
            valor={regra.fracaoValor}
            erro={erro(`${p}-fracao-valor`)}
            largura={150}
            aoMudar={(v) => mudar((r) => ({ ...r, fracaoValor: v }))}
            aoSair={() => tocar(`${p}-fracao-valor`)}
          />
          <span>a cada</span>
          <div style={{ width: 110 }}>
            <CampoHora
              campo={`${p}-fracao-min`}
              rotulo={`${titulo}: tamanho da fração`}
              valor={regra.fracaoMinutos}
              erro={erro(`${p}-fracao-min`)}
              aoMudar={(v) => mudar((r) => ({ ...r, fracaoMinutos: v }))}
              aoSair={() => tocar(`${p}-fracao-min`)}
            />
          </div>
          {origem?.(`regras[${indice}].fracao`) && (
            <Origem texto={origem(`regras[${indice}].fracao`)!} />
          )}
          <div style={{ flexBasis: "100%" }}>
            <MensagemErro erro={erro(`${p}-fracao-valor`)} />
            <MensagemErro erro={erro(`${p}-fracao-min`)} />
          </div>
        </div>
      )}

      {naoSuportados.map((e) => (
        <BlocoNaoSuportado key={e.caminho + e.codigo} erro={e} />
      ))}

      {exemplo && (
        <p style={{ margin: 0, fontSize: 12, color: "#4B5563" }}>
          Exemplo: <b className="mono" style={{ color: "#1F2937" }}>{exemplo}</b>
        </p>
      )}
    </section>
  );
}
