import { describe, expect, it } from "vitest";
import { decidirEnriquecimento, type LeadParaEnriquecer } from "@/lib/crm/enriquecimento";
import type { Origem } from "@/lib/crm/origem";

const doVinculo: LeadParaEnriquecer = {
  nome: "Rede Sol",
  empresa: "Rede Sol",
  origem: "/",
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  vinculo_criou_lead: true,
};

const deContato: LeadParaEnriquecer = {
  nome: "Ana Souza",
  empresa: null,
  origem: "/precos",
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  vinculo_criou_lead: false,
};

const origem: Origem = {
  v: 1,
  src: "google",
  med: "cpc",
  camp: "bf",
  caminho: "/solucoes/estacionamento",
  em: "2026-11-26T12:00:00.000Z",
};

describe("decidirEnriquecimento", () => {
  it("lead do vínculo com nome da rede: nome do responsável, UTM e caminho de entrada", () => {
    expect(decidirEnriquecimento(doVinculo, { nomeResponsavel: " Ana Souza ", origem })).toEqual({
      nome: "Ana Souza",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "bf",
      origem: "/solucoes/estacionamento",
    });
  });

  it("lead do vínculo com nome já trocado: não mexe no nome", () => {
    const r = decidirEnriquecimento(
      { ...doVinculo, nome: "Carlos" },
      { nomeResponsavel: "Ana", origem: null },
    );
    expect(r).toEqual({});
  });

  it("lead de contato: mantém nome e a página do formulário; UTM só onde nulo", () => {
    expect(
      decidirEnriquecimento(
        { ...deContato, utm_source: "facebook" },
        { nomeResponsavel: "Outro Nome", origem },
      ),
    ).toEqual({ utm_medium: "cpc", utm_campaign: "bf" });
  });

  it("UTM já preenchida nunca é sobrescrita", () => {
    expect(
      decidirEnriquecimento(
        { ...doVinculo, nome: "X", utm_source: "a", utm_medium: "b", utm_campaign: "c" },
        { nomeResponsavel: "", origem: { ...origem, caminho: null } },
      ),
    ).toEqual({});
  });

  it("nome em branco ou curto demais não entra; nome longo é cortado em 120", () => {
    expect(decidirEnriquecimento(doVinculo, { nomeResponsavel: "  ", origem: null })).toEqual({});
    expect(decidirEnriquecimento(doVinculo, { nomeResponsavel: "A", origem: null })).toEqual({});
    const r = decidirEnriquecimento(doVinculo, { nomeResponsavel: "n".repeat(300), origem: null });
    expect(r.nome).toHaveLength(120);
  });

  it("nome com surrogate solto sai limpo", () => {
    expect(
      decidirEnriquecimento(doVinculo, { nomeResponsavel: "Ana\ud800 Souza", origem: null }).nome,
    ).toBe("Ana Souza");
  });

  it("nome igual ao atual não gera escrita", () => {
    expect(decidirEnriquecimento(doVinculo, { nomeResponsavel: "Rede Sol", origem: null })).toEqual(
      {},
    );
  });

  it("valores da origem são cortados de novo (UTM 300 → 100, caminho → 200)", () => {
    const r = decidirEnriquecimento(doVinculo, {
      nomeResponsavel: null,
      origem: { ...origem, src: "s".repeat(300), caminho: "/" + "c".repeat(300) },
    });
    expect(r.utm_source).toHaveLength(100);
    expect(r.origem).toHaveLength(200);
  });

  it("sem origem e sem nome: patch vazio", () => {
    expect(decidirEnriquecimento(doVinculo, { nomeResponsavel: undefined, origem: null })).toEqual(
      {},
    );
  });
});
