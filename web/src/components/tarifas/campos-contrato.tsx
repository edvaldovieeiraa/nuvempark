"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronDown, Gauge, Info, Loader2, Plus, Save } from "lucide-react";
import {
  atualizarContrato,
  criarContrato,
  type ResultadoContrato,
} from "@/app/painel/tarifas/contrato-actions";
import { lerContrato, type Contrato } from "@/lib/contrato";
import {
  adicionarRegra,
  contratoParaJson,
  disponibilidade,
  exemploDaRegra,
  formDeContrato,
  formVazio,
  lerForm,
  naoSuportado,
  removerRegra,
  type AvisoConversao,
  type ContratoForm,
  type ErroCampo,
  type RegraForm,
} from "@/lib/contrato-painel";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";
import { RegraContrato } from "./regra-contrato";
import { ModalSimuladorContrato } from "./simulador-contrato-modal";
import {
  aria,
  BlocoNaoSuportado,
  COR,
  cssBtnOutline,
  cssInput,
  cssInputErro,
  cssLabel,
  MensagemErro,
  Motivo,
  Origem,
} from "./estilo-contrato";

export interface ConversaoInicial {
  tarifaNome: string;
  avisos: AvisoConversao[];
  /** Caminho no contrato → etiqueta de origem. */
  origem: Record<string, string>;
}

/** Campos que ficam dentro de "Opções do contrato" (o `<details>` do celular). */
const CAMPOS_OPCOES = new Set(["ct-diaria", "ct-menor", "ct-mais24"]);

function lerInicial(json: unknown): ContratoForm | null {
  try {
    return formDeContrato(lerContrato(json));
  } catch {
    return null;
  }
}

/** Tudo que o formulário recusa: o nome do contrato + o que `lerForm` acusa. */
function errosDe(form: ContratoForm | null, nome: string): ErroCampo[] {
  const nomeVazio: ErroCampo[] = nome.trim()
    ? []
    : [{ caminho: "nome", codigo: "nome_contrato", campo: "ct-nome", mensagem: "Dê um nome ao contrato." }];
  return [...nomeVazio, ...(form ? lerForm(form).erros : [])];
}

/**
 * Formulário do contrato (Feature 2a) — criar, criar a partir de uma tarifa
 * avulsa ou editar. Tem `<form>` e ação próprios: um contrato nunca passa por
 * `criarTarifa`/`atualizarTarifa`, que o regravariam como avulso.
 *
 * Erros: a mensagem do campo aparece depois que o campo foi visto (blur ou
 * clique) ou na tentativa de salvar; o resumo do topo (`aria-live="polite"`)
 * só é recalculado nesses momentos, nunca a cada tecla.
 */
export function FormContrato({
  modo,
  patioId,
  tipos,
  topo,
  inicial,
  conversao,
}: {
  modo: "criar" | "editar";
  patioId: string;
  tipos: string[];
  /** "Como cobra", no modo criar. */
  topo?: React.ReactNode;
  inicial?: { id?: string; nome: string; tipoVeiculo: string; json: unknown };
  conversao?: ConversaoInicial;
}) {
  const router = useRouter();
  const toast = useToast();
  const voltar = `/painel/tarifas?patio=${patioId}`;

  const [form, setForm] = useState<ContratoForm | null>(() =>
    inicial ? lerInicial(inicial.json) : formVazio(),
  );
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [tipo, setTipo] = useState(inicial?.tipoVeiculo ?? tipos[0] ?? "carro");
  const [tocados, setTocados] = useState<Set<string>>(() => new Set());
  // Na edição, o contrato salvo já mostra o que estiver errado nele.
  const [tentou, setTentou] = useState(modo === "editar");
  const [resumo, setResumo] = useState<ErroCampo[]>(() =>
    modo === "editar" && inicial ? errosDe(lerInicial(inicial.json), inicial.nome) : [],
  );
  const [opcoesAbertas, setOpcoesAbertas] = useState(true);
  const [simulando, setSimulando] = useState<Contrato | null>(null);
  const [sujo, setSujo] = useState(false);
  const faixasConvertidas = form?.regras[0]?.faixas.length;
  const [faixasOriginais] = useState(faixasConvertidas);

  const { contrato, erros } = useMemo(
    () => ({ contrato: form ? lerForm(form).contrato : null, erros: errosDe(form, nome) }),
    [form, nome],
  );
  const podeSalvar = !!contrato && erros.length === 0;

  const visiveis = (lista: ErroCampo[], vistos: Set<string>, todos: boolean) =>
    lista.filter((e) => todos || vistos.has(e.campo) || naoSuportado(e.codigo));
  const erroDe = (campo: string) => visiveis(erros, tocados, tentou).find((e) => e.campo === campo);

  const [estado, agir, pendente] = useActionState<ResultadoContrato, FormData>(
    async (anterior, dados) => {
      const r = await (modo === "criar" ? criarContrato : atualizarContrato)(anterior, dados);
      if (r && !r.ok && r.erros?.length) {
        setTentou(true);
        setResumo(r.erros);
      }
      return r;
    },
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso(modo === "criar" ? "Contrato criado!" : "Contrato salvo!", estado.msg);
      router.push(voltar);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router, voltar, modo]);

  // Recarregar ou fechar a aba com alterações não salvas.
  useEffect(() => {
    if (!sujo || estado?.ok) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo, estado]);

  /** Aplica uma mudança; `tocado` marca o campo como visto e atualiza o resumo. */
  function aplicar(proximo: ContratoForm, tocado?: string) {
    setForm(proximo);
    setSujo(true);
    if (tocado) {
      const vistos = new Set(tocados).add(tocado);
      setTocados(vistos);
      setResumo(visiveis(errosDe(proximo, nome), vistos, tentou));
    }
  }

  function tocar(campo: string) {
    const vistos = new Set(tocados).add(campo);
    setTocados(vistos);
    setResumo(visiveis(errosDe(form, nome), vistos, tentou));
  }

  function mostrarTodos() {
    setTentou(true);
    setResumo(errosDe(form, nome));
    requestAnimationFrame(() => document.getElementById("ct-resumo")?.focus());
  }

  function irPara(campo: string) {
    if (CAMPOS_OPCOES.has(campo)) setOpcoesAbertas(true);
    requestAnimationFrame(() => {
      const el = document.getElementById(campo);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    });
  }

  function mudarRegra(i: number, fn: (r: RegraForm) => RegraForm, tocado?: string) {
    if (!form) return;
    aplicar({ ...form, regras: form.regras.map((r, k) => (k === i ? fn(r) : r)) }, tocado);
  }

  function comAvisos(r: { form: ContratoForm; avisos: string[] }) {
    aplicar(r.form, "ct-regras");
    for (const a of r.avisos) toast.info(a);
  }

  const disp = form ? disponibilidade(form) : null;
  const origem = (caminho: string) => {
    if (!conversao) return undefined;
    // Faixas mudaram de lugar: as etiquetas não valem mais.
    if (caminho.includes(".faixas[") && faixasConvertidas !== faixasOriginais) return undefined;
    return conversao.origem[caminho];
  };

  const nErros = erros.length;
  const porque = `Corrija ${nErros === 1 ? "1 item" : `${nErros} itens`} para salvar e simular.`;

  return (
    <form
      action={agir}
      noValidate
      style={{
        background: "#fff",
        border: "1px solid #E4E8EC",
        borderRadius: 16,
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <input type="hidden" name="patio_id" value={patioId} />
      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      <input
        type="hidden"
        name="contrato"
        value={contrato ? JSON.stringify(contratoParaJson(contrato)) : ""}
      />

      {topo}

      {conversao && <CaixaConversao conversao={conversao} />}

      <div
        id="ct-resumo"
        tabIndex={-1}
        aria-live="polite"
        style={{ outline: "none" }}
      >
        {resumo.length > 0 && (
          <div
            style={{
              border: `1px solid ${COR.erro.borda}`,
              background: COR.erro.fundo,
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COR.erro.forte }}>
              Corrija {resumo.length === 1 ? "1 item" : `${resumo.length} itens`} para salvar
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: "flex", flexDirection: "column", gap: 2 }}>
              {resumo.map((e) => (
                <li key={`${e.campo}:${e.codigo}`}>
                  <a
                    href={`#${e.campo}`}
                    onClick={(ev) => {
                      ev.preventDefault();
                      irPara(e.campo);
                    }}
                    style={{ color: COR.erro.texto, textDecoration: "underline" }}
                  >
                    {rotuloDoCampo(e, form)}: {e.mensagem}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
        <div>
          <label htmlFor="ct-nome" style={cssLabel}>
            NOME
          </label>
          <input
            {...aria("ct-nome", erroDe("ct-nome"))}
            name="nome"
            value={nome}
            maxLength={80}
            placeholder="Rotativo 2027"
            onChange={(e) => {
              setNome(e.target.value);
              setSujo(true);
            }}
            onBlur={() => tocar("ct-nome")}
            style={{ ...cssInput, ...(erroDe("ct-nome") ? cssInputErro : {}) }}
          />
          <MensagemErro erro={erroDe("ct-nome")} />
        </div>
        <div>
          <label htmlFor="ct-tipo" style={cssLabel}>
            TIPO DE VEÍCULO
          </label>
          <div style={{ position: "relative" }}>
            <select
              id="ct-tipo"
              name="tipo_veiculo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setSujo(true);
              }}
              style={{ ...cssInput, appearance: "none", WebkitAppearance: "none", fontWeight: 600, paddingRight: 34 }}
            >
              {!tipos.includes(tipo) && tipo !== "ambos" && <option value={tipo}>{nomeAmigavel(tipo)}</option>}
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {nomeAmigavel(t)}
                </option>
              ))}
              <option value="ambos">Todos os tipos</option>
            </select>
            <ChevronDown
              aria-hidden
              style={{
                position: "absolute",
                right: 13,
                top: "50%",
                transform: "translateY(-50%)",
                width: 14,
                height: 14,
                color: "#8695A0",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {!form || !disp ? (
        <div
          role="alert"
          style={{
            border: `1px solid ${COR.ambar.borda}`,
            background: COR.ambar.fundo,
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: COR.ambar.texto }}>
            Este contrato não pôde ser lido
          </span>
          <span style={{ fontSize: 13, color: COR.ambar.forte }}>
            O conteúdo salvo não tem a forma de um contrato (pode ter sido alterado fora do
            painel). Recomece do zero para montá-lo de novo; nada é gravado até você salvar.
          </span>
          <button type="button" onClick={() => aplicar(formVazio())} style={cssBtnOutline}>
            Recomeçar do zero
          </button>
        </div>
      ) : (
        <>
          <OpcoesContrato
            form={form}
            aberto={opcoesAbertas}
            aoAbrir={setOpcoesAbertas}
            erroDe={erroDe}
            origemDiaria={origem("diaria_centavos")}
            aplicar={aplicar}
            tocar={tocar}
          />

          {form.regras.map((r, i) => (
            <RegraContrato
              key={r.id}
              regra={r}
              indice={i}
              disp={disp}
              erro={(campo) => {
                const e = erroDe(campo);
                return e && !naoSuportado(e.codigo) ? e : undefined;
              }}
              naoSuportados={erros.filter(
                (e) =>
                  naoSuportado(e.codigo) &&
                  e.campo.startsWith(`ct-r${i}-`) &&
                  e.codigo !== "nao_provado_diaria_com_regras",
              )}
              tocar={tocar}
              mudar={(fn, tocado) => mudarRegra(i, fn, tocado)}
              remover={i > 0 ? () => comAvisos(removerRegra(form, i)) : undefined}
              origem={origem}
              exemplo={exemploIsolado(r, form.maisDe24h)}
            />
          ))}

          <div id="ct-regras" tabIndex={-1} style={{ display: "flex", flexDirection: "column", gap: 6, outline: "none" }}>
            <button
              type="button"
              disabled={!!disp.adicionarRegra}
              aria-describedby={disp.adicionarRegra ? "ct-regra-motivo" : "ct-regra-conceito"}
              onClick={() => comAvisos(adicionarRegra(form))}
              style={{
                ...cssBtnOutline,
                minHeight: 52,
                border: `2px dashed ${disp.adicionarRegra ? "#E5E7EB" : "#BBF7D0"}`,
                background: disp.adicionarRegra ? "#F9FAFB" : "#F0FDF4",
                color: disp.adicionarRegra ? "#9CA3AF" : COR.verde,
                cursor: disp.adicionarRegra ? "not-allowed" : "pointer",
              }}
            >
              <Plus aria-hidden style={{ width: 15, height: 15 }} />
              Adicionar regra por horário
            </button>
            {disp.adicionarRegra && <Motivo id="ct-regra-motivo" motivo={disp.adicionarRegra} />}
            <p id="ct-regra-conceito" style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>
              Quando o carro passa de uma regra para outra, a nova regra cobra do zero. Ex.: 05:00 →
              08:00 = R$ 25,00 (Noturno) + R$ 15,00 (Padrão).
            </p>
            <MensagemErro erro={erroDe("ct-regras")} />
          </div>
        </>
      )}

      {/* ── Ações: Criar/Salvar, Simular, Cancelar (ordem do formulário atual) ── */}
      <div
        className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center"
        style={{ gap: 10, borderTop: "1px solid #EEF1F3", paddingTop: 18 }}
      >
        <button
          type="submit"
          disabled={pendente || !podeSalvar}
          aria-describedby={!podeSalvar ? "ct-porque" : undefined}
          className="w-full sm:w-auto"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 48,
            padding: "0 18px",
            borderRadius: 11,
            border: "none",
            background: podeSalvar ? "linear-gradient(90deg,#16A34A,#22C55E)" : "#E5E7EB",
            fontSize: 13,
            fontWeight: 700,
            color: podeSalvar ? "#fff" : "#6B7280",
            cursor: pendente || !podeSalvar ? "default" : "pointer",
            opacity: pendente ? 0.7 : 1,
          }}
        >
          {pendente ? (
            <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
          ) : modo === "criar" ? (
            <Plus style={{ width: 15, height: 15 }} />
          ) : (
            <Save style={{ width: 15, height: 15 }} />
          )}
          {pendente ? "Salvando…" : modo === "criar" ? "Criar contrato" : "Salvar alterações"}
        </button>
        <button
          type="button"
          disabled={!contrato}
          onClick={() => contrato && setSimulando(contrato)}
          aria-describedby={!contrato ? "ct-porque" : undefined}
          className="w-full sm:w-auto disabled:opacity-50"
          style={cssBtnOutline}
        >
          <Gauge style={{ width: 15, height: 15 }} />
          Simular
        </button>
        {sujo && modo === "editar" ? (
          <Confirmar
            titulo="Descartar alterações?"
            descricao="As mudanças deste contrato ainda não foram salvas."
            rotuloConfirmar="Descartar"
            aoConfirmar={async () => router.push(voltar)}
          >
            {(abrir) => (
              <button type="button" onClick={abrir} className="w-full sm:w-auto" style={cssBtnOutline}>
                Cancelar
              </button>
            )}
          </Confirmar>
        ) : (
          <button type="button" onClick={() => router.push(voltar)} className="w-full sm:w-auto" style={cssBtnOutline}>
            Cancelar
          </button>
        )}
        {!podeSalvar && form && (
          <span id="ct-porque" style={{ fontSize: 12, color: "#6B7280" }}>
            {porque}{" "}
            <button
              type="button"
              onClick={mostrarTodos}
              style={{
                border: 0,
                background: "none",
                padding: 0,
                minHeight: 44,
                color: COR.erro.texto,
                fontWeight: 700,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Ver os itens
            </button>
          </span>
        )}
      </div>

      <AnimatePresence>
        {simulando && (
          <ModalSimuladorContrato
            nome={nome.trim() || "Contrato sem nome"}
            contrato={simulando}
            naoSalvo={modo === "criar" || sujo}
            fechar={() => setSimulando(null)}
          />
        )}
      </AnimatePresence>

      {estado && !estado.ok && !estado.erros?.length && (
        <p role="status" className="sr-only">
          {estado.msg}
        </p>
      )}
    </form>
  );
}

/** Exemplo ao vivo de uma regra lida sozinha, mesmo com erro em outra parte do contrato. */
function exemploIsolado(regra: RegraForm, maisDe24h: boolean): string | null {
  const sozinha = lerForm({
    maisDe24h,
    diariaLigada: false,
    diaria: "",
    cobrarMenorValor: false,
    regras: [{ ...regra, nome: "Padrão", usarMinutosPagos: false }],
  }).contrato;
  return sozinha ? exemploDaRegra(sozinha.regras[0]!) : null;
}

/** Prefixo do item no resumo ("Padrão, faixa 3", "Noturno", "Diária"). */
function rotuloDoCampo(e: ErroCampo, form: ContratoForm | null): string {
  if (e.campo === "ct-nome") return "Nome";
  if (e.campo === "ct-diaria") return "Diária";
  if (e.campo === "ct-menor") return "Cobrar o menor valor";
  if (e.campo === "ct-mais24") return "Mais de 24 horas";
  const m = /^ct-r(\d+)(?:-f(\d+))?/.exec(e.campo);
  if (!m) return "Contrato";
  const i = Number(m[1]);
  const regra = i === 0 ? "Padrão" : form?.regras[i]?.nome.trim() || `Regra ${i}`;
  if (m[2] !== undefined) return `${regra}, ${Number(m[2]) + 1}ª faixa`;
  if (e.campo.includes("-fracao")) return `${regra}, fração`;
  return regra;
}

function CaixaConversao({ conversao }: { conversao: ConversaoInicial }) {
  return (
    <section
      aria-labelledby="ct-conversao"
      style={{
        border: `1px solid ${COR.info.borda}`,
        background: COR.info.fundo,
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <h2 id="ct-conversao" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COR.info.texto }}>
        Confira antes de salvar
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: COR.info.texto }}>
        Os valores vieram da tarifa avulsa “{conversao.tarifaNome}”, que continua igual e cobrando
        normalmente. Nada é gravado até você salvar.
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {conversao.avisos.map((a) => {
          const atencao = a.tom === "atencao";
          const Icone = atencao ? AlertTriangle : Info;
          return (
            <li
              key={a.texto}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: atencao ? COR.ambar.fundo : "#fff",
                border: `1px solid ${atencao ? COR.ambar.borda : "#DBEAFE"}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                color: atencao ? COR.ambar.forte : COR.info.texto,
              }}
            >
              <Icone
                aria-hidden
                style={{
                  width: 16,
                  height: 16,
                  flex: "none",
                  marginTop: 2,
                  color: atencao ? COR.ambar.texto : COR.info.forte,
                }}
              />
              {a.texto}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OpcoesContrato({
  form,
  aberto,
  aoAbrir,
  erroDe,
  origemDiaria,
  aplicar,
  tocar,
}: {
  form: ContratoForm;
  aberto: boolean;
  aoAbrir: (v: boolean) => void;
  erroDe: (campo: string) => ErroCampo | undefined;
  origemDiaria: string | undefined;
  aplicar: (f: ContratoForm, tocado?: string) => void;
  tocar: (campo: string) => void;
}) {
  const disp = disponibilidade(form);
  const naoSuportadoDiaria = erroDe("ct-diaria");
  const erroDiaria = naoSuportadoDiaria && !naoSuportado(naoSuportadoDiaria.codigo) ? naoSuportadoDiaria : undefined;

  const linha = (props: {
    id: string;
    titulo: string;
    descricao: string;
    ligado: boolean;
    motivo: ReturnType<typeof disponibilidade>["diaria"];
    alternar: () => void;
    extra?: React.ReactNode;
  }) => {
    const bloqueado = !!props.motivo && !props.ligado;
    return (
      <div
        style={{
          border: `${props.ligado ? 2 : 1}px solid ${props.ligado ? "#16A34A" : "#E4E8EC"}`,
          background: props.ligado ? "#F0FDF4" : "#FAFBFC",
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 14px",
          alignItems: "center",
        }}
      >
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            flex: "1 1 240px",
            minHeight: 44,
            cursor: bloqueado ? "not-allowed" : "pointer",
          }}
        >
          <input
            id={props.id}
            type="checkbox"
            checked={props.ligado}
            disabled={bloqueado}
            aria-describedby={props.motivo ? `${props.id}-motivo` : undefined}
            onChange={props.alternar}
            style={{ marginTop: 3, width: 16, height: 16, accentColor: COR.verde }}
          />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: bloqueado ? "#9CA3AF" : "#1F2937" }}>
              {props.titulo}
            </span>
            <span style={{ fontSize: 12, color: "#6B7280" }}>{props.descricao}</span>
            {props.motivo && <Motivo id={`${props.id}-motivo`} motivo={props.motivo} />}
          </span>
        </label>
        {props.extra}
      </div>
    );
  };

  return (
    <details
      open={aberto}
      onToggle={(e) => aoAbrir(e.currentTarget.open)}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          color: "#1F2937",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
        }}
      >
        Opções do contrato
      </summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {linha({
          id: "ct-diaria-ligada",
          titulo: "Diária",
          descricao: "Valor máximo a cada 24 h desde a entrada.",
          ligado: form.diariaLigada,
          motivo: disp.diaria,
          alternar: () => aplicar({ ...form, diariaLigada: !form.diariaLigada }, "ct-diaria-ligada"),
          extra: form.diariaLigada && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", width: 160 }}>
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12,
                      color: "#8695A0",
                    }}
                  >
                    R$
                  </span>
                  <input
                    {...aria("ct-diaria", erroDiaria)}
                    aria-label="Valor da diária"
                    inputMode="decimal"
                    className="mono"
                    value={form.diaria}
                    placeholder="0,00"
                    onChange={(e) => aplicar({ ...form, diaria: e.target.value })}
                    onBlur={() => tocar("ct-diaria")}
                    style={{ ...cssInput, paddingLeft: 34, ...(erroDiaria ? cssInputErro : {}) }}
                  />
                </div>
                {origemDiaria && <Origem texto={origemDiaria} />}
              </div>
              <MensagemErro erro={erroDiaria} />
            </div>
          ),
        })}
        {naoSuportadoDiaria && naoSuportado(naoSuportadoDiaria.codigo) && (
          <BlocoNaoSuportado erro={naoSuportadoDiaria} />
        )}
        {linha({
          id: "ct-mais24",
          titulo: "Faixas com mais de 24 horas",
          descricao: "Faixas e fração passam a aceitar até 999:00, digitadas em horas (ex.: 48:00).",
          ligado: form.maisDe24h,
          motivo: disp.maisDe24h,
          alternar: () => aplicar({ ...form, maisDe24h: !form.maisDe24h }, "ct-mais24"),
        })}
        <MensagemErro erro={erroDe("ct-mais24")} />
        {linha({
          id: "ct-menor",
          titulo: "Cobrar o menor valor",
          descricao: "Compara com a cobrança só pela Padrão e fica com a mais barata.",
          ligado: form.cobrarMenorValor,
          motivo: disp.menorValor,
          alternar: () => aplicar({ ...form, cobrarMenorValor: !form.cobrarMenorValor }, "ct-menor"),
        })}
        <MensagemErro erro={erroDe("ct-menor")} />
      </div>
    </details>
  );
}
