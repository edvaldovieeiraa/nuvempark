import type {
  MovimentosResumo,
  PagamentosTicketsResumo,
  MensalidadesResumo,
  ReceitasResumo,
  DespesasResumo,
  FormasResumo,
  TotalizadorResumo,
} from "@/app/painel/financeiro/prestacao/actions";
import { formatarDataHora } from "@/lib/format-data";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type RelatorioMeta = {
  patio: string;
  periodo: string;
  operador: string;
  geradoPor: string;
  geradoEm: string;
};

export type RelatorioDados = {
  meta: RelatorioMeta;
  movimentos?: MovimentosResumo;
  pagTickets?: PagamentosTicketsResumo;
  mensalidades?: MensalidadesResumo;
  receitas?: ReceitasResumo;
  despesas?: DespesasResumo;
  formas?: FormasResumo;
  totalizador?: TotalizadorResumo;
};

const VERDE: [number, number, number] = [5, 150, 105];

/** Gera e baixa o PDF (texto selecionável, cabeçalho repetido por página). */
export async function gerarPdf(
  d: RelatorioDados,
  nomeArquivo: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40;

  const cabecalho = () => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Prestação de contas", M, 34);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(`${d.meta.patio} · ${d.meta.periodo}`, M, 50);
    doc.setTextColor(0);
  };

  // Bloco de identificação (só na 1ª página).
  cabecalho();
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Operador: ${d.meta.operador}   ·   Gerado por ${d.meta.geradoPor} em ${d.meta.geradoEm}`,
    M,
    66,
  );
  doc.setTextColor(0);

  let y = 88;
  const finalY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;

  const secao = (
    titulo: string,
    head: string[][],
    body: (string | number)[][],
  ) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, M, y);
    autoTable(doc, {
      startY: y + 8,
      head,
      body: body.length ? body : [["—", "", ""].slice(0, head[0].length)],
      margin: { top: 80, left: M, right: M },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: VERDE, textColor: 255 },
      alternateRowStyles: { fillColor: [246, 248, 250] },
      didDrawPage: cabecalho,
    });
    y = finalY() + 22;
  };

  if (d.movimentos) {
    const m = d.movimentos;
    secao(
      "1. Resumo dos movimentos",
      [["Fechamento", "Operador", "Fundo", "Entradas", "Sangrias", "Esperado", "Contado", "Diverg."]],
      m.sessoes.map((s) => [
        formatarDataHora(s.fechamento),
        s.operador_nome ?? "—",
        moeda.format(s.fundo),
        moeda.format(s.entradas),
        moeda.format(s.sangrias),
        moeda.format(s.esperado),
        moeda.format(s.contado),
        moeda.format(s.divergencia),
      ]),
    );
    secao(
      "",
      [["Fechamentos", "Total contado", "Divergência total", "Com divergência"]],
      [[m.qtd, moeda.format(m.totalContado), moeda.format(m.totalDivergencia), m.comDivergencia]],
    );
  }

  if (d.pagTickets) {
    const t = d.pagTickets;
    secao(
      "2. Pagamentos de tickets",
      [["Qtd", "Total", "Ticket médio"]],
      [[t.qtd, moeda.format(t.total), moeda.format(t.ticketMedio)]],
    );
  }

  if (d.mensalidades) {
    const mm = d.mensalidades;
    secao(
      "3. Pagamentos de mensalidade",
      [["Forma", "Qtd", "Total"]],
      mm.porForma.map((f) => [f.forma, f.qtd, moeda.format(f.total)]),
    );
    secao(
      "",
      [["Origem", "Qtd", "Total"]],
      [
        ["App", mm.origem.app.qtd, moeda.format(mm.origem.app.total)],
        ["Painel", mm.origem.painel.qtd, moeda.format(mm.origem.painel.total)],
        ["Total", mm.qtd, moeda.format(mm.total)],
      ],
    );
  }

  if (d.receitas) {
    const r = d.receitas;
    secao(
      "4. Receitas (entradas de caixa)",
      [["Origem", "Valor"]],
      [
        ["Tickets", moeda.format(r.tickets)],
        ["Mensalidades (app)", moeda.format(r.mensalidades)],
        ["Outras entradas", moeda.format(r.outras)],
        ["Total", moeda.format(r.total)],
      ],
    );
  }

  if (d.despesas) {
    const dd = d.despesas;
    secao(
      "5. Despesas (sangrias)",
      [["Quando", "Descrição", "Valor"]],
      dd.itens.map((i) => [
        formatarDataHora(i.quando),
        i.descricao,
        moeda.format(i.valor),
      ]),
    );
    secao("", [["Sangrias", "Total"]], [[dd.qtd, moeda.format(dd.total)]]);
  }

  if (d.formas) {
    const f = d.formas;
    secao(
      "6. Formas de pagamento",
      [["Forma", "Qtd", "Valor", "%"]],
      f.formas.map((x) => [
        x.forma,
        x.qtd,
        moeda.format(x.valor),
        `${x.pct.toFixed(1)}%`,
      ]),
    );
  }

  if (d.totalizador) {
    const t = d.totalizador;
    secao(
      "7. Totalizador",
      [["Receitas", "Despesas", "Saldo"]],
      [[moeda.format(t.receitas), moeda.format(t.despesas), moeda.format(t.saldo)]],
    );
  }

  doc.save(nomeArquivo);
}
