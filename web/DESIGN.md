---
name: NuvemPark
description: Gestão de estacionamento na nuvem — painel do gestor + site
colors:
  brand: "#059669"
  brand-500: "#10B981"
  brand-700: "#047857"
  brand-50: "#ECFDF5"
  brand-200: "#A7F3D0"
  acento: "#0EA5E9"
  acento-teal: "#14B8A6"
  violeta: "#8B5CF6"
  ambar: "#F59E0B"
  fundo: "#F4F7F5"
  superficie: "#FFFFFF"
  borda: "#E3EAE4"
  texto: "#101B14"
  texto-2: "#56655B"
  texto-3: "#8FA096"
  noite: "#0B1512"
  noite-2: "#10201A"
  saida: "#F97316"
  perigo: "#EF4444"
  aviso: "#F59E0B"
  info: "#3B82F6"
typography:
  display:
    fontFamily: "Geist, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  metric:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  caption:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  micro:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.md}"
    padding: "0 28px"
    height: "48px"
  button-ghost:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto-2}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "44px"
  card:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "48px"
  chip-selected:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: NuvemPark

## 1. Overview

**Creative North Star: "Torre de Controle"**

O NuvemPark é a torre de controle do estacionamento: leve e respirada por fora, densa e precisa por dentro. A superfície é clara (light-first), quase branca esverdeada, para que o dado — o real que entrou, o carro no pátio, o caixa aberto — seja o elemento com mais peso na tela. O verde-esmeralda é a marca e o sinal de "dinheiro no lugar certo"; o navy-esverdeado escuro (`noite`) ancora a navegação como o casco de um instrumento. Tudo comunica movimento em tempo real: pulsos "AO VIVO", sincronização, faturamento subindo.

O sistema rejeita explicitamente a estética de **sistema legado corporativo**: nada de cinza morto estilo ERP dos anos 2000, tabelas infinitas sem hierarquia, ou telas que exigem manual. A densidade da operação existe, mas é organizada e calma — o gestor bate o olho e entende, sem intimidação. Sofisticação aqui é clareza sob pressão, não ornamento.

**Key Characteristics:**
- Light-first: fundo claro esverdeado, dado em primeiro plano.
- Verde-esmeralda como marca e semântica de dinheiro/sucesso.
- Navegação em navy-esverdeado escuro (`noite`) como âncora de instrumento.
- Tempo real como protagonista (pulsos, "ao vivo", sincronização).
- Denso porém calmo: hierarquia forte, zero ruído decorativo.

## 2. Colors

Paleta light-first ancorada no verde-esmeralda, com um leque de acentos (céu, teal, violeta, âmbar) usados com parcimônia para codificar tipos de dado, e um navy-esverdeado escuro reservado à navegação.

### Primary
- **Esmeralda NuvemPark** (#059669, escala 50→900): a marca. CTAs, valores positivos, estados "em dia"/"ativo", pulsos de tempo real. Carrega o significado de "dinheiro no lugar certo".

### Secondary
- **Céu** (#0EA5E9) e **Teal** (#14B8A6): acentos que aparecem em pares com o verde (gradientes de destaque, ícones de dado secundário como "no pátio agora").

### Tertiary
- **Violeta** (#8B5CF6): dado terciário / métricas neutras (ex.: contadores de saída), sempre pontual.
- **Âmbar** (#F59E0B): atenção não-crítica — trial, "mês em aberto", avaria/perícia.

### Neutral
- **Tinta** (#101B14): texto principal. Quase preto esverdeado, alto contraste sobre superfície.
- **Tinta-2** (#56655B): texto secundário, descrições.
- **Tinta-3** (#8FA096): texto terciário, metadados, placeholders — usar só onde 4.5:1 não é exigido.
- **Fundo** (#F4F7F5) / **Superfície** (#FFFFFF) / **Borda** (#E3EAE4): base clara em camadas.
- **Noite** (#0B1512 / #10201A): navy-esverdeado escuro exclusivo da navegação (sidebar) e de seções dramáticas (ex.: perícia de avaria).

### Semantic
- **Saída** (#F97316), **Perigo** (#EF4444), **Aviso** (#F59E0B), **Info** (#3B82F6): estados de sistema, cada um com seu `-bg` claro correspondente.

### Named Rules
**A Regra do Verde-Dinheiro.** O esmeralda é reservado ao que significa dinheiro/sucesso/marca. Não usar verde como cor decorativa neutra; sua carga semântica é o ponto.

**A Regra do Escuro-Instrumento.** O `noite` é a moldura, não o palco do conteúdo. Aparece na navegação, no **hero do site** ("Torre de Controle à noite": palco escuro, produto claro aceso no centro) e em seções dramáticas deliberadas (ex.: perícia de avaria) — nunca como fundo padrão das telas de produto. O produto é light-first.

## 3. Typography

**Display Font:** Geist (com fallback -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Geist (mesma família, pesos distintos)
**Label/Mono Font:** stack mono do sistema (ui-monospace, SFMono-Regular, Menlo) para placas, códigos e timestamps.

**Character:** Uma única família geométrica-neutra (Geist) em pesos que vão do 400 ao 900, dando hierarquia por contraste de peso e tamanho — não por mistura de fontes. O mono entra estruturalmente onde o dado é um identificador (placa, código de pátio, horário), reforçando o tom "instrumento".

### Hierarchy
- **Display** (900, clamp 2.25→3.75rem, 1.06): títulos de hero e cabeçalhos de página do painel (`text-[26px] font-black`). `text-wrap: balance`.
- **Headline** (900, 1.625rem, 1.1): título de tela / seção.
- **Title** (700–800, 1.125rem): títulos de card e modal.
- **Metric** (900, 1.5rem/24px, 1, tabular-nums): valor numérico de destaque em KPI cards (faturamento, contadores). O dado é o protagonista.
- **Body** (400, 1rem, 1.6): texto corrido; mínimo 16px por acessibilidade; máx 65–75ch.
- **Caption** (400, 0.8125rem/13px, 1.4): metadados densos, subitens de menu, descrições de linha em listas de operação. Nunca corpo de leitura longo.
- **Label** (700, 0.6875rem/11px, +0.06em, UPPERCASE): rótulos de KPI, cabeçalhos de tabela, eyebrows semânticos.
- **Micro** (700, 0.625rem/10px, +0.06em, UPPERCASE): micro-rótulos e badges de status onde o espaço é apertado (sidebar, seletor de pátio, chips).
- **Mono** (700, 0.875rem, +0.06em): placas, códigos de 4 dígitos, timestamps.

### Named Rules
**A Regra do Peso, não da Fonte.** A hierarquia vem de peso (400↔900) e tamanho numa família só. Nunca pareie Geist com outra sans parecida.

## 4. Elevation

Sistema majoritariamente plano com elevação por camadas de sombra suave e difusa (nunca sombra dura de "app de 2014"). Superfícies descansam planas sobre o fundo claro; a sombra responde a importância (card em destaque) e a estado (hover sobe). O escuro (`noite`) usa sombra profunda para "flutuar" cards de vidro sobre si.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgb(16 27 20 / 0.04), 0 4px 16px -4px rgb(16 27 20 / 0.06)`): superfície em repouso.
- **Card-hover** (`0 2px 4px .../0.05, 0 12px 32px -8px .../0.14`): resposta ao hover.
- **Brand** (`0 8px 24px -6px rgb(5 150 105 / 0.4)`): halo verde sob CTAs primários — a sombra "carrega marca".
- **Pop** (`0 24px 64px -16px rgb(16 27 20 / 0.25)`): modais, popovers, dropdowns.

### Named Rules
**A Regra da Sombra-Difusa.** Sombras são grandes, suaves e de baixa opacidade. Se parecer sombra dura de app antigo, o blur está pequeno e a opacidade alta.

## 5. Components

### Buttons
- **Shape:** cantos médios (12px, `rounded-xl`), altura mínima 48px (44px em ghost).
- **Primary:** gradiente `brand-600 → brand-500`, texto branco, `shadow-brand` (halo verde). `whileTap scale 0.96`, `whileHover y:-1`.
- **Hover / Focus:** `brightness-110`; foco com ring de marca.
- **Ghost:** superfície branca, borda `borda`, texto `texto-2`; hover vira borda `brand-300` + texto `brand-700` + fundo `brand-50`.

### Chips
- **Style:** selecionado = fundo sólido `brand-600` + texto branco (nunca o cinza-apagado default do Material 3); não-selecionado = superfície + borda.
- **State:** filtros usam pill com contagem; badges semânticos usam `-bg` + texto da cor (ex.: trial = `info-bg`/`info`).

### Cards / Containers
- **Corner Style:** 16px (`rounded-2xl`) em cards de conteúdo; 12px em controles.
- **Background:** `superficie` (#FFFFFF) sobre `fundo` (#F4F7F5).
- **Shadow Strategy:** `shadow-card` em repouso, `shadow-card-hover` no hover (ver Elevation).
- **Border:** 1px `borda` (#E3EAE4).
- **Internal Padding:** 20px.
- **Cards aninhados são proibidos.** Uma linha ou uma borda basta.

### Inputs / Fields
- **Style:** superfície branca, borda `borda`, radius 10–12px, altura 48px, label visível acima.
- **Focus:** borda `brand-400` + ring `brand-500/15`.
- **Error:** borda/badge `perigo` com `perigo-bg`.

### Navigation
- **Sidebar** em `noite` (navy-esverdeado escuro), largura fixa, `sticky`. Item ativo: pill sólido com gradiente `brand-600→brand-500` (indicador `layoutId` animado no framer-motion) + texto branco/bold; inativo: texto `white/55`, hover `white/5`. Ícone `shrink-0`, label `truncate`.

### KPI Card (signature)
Card de métrica do dashboard: rótulo em label uppercase, valor em `font-black tabular-nums`, ícone em quadrado colorido. O card de destaque usa gradiente `brand-700→brand-600→acento-teal` com halo interno. Evita a "hero-metric template" genérica por usar contexto real (faturamento hoje, no pátio agora) e o pulso "AO VIVO".

## 6. Do's and Don'ts

### Do:
- **Do** manter o produto light-first: fundo claro, dado em primeiro plano; use `noite` só na navegação e em seções deliberadas.
- **Do** reservar o verde-esmeralda para dinheiro/sucesso/marca (a Regra do Verde-Dinheiro).
- **Do** usar mono para identificadores (placa, código, horário) — reforça o tom instrumento.
- **Do** dar contraste real ao chip/ícone ativo (fundo sólido de marca + texto branco), corrigindo o default apagado do Material 3.
- **Do** garantir corpo ≥ 16px e contraste WCAG AA (≥4.5:1); o público inclui usuários mais velhos e pouco técnicos.
- **Do** manter sombras grandes, suaves e de baixa opacidade (a Regra da Sombra-Difusa).

### Don't:
- **Don't** parecer sistema legado corporativo: sem cinza morto de ERP, tabelas infinitas sem hierarquia, menus aninhados confusos.
- **Don't** usar jargão técnico em rótulos, erros ou vazios — fale a língua do dono de pátio.
- **Don't** empilhar cards genéricos idênticos (ícone + título + texto) onde uma linha resolve; cards aninhados nunca.
- **Don't** usar `noite` como fundo padrão de conteúdo — o produto é claro.
- **Don't** aplicar gradiente decorativo em texto (`background-clip: text`) nem borda lateral colorida > 1px como acento.
- **Don't** deixar texto cinza-3 (#8FA096) em corpo de leitura; ele é para metadados, não para prosa.
