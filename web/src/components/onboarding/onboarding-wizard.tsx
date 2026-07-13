"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ParkingSquare,
  CircleDollarSign,
  Printer,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  concluirOnboarding,
  type DadosOnboarding,
  type ResultadoOnboarding,
} from "@/app/painel/onboarding/actions";
import { useToast } from "@/components/ui/toast";
import { PlayBadge } from "@/components/site/play-badge";

const CHAVE_ADIADO = "np-onboarding-adiado";

/* =========================================================
   ONBOARDING — primeiro acesso do gestor (rede sem pátios).
   4 passos com envio único no final: o gestor pode voltar e
   revisar tudo antes de criar. Termina no momento-chave: o
   código do pátio + instruções de login no app.
   ========================================================= */

/** Monta o estado vazio + o portão de exibição (dispensável por sessão). */
export function OnboardingGate() {
  const [aberto, setAberto] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setAberto(sessionStorage.getItem(CHAVE_ADIADO) !== "1");
    setPronto(true);
  }, []);

  const adiar = () => {
    sessionStorage.setItem(CHAVE_ADIADO, "1");
    setAberto(false);
  };

  return (
    <>
      {/* fundo: estado vazio com reabertura do wizard */}
      <div className="max-w-md mx-auto mt-20 text-center">
        <span className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center mx-auto">
          <ParkingSquare className="w-7 h-7 text-brand-600" />
        </span>
        <h1 className="mt-4 text-xl font-black tracking-tight">
          Seu painel está quase pronto
        </h1>
        <p className="mt-1.5 text-sm text-texto-2">
          Falta configurar o seu primeiro pátio — leva uns 2 minutos e no final
          você já sai com o código do app na mão.
        </p>
        <button
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-2 mt-5 h-11 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
        >
          Configurar meu pátio
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {pronto && aberto && <Wizard aoAdiar={adiar} />}
      </AnimatePresence>
    </>
  );
}

/* ---------- o wizard em si ---------- */

type Tela = "boasvindas" | 1 | 2 | 3 | 4 | "sucesso";
const PASSOS = [
  { n: 1, rotulo: "Pátio" },
  { n: 2, rotulo: "Preços" },
  { n: 3, rotulo: "Ticket" },
  { n: 4, rotulo: "Operador" },
] as const;

function Wizard({ aoAdiar }: { aoAdiar: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const reduzir = useReducedMotion();
  const [tela, setTela] = useState<Tela>("boasvindas");
  const [direcao, setDirecao] = useState(1);
  const [enviando, comecar] = useTransition();
  const [resultado, setResultado] = useState<
    Extract<ResultadoOnboarding, { ok: true }> | null
  >(null);

  // estado dos formulários
  const [patioNome, setPatioNome] = useState("");
  const [vagas, setVagas] = useState("");
  const [usarTarifa, setUsarTarifa] = useState(true);
  const [primeiraHora, setPrimeiraHora] = useState("10,00");
  const [horaAdicional, setHoraAdicional] = useState("5,00");
  const [tolerancia, setTolerancia] = useState("10");
  const [cabecalho, setCabecalho] = useState("");
  const [rodape, setRodape] = useState("Obrigado pela preferência!");
  const [usarOperador, setUsarOperador] = useState(true);
  const [opNome, setOpNome] = useState("");
  const [opUsuario, setOpUsuario] = useState("");
  const [opSenha, setOpSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);

  const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

  const ir = (proxima: Tela, dir: number) => {
    setDirecao(dir);
    setTela(proxima);
  };

  const validarPasso = (): string | null => {
    if (tela === 1 && patioNome.trim().length < 2)
      return "Dê um nome ao seu estacionamento.";
    if (tela === 2 && usarTarifa && num(primeiraHora) <= 0)
      return "Informe o valor da primeira hora (ou pule esta etapa).";
    if (tela === 4 && usarOperador) {
      if (!opNome.trim() || !opUsuario.trim())
        return "Preencha o nome e o usuário do operador.";
      if (opSenha.length < 6)
        return "A senha do operador precisa de pelo menos 6 caracteres.";
    }
    return null;
  };

  const avancar = () => {
    const erro = validarPasso();
    if (erro) {
      toast.erro("Quase lá", erro);
      return;
    }
    if (tela === "boasvindas") return ir(1, 1);
    if (tela === 1) {
      // cabeçalho do ticket começa com o nome do pátio (editável no passo 3)
      if (!cabecalho.trim()) setCabecalho(patioNome.trim());
      return ir(2, 1);
    }
    if (tela === 2) return ir(3, 1);
    if (tela === 3) return ir(4, 1);
    if (tela === 4) return enviar();
  };

  const voltar = () => {
    if (tela === 2) return ir(1, -1);
    if (tela === 3) return ir(2, -1);
    if (tela === 4) return ir(3, -1);
  };

  const enviar = () => {
    const erro = validarPasso();
    if (erro) return toast.erro("Quase lá", erro);

    const dados: DadosOnboarding = {
      patio: { nome: patioNome.trim(), qtdVagas: Math.max(0, Number(vagas) || 0) },
      tarifa: usarTarifa
        ? {
            primeiraHora: num(primeiraHora),
            horaAdicional: num(horaAdicional),
            toleranciaMinutos: Number(tolerancia) || 0,
          }
        : undefined,
      impressao: {
        cabecalho: cabecalho.split(/\r?\n/),
        rodape: rodape.split(/\r?\n/),
      },
      operador: usarOperador
        ? { nome: opNome, usuario: opUsuario, senha: opSenha }
        : undefined,
    };

    comecar(async () => {
      const r = await concluirOnboarding(dados);
      if (!r.ok) {
        toast.erro("Não deu certo", r.msg);
        return;
      }
      setResultado(r);
      ir("sucesso", 1);
    });
  };

  const concluir = () => {
    sessionStorage.removeItem(CHAVE_ADIADO);
    router.refresh();
  };

  const slide = {
    initial: { opacity: 0, x: reduzir ? 0 : 28 * direcao },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduzir ? 0 : -28 * direcao },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  };

  const passoAtual = typeof tela === "number" ? tela : tela === "sucesso" ? 4 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-superficie shadow-[var(--shadow-pop)]"
      >
        {/* progresso — some na boas-vindas e no sucesso */}
        {typeof tela === "number" && (
          <div className="px-7 pt-6">
            <div className="flex items-center gap-1.5">
              {PASSOS.map((p) => (
                <div key={p.n} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors duration-300 ${
                      p.n <= passoAtual
                        ? "bg-gradient-to-r from-brand-600 to-brand-500"
                        : "bg-fundo"
                    }`}
                  />
                  <span
                    className={`mt-1.5 block text-[10px] font-bold uppercase tracking-wider ${
                      p.n === passoAtual ? "text-brand-700" : "text-texto-3"
                    }`}
                  >
                    {p.rotulo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-7 pt-5">
          <AnimatePresence mode="wait" custom={direcao}>
            {/* ---------- BOAS-VINDAS ---------- */}
            {tela === "boasvindas" && (
              <motion.div key="bv" {...slide}>
                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
                  <Sparkles className="w-7 h-7 text-white" />
                </span>
                <h2 className="mt-5 text-2xl font-black tracking-tight">
                  Bem-vindo ao NuvemPark! 👋
                </h2>
                <p className="mt-2 text-sm text-texto-2 leading-relaxed">
                  Vamos deixar seu estacionamento pronto pra operar. São{" "}
                  <b className="text-texto">4 passos rápidos</b> — uns 2 minutos —
                  e no final você sai com o código do app na mão.
                </p>

                <ul className="mt-5 space-y-3">
                  {[
                    { Icone: ParkingSquare, t: "Seu pátio", d: "Nome e quantidade de vagas." },
                    { Icone: CircleDollarSign, t: "Tabela de preço", d: "Quanto custa a hora — refina depois." },
                    { Icone: Printer, t: "Ticket impresso", d: "O que sai no cupom do cliente." },
                    { Icone: Smartphone, t: "Operador do app", d: "O login de quem trabalha no pátio." },
                  ].map((i) => (
                    <li key={i.t} className="flex items-start gap-3">
                      <span className="mt-0.5 w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                        <i.Icone className="w-4.5 h-4.5 text-brand-600" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold">{i.t}</span>
                        <span className="block text-xs text-texto-2">{i.d}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={avancar}
                  className="mt-6 w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
                >
                  Começar
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={aoAdiar}
                  className="mt-3 w-full text-sm font-semibold text-texto-3 hover:text-texto transition-colors"
                >
                  Explorar o painel primeiro
                </button>
              </motion.div>
            )}

            {/* ---------- PASSO 1: PÁTIO ---------- */}
            {tela === 1 && (
              <motion.div key="p1" {...slide}>
                <Cabecalho
                  Icone={ParkingSquare}
                  titulo="Como se chama o seu estacionamento?"
                  texto="É o nome que aparece no painel, no app do operador e no ticket do cliente."
                />
                <div className="mt-5 space-y-4">
                  <Campo rotulo="Nome do pátio">
                    <input
                      autoFocus
                      value={patioNome}
                      onChange={(e) => setPatioNome(e.target.value)}
                      placeholder="Estacionamento Central"
                      className={inputCls}
                    />
                  </Campo>
                  <Campo rotulo="Quantas vagas? (opcional)">
                    <input
                      value={vagas}
                      onChange={(e) => setVagas(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      placeholder="Ex.: 50"
                      className={inputCls}
                    />
                    <Dica>Usamos pra mostrar a ocupação ao vivo no painel.</Dica>
                  </Campo>
                </div>
              </motion.div>
            )}

            {/* ---------- PASSO 2: TARIFA ---------- */}
            {tela === 2 && (
              <motion.div key="p2" {...slide}>
                <Cabecalho
                  Icone={CircleDollarSign}
                  titulo="Quanto custa estacionar?"
                  texto="O app calcula o valor sozinho na saída — sem conta de cabeça do operador."
                />
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Campo rotulo="Primeira hora">
                    <CampoMoeda valor={primeiraHora} aoMudar={setPrimeiraHora} autoFocus />
                  </Campo>
                  <Campo rotulo="Hora adicional">
                    <CampoMoeda valor={horaAdicional} aoMudar={setHoraAdicional} />
                  </Campo>
                </div>
                <div className="mt-4">
                  <Campo rotulo="Tolerância de saída (minutos)">
                    <input
                      value={tolerancia}
                      onChange={(e) => setTolerancia(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      className={inputCls}
                    />
                    <Dica>
                      Até esse tempo, o cliente sai sem pagar. Teto de diária,
                      pernoite e preço por tipo de veículo você ajusta depois em{" "}
                      <b>Cadastros → Tarifas</b>.
                    </Dica>
                  </Campo>
                </div>
                <Pular
                  onClick={() => {
                    setUsarTarifa(false);
                    ir(3, 1);
                  }}
                >
                  Pular — crio a tabela depois
                </Pular>
              </motion.div>
            )}

            {/* ---------- PASSO 3: TICKET ---------- */}
            {tela === 3 && (
              <motion.div key="p3" {...slide}>
                <Cabecalho
                  Icone={Printer}
                  titulo="O que sai no ticket do cliente?"
                  texto="Impresso na hora, numa impressora térmica Bluetooth comum."
                />
                <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-4 min-w-0">
                    <Campo rotulo="Cabeçalho (até 4 linhas)">
                      <textarea
                        value={cabecalho}
                        onChange={(e) => setCabecalho(e.target.value)}
                        rows={2}
                        placeholder={patioNome || "Nome do estacionamento"}
                        className={`${inputCls} h-auto py-2.5 resize-none`}
                      />
                    </Campo>
                    <Campo rotulo="Rodapé (opcional)">
                      <textarea
                        value={rodape}
                        onChange={(e) => setRodape(e.target.value)}
                        rows={2}
                        placeholder="Obrigado pela preferência!"
                        className={`${inputCls} h-auto py-2.5 resize-none`}
                      />
                    </Campo>
                  </div>

                  {/* prévia do cupom térmico */}
                  <div className="mx-auto w-44 shrink-0 rounded-lg border border-dashed border-borda bg-white px-3 py-3 font-mono text-[10px] leading-relaxed text-center text-texto shadow-[var(--shadow-card)]">
                    {(cabecalho || patioNome || "SEU PÁTIO")
                      .split(/\r?\n/)
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((l, i) => (
                        <p key={i} className={i === 0 ? "font-black" : ""}>
                          {l.slice(0, 20)}
                        </p>
                      ))}
                    <p className="my-1 text-texto-3">····················</p>
                    <p className="font-black tracking-widest">ABC1D23</p>
                    <p>ENTRADA 14:07</p>
                    <p className="my-1 text-texto-3">····················</p>
                    {rodape
                      .split(/\r?\n/)
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((l, i) => (
                        <p key={i}>{l.slice(0, 20)}</p>
                      ))}
                  </div>
                </div>
                <Pular onClick={() => ir(4, 1)}>Pular — ajusto depois</Pular>
              </motion.div>
            )}

            {/* ---------- PASSO 4: OPERADOR ---------- */}
            {tela === 4 && (
              <motion.div key="p4" {...slide}>
                <Cabecalho
                  Icone={Smartphone}
                  titulo="Quem vai operar no pátio?"
                  texto="Esse é o login que entra no app do celular pra registrar entradas e saídas."
                />
                <div className="mt-5 space-y-4">
                  <Campo rotulo="Nome do operador">
                    <input
                      autoFocus
                      value={opNome}
                      onChange={(e) => setOpNome(e.target.value)}
                      placeholder="João da Silva"
                      className={inputCls}
                    />
                  </Campo>
                  <div className="grid grid-cols-2 gap-4">
                    <Campo rotulo="Usuário (p/ o app)">
                      <input
                        value={opUsuario}
                        onChange={(e) =>
                          setOpUsuario(e.target.value.toUpperCase().replace(/\s/g, ""))
                        }
                        placeholder="JOAO"
                        className={`${inputCls} uppercase tracking-wider`}
                      />
                    </Campo>
                    <Campo rotulo="Senha (mín. 6)">
                      <div className="relative">
                        <input
                          type={verSenha ? "text" : "password"}
                          value={opSenha}
                          onChange={(e) => setOpSenha(e.target.value)}
                          placeholder="••••••"
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setVerSenha((v) => !v)}
                          aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-3 hover:text-texto-2"
                        >
                          {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Campo>
                  </div>
                  <Dica>
                    Você pode criar quantos operadores quiser depois, em{" "}
                    <b>Cadastros → Operadores</b>.
                  </Dica>
                </div>
                <Pular
                  onClick={() => {
                    setUsarOperador(false);
                    enviar();
                  }}
                >
                  Pular — crio o operador depois
                </Pular>
              </motion.div>
            )}

            {/* ---------- SUCESSO ---------- */}
            {tela === "sucesso" && resultado && (
              <motion.div key="ok" {...slide} className="text-center">
                <span className="relative mx-auto w-16 h-16 grid place-items-center">
                  <span className="absolute inset-0 rounded-2xl bg-brand-500/30 animate-ping-slow" />
                  <span className="relative w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center">
                    <CheckCircle2 className="w-8 h-8 text-brand-600" />
                  </span>
                </span>
                <h2 className="mt-4 text-2xl font-black tracking-tight">
                  {resultado.patioNome} está no ar! 🎉
                </h2>
                <p className="mt-1.5 text-sm text-texto-2">
                  Este é o código que o operador usa pra entrar no app:
                </p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resultado.codigo);
                    toast.sucesso("Copiado!", `Código do pátio: ${resultado.codigo}`);
                  }}
                  className="mt-4 inline-flex items-center gap-3 rounded-2xl border-2 border-brand-200 bg-brand-50 px-6 py-3 hover:border-brand-300 hover:bg-brand-100 transition-colors"
                  title="Copiar código"
                >
                  <span className="font-mono font-black text-4xl tracking-[0.3em] text-brand-700">
                    {resultado.codigo}
                  </span>
                  <Copy className="w-5 h-5 text-brand-600" />
                </button>

                <div className="mt-6 rounded-2xl border border-borda bg-fundo/60 p-4 text-left">
                  <p className="text-[11px] font-black uppercase tracking-wider text-texto-3 mb-3">
                    No celular de quem opera
                  </p>
                  <ol className="space-y-2.5 text-sm">
                    <li className="flex items-start gap-2.5">
                      <Num n={1} />
                      <span>
                        Baixe o app <b>NuvemPark</b> no Android —{" "}
                        <span className="text-texto-2">em breve na Play Store</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Num n={2} />
                      <span>
                        Código do estacionamento:{" "}
                        <b className="font-mono tracking-widest">{resultado.codigo}</b>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Num n={3} />
                      <span>
                        {resultado.operadorUsuario ? (
                          <>
                            Usuário <b>{resultado.operadorUsuario}</b> e a senha
                            que você acabou de criar
                          </>
                        ) : (
                          <>
                            Crie o login do operador em{" "}
                            <b>Cadastros → Operadores</b>
                          </>
                        )}
                      </span>
                    </li>
                  </ol>
                  <div className="mt-3">
                    <PlayBadge />
                  </div>
                </div>

                {resultado.avisos.length > 0 && (
                  <div className="mt-4 rounded-xl border border-aviso/25 bg-aviso-bg px-4 py-3 text-left">
                    {resultado.avisos.map((a) => (
                      <p key={a} className="flex items-start gap-2 text-xs font-semibold text-aviso">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {a}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  onClick={concluir}
                  className="mt-6 w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
                >
                  Abrir meu painel
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* navegação dos passos 1-4 */}
          {typeof tela === "number" && (
            <div className="mt-6 flex items-center gap-3">
              {tela > 1 && (
                <button
                  onClick={voltar}
                  disabled={enviando}
                  className="h-12 px-5 rounded-xl border border-borda text-sm font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
              )}
              <button
                onClick={avancar}
                disabled={enviando}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando seu pátio…
                  </>
                ) : tela === 4 ? (
                  <>
                    Criar meu pátio
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- peças ---------- */

const inputCls =
  "w-full h-12 px-3.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

function Cabecalho({
  Icone,
  titulo,
  texto,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
}) {
  return (
    <div>
      <span className="w-11 h-11 rounded-xl bg-brand-50 grid place-items-center">
        <Icone className="w-5 h-5 text-brand-600" />
      </span>
      <h2 className="mt-3 text-xl font-black tracking-tight">{titulo}</h2>
      <p className="mt-1 text-sm text-texto-2">{texto}</p>
    </div>
  );
}

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-texto-2 mb-1.5">
        {rotulo}
      </label>
      {children}
    </div>
  );
}

function CampoMoeda({
  valor,
  aoMudar,
  autoFocus = false,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-texto-3">
        R$
      </span>
      <input
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => aoMudar(e.target.value.replace(/[^\d,]/g, ""))}
        inputMode="decimal"
        className={`${inputCls} pl-10 font-bold tabular-nums`}
      />
    </div>
  );
}

function Dica({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-texto-2">{children}</p>;
}

function Pular({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="mt-4 text-center">
      <button
        onClick={onClick}
        className="text-sm font-semibold text-texto-3 hover:text-brand-700 transition-colors"
      >
        {children}
      </button>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return (
    <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-black grid place-items-center shrink-0">
      {n}
    </span>
  );
}
