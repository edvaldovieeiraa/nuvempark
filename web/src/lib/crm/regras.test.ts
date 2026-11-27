import { describe, expect, it } from "vitest";
import {
  destinosPossiveis,
  podeMoverPara,
  MOTIVOS_MANUAIS,
} from "@/lib/crm/regras";
import type { Estagio, EstadoAssinatura } from "@/lib/crm/tipos";

function lead(
  status: Estagio,
  tenantId: string | null = null,
  assinaturaEstado: EstadoAssinatura | null = null,
) {
  return { status, tenantId, assinaturaEstado };
}

describe("podeMoverPara — movimento livre (decisão de 26/11/2026)", () => {
  const TODOS = ["novo", "em_contato", "trial", "ganho", "perdido"] as const;

  it("qualquer estágio vai para os outros quatro, na ordem do funil", () => {
    for (const s of TODOS) {
      expect(destinosPossiveis(lead(s))).toEqual(TODOS.filter((d) => d !== s));
    }
  });

  it("vale com ou sem rede, e qualquer estado da assinatura", () => {
    expect(destinosPossiveis(lead("ganho", "t1", "ativa"))).toEqual(["novo", "em_contato", "trial", "perdido"]);
    expect(podeMoverPara(lead("perdido", "t1", "cancelada"), "trial")).toBe(true);
    expect(podeMoverPara(lead("novo"), "ganho")).toBe(true);
  });

  it("nunca move para o próprio estágio nem para estágio desconhecido", () => {
    for (const s of TODOS) expect(podeMoverPara(lead(s), s)).toBe(false);
    expect(podeMoverPara(lead("novo"), "fechado" as never)).toBe(false);
  });
});

describe("MOTIVOS_MANUAIS", () => {
  it("tem os 6 motivos do master e não tem cancelou (é do sistema)", () => {
    expect(MOTIVOS_MANUAIS).toEqual([
      "preco",
      "sem_retorno",
      "concorrente",
      "sem_perfil",
      "desistiu",
      "outro",
    ]);
  });
});
