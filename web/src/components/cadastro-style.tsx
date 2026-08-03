/**
 * CSS da /cadastro, portado fielmente do protótipo (Claude Design,
 * `cadastro.html` do projeto "Página de cadastro moderna").
 *
 * Tudo escopado sob `.npcad`. O protótipo estilizava `body`, `:root` e nomes
 * genéricos (`.card`, `.f`, `.row`, `.step`) — soltos no app eles colidiriam
 * com o painel. As variáveis viraram custom properties do próprio `.npcad`, e
 * `body.is-done` virou estado do React (o formulário e a tela de sucesso são
 * ramos de render, não display:none).
 *
 * As fontes (Archivo, Instrument Sans) são auto-hospedadas — os @font-face
 * estão em globals.css. O protótipo puxava do fonts.googleapis.com, o que é
 * proibido aqui: ver o comentário no topo de globals.css e o PERFORMANCE.md.
 */
const CSS = `
.npcad{
  --green:#0E9E5C; --green-bright:#12B76A; --green-soft:#E9F7F0; --green-line:#C6EBD9;
  --ink:#0B141B; --ink-2:#26333D; --muted:#6B7A85; --muted-2:#9AA7B0;
  --line:#E4E9E6; --line-2:#EFF2F0; --field:#FCFDFC; --bg:#F4F6F5; --err:#D64545;
  flex:1;
  background:var(--bg);
  color:var(--ink);
  font-family:'Instrument Sans',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.npcad *{box-sizing:border-box}
.npcad a{color:var(--green);text-decoration:none}
.npcad a:hover{color:var(--green-bright)}
.npcad input{font-family:inherit}
.npcad input::placeholder{color:var(--muted-2)}
.npcad button{font-family:inherit}

.npcad .page{display:grid;grid-template-columns:minmax(0,min(500px,38vw)) minmax(0,1fr);min-height:100vh}

/* ---------- painel esquerdo (desktop) ---------- */
.npcad .aside{position:relative;overflow:hidden;display:flex;flex-direction:column;padding:38px 0 0 42px;
  background:linear-gradient(168deg,#08131A 0%,#0A1A18 62%,#06131A 100%)}
.npcad .aside::before{content:"";position:absolute;top:-140px;left:-110px;width:460px;height:460px;border-radius:50%;
  background:radial-gradient(circle,rgba(18,183,106,.18),rgba(18,183,106,0) 68%)}
.npcad .aside-in{position:relative;display:flex;flex-direction:column;gap:22px;padding-right:42px}
.npcad .brand{font:800 21px/1 'Archivo',sans-serif;color:#fff;letter-spacing:-.02em}
.npcad .brand span{color:var(--green-bright)}
.npcad .aside-top{display:flex;align-items:center;justify-content:space-between}
.npcad .back{font:500 13px 'Instrument Sans';color:#8FA0AB}
.npcad .back:hover{color:#fff}
.npcad .aside h1{margin:22px 0 0;font:800 42px/1.06 'Archivo',sans-serif;color:#fff;letter-spacing:-.032em;text-wrap:balance}
.npcad .steps{display:flex;flex-direction:column;margin-top:6px}
.npcad .step{display:flex;gap:14px}
.npcad .step-rail{display:flex;flex-direction:column;align-items:center;width:26px}
.npcad .dot{flex:none;width:26px;height:26px;border-radius:50%;background:rgba(18,183,106,.18);color:#5FE0A3;font:700 12px/26px 'Instrument Sans';text-align:center}
.npcad .dot.on{background:var(--green-bright);color:#04140C}
.npcad .rail{flex:1;width:1.5px;background:rgba(18,183,106,.25)}
.npcad .rail.on{background:linear-gradient(#12B76A,rgba(18,183,106,.25))}
.npcad .step-body{padding-bottom:20px}
.npcad .step:last-child .step-body{padding-bottom:0}
.npcad .step-t{font:600 15px/1.35 'Instrument Sans';color:#fff}
.npcad .step-s{font:400 13.5px/1.45 'Instrument Sans';color:#8FA0AB}
/* Mock do navegador — SEM MARCAÇÃO no momento: o bloco saiu do JSX até existir
   um print de desktop do painel (ver o comentário em cadastro-form.tsx, que
   traz o trecho pronto para colar de volta). As regras ficam porque a volta é
   só o JSX; se o print não vier, apague daqui até .shot-ph span. */
.npcad .shot-wrap{position:relative;margin-top:auto;height:300px}
.npcad .shot{position:absolute;left:0;right:-160px;top:0;height:300px;border-radius:14px 0 0 0;overflow:hidden;
  border:1px solid rgba(255,255,255,.12);border-right:0;border-bottom:0;background:#0E1A22;box-shadow:-26px -26px 76px rgba(0,0,0,.5)}
.npcad .shot-bar{display:flex;align-items:center;gap:6px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
.npcad .shot-bar i{width:8px;height:8px;border-radius:50%;background:#3A4750}
.npcad .shot-url{margin-left:10px;font:500 10.5px 'IBM Plex Mono',ui-monospace,monospace;color:#5C6C77}
.npcad .shot-img{width:100%;height:calc(100% - 39px);object-fit:cover;object-position:top left;display:block}
.npcad .shot-ph{height:calc(100% - 39px);display:flex;align-items:center;justify-content:center;
  background:repeating-linear-gradient(135deg,#101C24 0 11px,#14212A 11px 22px)}
.npcad .shot-ph span{font:400 11px 'IBM Plex Mono',ui-monospace,monospace;color:#6E8290;padding:7px 12px;border:1px dashed rgba(255,255,255,.18);border-radius:6px}

/* ---------- cabeçalho mobile ---------- */
.npcad .mhead{display:none;background:linear-gradient(168deg,#08131A,#0A1A18);padding:26px 20px 20px;flex-direction:column;gap:14px}
.npcad .mhead h1{margin:0;font:800 25px/1.12 'Archivo',sans-serif;color:#fff;letter-spacing:-.03em}
.npcad .chips{display:flex;flex-wrap:wrap;gap:8px}
.npcad .chip{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font:600 11px 'Instrument Sans';
  background:rgba(18,183,106,.12);border:1px solid rgba(18,183,106,.26);color:#5FE0A3}
.npcad .chip i{width:5px;height:5px;border-radius:50%;background:var(--green-bright)}
.npcad .chip.plain{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:#A9B7C0}

/* ---------- coluna do formulário ---------- */
.npcad .main{background:var(--bg);padding:44px 60px;display:flex;flex-direction:column;justify-content:center}
.npcad .form-col{display:flex;flex-direction:column;gap:20px;width:100%;max-width:440px;margin:0 auto}
.npcad .badge{align-self:flex-start;display:flex;align-items:center;gap:8px;padding:6px 13px;border-radius:999px;
  background:var(--green-soft);border:1px solid var(--green-line);font:600 12px 'Instrument Sans';color:#0B7A47}
.npcad .badge i{width:6px;height:6px;border-radius:50%;background:var(--green-bright)}
.npcad .head{display:flex;flex-direction:column;gap:9px}
.npcad .head h2{margin:0;font:700 32px/1.12 'Archivo',sans-serif;color:var(--ink);letter-spacing:-.03em}

.npcad .btn-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:15px;border-radius:12px;
  border:1.5px solid #DFE4E1;background:#fff;cursor:pointer;font:600 15px 'Instrument Sans';color:#1B2A33;
  box-shadow:0 1px 2px rgba(16,24,40,.04);transition:border-color .15s,box-shadow .15s}
.npcad .btn-google:hover{border-color:#B9C4BE;box-shadow:0 3px 10px rgba(16,24,40,.07)}
.npcad .btn-google:disabled{cursor:default;opacity:.7}

.npcad .sep{display:flex;align-items:center;gap:12px}
.npcad .sep::before,.npcad .sep::after{content:"";flex:1;height:1px;background:#E2E7E4}
.npcad .sep span{font:500 11.5px 'Instrument Sans';color:var(--muted-2);letter-spacing:.06em}

.npcad .card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 2px 10px rgba(16,24,40,.05);overflow:hidden}
.npcad .group{display:flex;flex-direction:column;padding:6px 18px 18px}
.npcad .group + .group{border-top:1px solid var(--line)}
.npcad .group-t{padding:14px 0 10px;font:600 11.5px 'Instrument Sans';color:#8B98A1;letter-spacing:.07em}
.npcad .f{display:flex;flex-direction:column;gap:6px;padding-bottom:16px}
.npcad .f:last-child{padding-bottom:0}
.npcad .f + .f{border-top:1px solid var(--line-2);padding-top:16px}
.npcad .f > span.lbl{font:600 13px/1 'Instrument Sans';color:var(--ink-2)}
.npcad .hint{font:400 12px/1.4 'Instrument Sans';color:var(--muted-2)}
.npcad .wrap{position:relative;display:flex;align-items:center}
.npcad .wrap input{width:100%;height:52px;padding:0 42px 0 15px;border-radius:11px;border:1.5px solid #DDE3E0;background:var(--field);
  font:400 15.5px 'Instrument Sans';color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.npcad .wrap input:focus{border-color:var(--green-bright);background:#fff;box-shadow:0 0 0 4px rgba(18,183,106,.13)}
.npcad .wrap input.pw{padding-right:82px}
.npcad .tick{position:absolute;right:15px;font:700 14px 'Instrument Sans';color:var(--green-bright);opacity:0;transition:opacity .15s}
.npcad .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.npcad .row .f{padding:0;border:0}
.npcad .f.ok input{border-color:#A8DCC2}
.npcad .f.bad input{border-color:#E2A0A0}
.npcad .msg{font:400 12px 'Instrument Sans';color:var(--err);display:none}
.npcad .f.bad .msg{display:block}
.npcad .f.ok .tick{opacity:1}
.npcad .eye{position:absolute;right:10px;padding:6px 9px;border-radius:7px;border:0;background:#F1F4F2;cursor:pointer;
  font:600 12px 'Instrument Sans';color:#5B6B76;transition:background .15s,color .15s}
.npcad .eye:hover{background:#E7EBE9;color:var(--green)}
.npcad .reqs{display:flex;flex-wrap:wrap;gap:6px 16px;padding-top:4px}
.npcad .req{display:flex;align-items:center;gap:6px;font:400 12px 'Instrument Sans';color:var(--muted-2)}
.npcad .req b{font-weight:700}
.npcad .req.ok{color:var(--green)}

/* Erro devolvido pelo servidor. Não existe no protótipo — o formulário de lá
   não fala com backend —, mas a action retorna mensagens reais (e-mail já
   cadastrado, rate-limit) que precisam de lugar. Usa a mesma cor de erro. */
.npcad .alerta{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;border-radius:12px;
  background:#FDF3F3;border:1px solid #F0CFCF;font:500 13px/1.45 'Instrument Sans';color:#9C2F2F}
.npcad .alerta svg{flex:none;margin-top:1px}

.npcad .cta{width:100%;padding:17px;border:0;border-radius:12px;background:var(--green);color:#fff;cursor:pointer;
  font:700 16.5px 'Instrument Sans';box-shadow:0 8px 22px rgba(14,158,92,.3);transition:background .15s,box-shadow .15s,transform .12s;
  display:flex;align-items:center;justify-content:center;gap:9px}
.npcad .cta:hover{background:var(--green-bright);box-shadow:0 12px 30px rgba(14,158,92,.36)}
.npcad .cta:active{transform:translateY(1px)}
.npcad .cta:disabled{cursor:default;opacity:.72;box-shadow:none}
.npcad .assur{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:16px}
.npcad .assur span{display:flex;align-items:center;gap:6px;font:400 12.5px 'Instrument Sans';color:var(--muted)}
.npcad .assur b{color:var(--green)}
.npcad .legal{margin:2px 0 0;text-align:center;font:400 11.5px/1.5 'Instrument Sans';color:var(--muted-2)}
.npcad .login{display:flex;align-items:center;justify-content:center;gap:8px;padding-top:10px;font:400 14px 'Instrument Sans';color:var(--muted)}
.npcad .login a{font-weight:600}
.npcad .actions{display:flex;flex-direction:column;gap:10px}

.npcad .done{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:60px 0}
.npcad .done .mark{width:56px;height:56px;border-radius:50%;background:var(--green-bright);color:#fff;font:700 26px/56px 'Instrument Sans'}
.npcad .done h2{margin:0;font:700 26px/1.2 'Archivo',sans-serif;letter-spacing:-.02em}
.npcad .done p{margin:0;max-width:340px;font:400 15px/1.5 'Instrument Sans';color:#66757F}
.npcad .done b{color:var(--ink)}

.npcad .mbar{display:none}

@media (max-width:1180px){
  .npcad .main{padding:40px 40px}
  .npcad .row{grid-template-columns:1fr;gap:0}
  .npcad .row .f + .f{border-top:1px solid var(--line-2);padding-top:16px;margin-top:16px}
  .npcad .aside h1{font-size:36px}
}

@media (max-width:1023px){
  .npcad .page{display:block;min-height:100dvh}
  .npcad .aside{display:none}
  .npcad .mhead{display:flex}
  .npcad .main{padding:18px 18px 176px}
  .npcad .form-col{gap:16px;max-width:520px}
  .npcad .head{display:none}
  .npcad .group{padding:4px 16px 16px}
  .npcad .row{grid-template-columns:1fr;gap:0}
  .npcad .row .f + .f{border-top:1px solid var(--line-2);padding-top:16px;margin-top:16px}
  .npcad .legal{margin-bottom:4px}
  .npcad .actions{display:none}
  .npcad .mbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:5;flex-direction:column;gap:9px;
    padding:14px 18px calc(18px + env(safe-area-inset-bottom));background:rgba(244,246,245,.95);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid var(--line)}
  .npcad .mbar .cta{padding:0;height:54px}
  .npcad .mbar .login{padding-top:0;font-size:12px}
}

@media (prefers-reduced-motion:reduce){
  .npcad *{transition:none!important;animation:none!important}
}
`;

export function CadastroStyle() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
