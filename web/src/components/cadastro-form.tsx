"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { criarContaTrial, type ResultadoCadastro } from "@/app/cadastro/actions";
import { formatarTelefone, telefoneValido } from "@/lib/telefone";
import { BotaoGoogle } from "@/components/botao-google";
import { CadastroStyle } from "@/components/cadastro-style";

/**
 * /cadastro — porte fiel do protótipo (Claude Design, "Página de cadastro
 * moderna"). O visual é do protótipo; o comportamento é o do app.
 *
 * O que veio do protótipo: layout de duas colunas, trilha de 3 passos, cartão
 * agrupado (ACESSO / SEU PÁTIO), validação por campo com tick e mensagem,
 * barra fixa no mobile e a tela de conta criada.
 *
 * O que NÃO veio, porque o protótipo é estático: os `name` dos inputs seguem o
 * contrato da server action (`nome_rede`, e não `negocio`), o honeypot
 * anti-bot, o botão do Google real (OAuth do Supabase, com o logo colorido em
 * vez do "G" de rascunho) e o telefone validado por `telefoneValido` — o
 * protótipo só contava dígitos, e o servidor exige DDD e o 9 do celular.
 */

/** Campos do formulário. A chave é o `name` que a action lê no FormData. */
type Campo = "email" | "senha" | "nome_rede" | "nome" | "telefone";

const REGRAS: Record<Campo, (v: string) => string> = {
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) ? "" : "E-mail inválido",
  senha: (v) => (v.length < 6 ? "Use pelo menos 6 caracteres" : ""),
  nome_rede: (v) => (v.trim().length < 2 ? "Informe o nome do seu negócio" : ""),
  nome: (v) => (v.trim().length < 2 ? "Informe seu nome" : ""),
  // Mais rígido que o protótipo de propósito: casa com a validação da action.
  telefone: (v) => (telefoneValido(v) ? "" : "Telefone incompleto"),
};

const VAZIO: Record<Campo, string> = {
  email: "",
  senha: "",
  nome_rede: "",
  nome: "",
  telefone: "",
};

/** Requisitos de senha: dicas visuais. Só o "6+" é exigido (aqui e no servidor). */
const REQUISITOS = [
  { id: "len", texto: "6+ caracteres", ok: (v: string) => v.length >= 6 },
  {
    id: "alnum",
    texto: "letra e número",
    ok: (v: string) => /[A-Za-z]/.test(v) && /\d/.test(v),
  },
  { id: "upper", texto: "uma maiúscula", ok: (v: string) => /[A-Z]/.test(v) },
] as const;

function Aside() {
  return (
    <aside className="aside">
      <div className="aside-in">
        <div className="aside-top">
          <Link href="/" className="brand">
            Nuvem<span>Park</span>
          </Link>
          <a className="back" href="https://nuvempark.com">
            ← Voltar ao site
          </a>
        </div>
        <h1>
          Do cadastro ao
          <br />
          primeiro veículo
          <br />
          em 3 minutos
        </h1>
        <div className="steps">
          <div className="step">
            <div className="step-rail">
              <span className="dot on">1</span>
              <span className="rail on" />
            </div>
            <div className="step-body">
              <div className="step-t">Preencha o formulário</div>
              <div className="step-s">Menos de 1 minuto, sem cartão</div>
            </div>
          </div>
          <div className="step">
            <div className="step-rail">
              <span className="dot">2</span>
              <span className="rail" />
            </div>
            <div className="step-body">
              <div className="step-t">Confirme o e-mail</div>
              <div className="step-s">Liberação automática, sem vendedor</div>
            </div>
          </div>
          <div className="step">
            <div className="step-rail">
              <span className="dot">3</span>
            </div>
            <div className="step-body">
              <div className="step-t">Registre a primeira entrada</div>
              <div className="step-s">15 dias com todos os recursos</div>
            </div>
          </div>
        </div>
      </div>
      {/* O protótipo tem aqui um mock de navegador com o print do painel. Ele
          saiu por ora: o frame é PAISAGEM (~508x261 visíveis) e não existe
          print de desktop no repo — os 12 de public/uploads são de celular
          (720x1604), que num `object-fit:cover` viraria uma tira do topo.
          Publicar com o placeholder pontilhado do protótipo era pior.

          Para trazer de volta quando houver o print (o CSS `.shot*` continua
          em cadastro-style.tsx, intacto):

            <div className="shot-wrap">
              <div className="shot">
                <div className="shot-bar">
                  <i /><i /><i />
                  <span className="shot-url">app.nuvempark.com/painel</span>
                </div>
                <Image className="shot-img" src="/uploads/painel-desktop.png"
                       width={1016} height={522} alt="Painel do NuvemPark" />
              </div>
            </div>

          ⚠️ O print fica numa página PÚBLICA: nada de placa, nome ou valor de
          cliente real. */}
    </aside>
  );
}

export function CadastroForm() {
  const [valores, setValores] = useState<Record<Campo, string>>(VAZIO);
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [verSenha, setVerSenha] = useState(false);
  const [erroGoogle, setErroGoogle] = useState<string | null>(null);
  const [estado, agir, pendente] = useActionState<ResultadoCadastro, FormData>(
    criarContaTrial,
    null,
  );

  function mudar(campo: Campo, bruto: string) {
    const v = campo === "telefone" ? formatarTelefone(bruto) : bruto;
    setValores((s) => ({ ...s, [campo]: v }));
  }

  /** Classe do campo: `ok` mostra o tick, `bad` revela a mensagem. */
  function classe(campo: Campo): string {
    const v = valores[campo];
    const erro = REGRAS[campo](v);
    const mostrarErro = !!erro && !!tocados[campo];
    if (mostrarErro) return "f bad";
    return v.length > 0 && !erro ? "f ok" : "f";
  }

  function mensagem(campo: Campo): string {
    return tocados[campo] ? REGRAS[campo](valores[campo]) : "";
  }

  /**
   * Guarda do envio, como no protótipo: marca tudo como tocado, revela os erros
   * e foca o primeiro campo ruim. Sem isto o formulário iria para o servidor e
   * voltaria com uma mensagem só — perdendo qual campo está errado.
   *
   * `preventDefault` aqui impede a server action de rodar (o React só dispara a
   * `action` se o submit não tiver sido cancelado).
   */
  function aoEnviar(ev: React.FormEvent<HTMLFormElement>) {
    const campos = Object.keys(REGRAS) as Campo[];
    const ruins = campos.filter((c) => REGRAS[c](valores[c]) !== "");
    if (ruins.length === 0) return; // segue para `agir`
    ev.preventDefault();
    setTocados(Object.fromEntries(campos.map((c) => [c, true])));
    ev.currentTarget
      .querySelector<HTMLInputElement>(`input[name="${ruins[0]}"]`)
      ?.focus();
  }

  /* ---------- Conta criada: o aside continua, só o miolo troca ---------- */
  if (estado?.ok) {
    return (
      <div className="npcad">
        <CadastroStyle />
        <div className="page">
          <Aside />
          <MobileHead />
          <main className="main">
            <div className="done">
              <div className="mark">✓</div>
              <h2>Conta criada</h2>
              <p>
                Enviamos o link de confirmação para <b>{estado.email}</b>. O painel
                abre assim que você clicar.
              </p>
              <p style={{ fontSize: 12.5, color: "#9AA7B0" }}>
                Não chegou? Verifique o spam ou aguarde alguns minutos.
              </p>
              <Link href="/login" style={{ fontWeight: 600, fontSize: 14 }}>
                Já confirmei — ir para o login →
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const botaoCta = (rotulo: string) => (
    <button type="submit" form="signup" className="cta" disabled={pendente}>
      {pendente && <Loader2 size={17} className="animate-spin" />}
      {pendente ? "Criando sua conta…" : rotulo}
    </button>
  );

  /* ---------- Formulário ---------- */
  return (
    <div className="npcad">
      <CadastroStyle />
      <div className="page">
        <Aside />
        <MobileHead />

        <main className="main">
          <form
            className="form-col"
            id="signup"
            action={agir}
            onSubmit={aoEnviar}
            noValidate
          >
            {/* honeypot invisível anti-bot — a action rejeita se vier preenchido */}
            <input
              type="text"
              name="empresa_site"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
            />

            <div className="head">
              <span className="badge">
                <i />
                15 dias grátis · sem cartão
              </span>
              <h2>Criar conta grátis</h2>
            </div>

            <BotaoGoogle
              texto="Continuar com Google"
              className="btn-google"
              onErro={setErroGoogle}
            />
            {erroGoogle && (
              <p className="alerta">
                <AlertCircle size={16} />
                {erroGoogle}
              </p>
            )}

            <div className="sep">
              <span>OU COM E-MAIL</span>
            </div>

            <div className="card">
              <div className="group">
                <div className="group-t">ACESSO</div>

                <label className={classe("email")}>
                  <span className="lbl">E-mail</span>
                  <span className="wrap">
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com.br"
                      value={valores.email}
                      onChange={(e) => mudar("email", e.target.value)}
                      onBlur={() => setTocados((s) => ({ ...s, email: true }))}
                    />
                    <span className="tick">✓</span>
                  </span>
                  <span className="hint">É para lá que vai o link de confirmação.</span>
                  <span className="msg">{mensagem("email")}</span>
                </label>

                <label className={classe("senha")}>
                  <span className="lbl">Senha</span>
                  <span className="wrap">
                    <input
                      type={verSenha ? "text" : "password"}
                      name="senha"
                      className="pw"
                      autoComplete="new-password"
                      placeholder="crie uma senha"
                      value={valores.senha}
                      onChange={(e) => mudar("senha", e.target.value)}
                      onBlur={() => setTocados((s) => ({ ...s, senha: true }))}
                    />
                    <button
                      type="button"
                      className="eye"
                      onClick={() => setVerSenha((v) => !v)}
                      aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {verSenha ? "Ocultar" : "Mostrar"}
                    </button>
                  </span>
                  <span className="reqs">
                    {REQUISITOS.map((r) => {
                      const ok = r.ok(valores.senha);
                      return (
                        <span key={r.id} className={ok ? "req ok" : "req"}>
                          <b>{ok ? "✓" : "·"}</b>
                          {r.texto}
                        </span>
                      );
                    })}
                  </span>
                  <span className="msg">{mensagem("senha")}</span>
                </label>
              </div>

              <div className="group">
                <div className="group-t">SEU PÁTIO</div>

                <label className={classe("nome_rede")}>
                  <span className="lbl">Nome do negócio</span>
                  <span className="wrap">
                    <input
                      type="text"
                      name="nome_rede"
                      autoComplete="organization"
                      placeholder="Estacionamento Central"
                      value={valores.nome_rede}
                      onChange={(e) => mudar("nome_rede", e.target.value)}
                      onBlur={() => setTocados((s) => ({ ...s, nome_rede: true }))}
                    />
                    <span className="tick">✓</span>
                  </span>
                  <span className="hint">
                    Aparece nos recibos e no painel. Dá para mudar depois.
                  </span>
                  <span className="msg">{mensagem("nome_rede")}</span>
                </label>

                <div className="row">
                  <label className={classe("nome")}>
                    <span className="lbl">Seu nome</span>
                    <span className="wrap">
                      <input
                        type="text"
                        name="nome"
                        autoComplete="name"
                        placeholder="Como te chamar?"
                        value={valores.nome}
                        onChange={(e) => mudar("nome", e.target.value)}
                        onBlur={() => setTocados((s) => ({ ...s, nome: true }))}
                      />
                      <span className="tick">✓</span>
                    </span>
                    <span className="msg">{mensagem("nome")}</span>
                  </label>

                  <label className={classe("telefone")}>
                    <span className="lbl">WhatsApp</span>
                    <span className="wrap">
                      <input
                        type="tel"
                        name="telefone"
                        autoComplete="tel"
                        inputMode="numeric"
                        placeholder="(81) 90000-0000"
                        value={valores.telefone}
                        onChange={(e) => mudar("telefone", e.target.value)}
                        onBlur={() => setTocados((s) => ({ ...s, telefone: true }))}
                      />
                      <span className="tick">✓</span>
                    </span>
                    <span className="msg">{mensagem("telefone")}</span>
                  </label>
                </div>

                <span className="hint" style={{ paddingTop: 8 }}>
                  Usamos o WhatsApp só para ajudar na configuração inicial.
                </span>
              </div>
            </div>

            {estado && !estado.ok && (
              <p className="alerta" role="alert">
                <AlertCircle size={16} />
                {estado.msg}
              </p>
            )}

            <div className="actions">
              {botaoCta("Criar conta e abrir painel")}
              <div className="assur">
                <span>
                  <b>✓</b>Sem cartão
                </span>
                <span>
                  <b>✓</b>Liberação na hora
                </span>
                <span>
                  <b>✓</b>Cancele quando quiser
                </span>
              </div>
              {/* O protótipo linkava /termos e /privacidade. As duas rotas NÃO
                  existem no app (nem sob outro nome, nem no rodapé do site), e
                  link morto para o jurídico numa tela de cadastro é pior que
                  link nenhum. Texto puro até as páginas existirem — aí é só
                  reenvolver em <Link>. */}
              <p className="legal">
                Ao continuar você aceita os Termos e a Política de Privacidade.
              </p>
              <div className="login">
                Já tem conta? <Link href="/login">Entrar →</Link>
              </div>
            </div>
          </form>

          {/* Barra fixa do mobile. `form="signup"` liga o botão ao formulário
              acima, que está fora dela na árvore. */}
          <div className="mbar">
            {botaoCta("Criar conta grátis")}
            <div className="assur">
              <span>
                <b>✓</b>Sem cartão
              </span>
              <span>
                <b>✓</b>Liberação na hora
              </span>
            </div>
            <div className="login">
              Já tem conta? <Link href="/login">Entrar</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function MobileHead() {
  return (
    <header className="mhead">
      <div className="aside-top">
        <Link href="/" className="brand">
          Nuvem<span>Park</span>
        </Link>
        <a className="back" href="https://nuvempark.com">
          ← Site
        </a>
      </div>
      <h1>Do cadastro ao primeiro veículo em 3 minutos</h1>
      <div className="chips">
        <span className="chip">
          <i />
          15 dias grátis
        </span>
        <span className="chip plain">Sem cartão</span>
      </div>
    </header>
  );
}
