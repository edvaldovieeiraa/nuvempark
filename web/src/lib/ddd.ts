/**
 * Localização aproximada da rede a partir do DDD do telefone de contato.
 *
 * ⚠️ POR QUE ISSO EXISTE — e por que NÃO é um endereço
 *
 * O cadastro do NuvemPark (self-signup e console master) nunca pediu endereço:
 * `tenants` tem nome, código, CNPJ, razão social e telefone. Para o comercial,
 * porém, saber a PRAÇA do cliente é o que decide abordagem, fuso de ligação e
 * roteiro de visita. O DDD entrega isso de graça, com precisão de região, sem
 * migração e — o ponto principal — de forma RETROATIVA: vale para todas as
 * redes que já existem.
 *
 * O que ele NÃO é: prova de onde o cliente está. O DDD é do NÚMERO, não da
 * pessoa; celular portado viaja com o dono. Trate como pista comercial, nunca
 * como dado cadastral. Por isso a UI rotula "praça (pelo DDD)" e não "endereço".
 *
 * Fonte: plano de numeração da Anatel. `praca` descreve a área de registro do
 * código, não a cidade exata do assinante.
 */

export type RegiaoBR =
  | "Norte"
  | "Nordeste"
  | "Centro-Oeste"
  | "Sudeste"
  | "Sul";

export type LocalDDD = {
  /** Os dois dígitos, como vieram do telefone. */
  ddd: string;
  uf: string;
  estado: string;
  regiao: RegiaoBR;
  /** Área de registro do código — cidade-polo e entorno. */
  praca: string;
};

type Entrada = Omit<LocalDDD, "ddd">;

const UFS: Record<string, { estado: string; regiao: RegiaoBR }> = {
  AC: { estado: "Acre", regiao: "Norte" },
  AL: { estado: "Alagoas", regiao: "Nordeste" },
  AM: { estado: "Amazonas", regiao: "Norte" },
  AP: { estado: "Amapá", regiao: "Norte" },
  BA: { estado: "Bahia", regiao: "Nordeste" },
  CE: { estado: "Ceará", regiao: "Nordeste" },
  DF: { estado: "Distrito Federal", regiao: "Centro-Oeste" },
  ES: { estado: "Espírito Santo", regiao: "Sudeste" },
  GO: { estado: "Goiás", regiao: "Centro-Oeste" },
  MA: { estado: "Maranhão", regiao: "Nordeste" },
  MG: { estado: "Minas Gerais", regiao: "Sudeste" },
  MS: { estado: "Mato Grosso do Sul", regiao: "Centro-Oeste" },
  MT: { estado: "Mato Grosso", regiao: "Centro-Oeste" },
  PA: { estado: "Pará", regiao: "Norte" },
  PB: { estado: "Paraíba", regiao: "Nordeste" },
  PE: { estado: "Pernambuco", regiao: "Nordeste" },
  PI: { estado: "Piauí", regiao: "Nordeste" },
  PR: { estado: "Paraná", regiao: "Sul" },
  RJ: { estado: "Rio de Janeiro", regiao: "Sudeste" },
  RN: { estado: "Rio Grande do Norte", regiao: "Nordeste" },
  RO: { estado: "Rondônia", regiao: "Norte" },
  RR: { estado: "Roraima", regiao: "Norte" },
  RS: { estado: "Rio Grande do Sul", regiao: "Sul" },
  SC: { estado: "Santa Catarina", regiao: "Sul" },
  SE: { estado: "Sergipe", regiao: "Nordeste" },
  SP: { estado: "São Paulo", regiao: "Sudeste" },
  TO: { estado: "Tocantins", regiao: "Norte" },
};

function em(uf: keyof typeof UFS & string, praca: string): Entrada {
  const u = UFS[uf]!;
  return { uf, estado: u.estado, regiao: u.regiao, praca };
}

/** Os 67 DDDs em uso no Brasil. Chave = os dois dígitos. */
const MAPA: Record<string, Entrada> = {
  // ── Sudeste ────────────────────────────────────────────────────────────────
  "11": em("SP", "São Paulo e Grande São Paulo"),
  "12": em("SP", "Vale do Paraíba e Litoral Norte"),
  "13": em("SP", "Baixada Santista"),
  "14": em("SP", "Bauru e Marília"),
  "15": em("SP", "Sorocaba e região"),
  "16": em("SP", "Ribeirão Preto e São Carlos"),
  "17": em("SP", "São José do Rio Preto"),
  "18": em("SP", "Presidente Prudente e Araçatuba"),
  "19": em("SP", "Campinas e região"),
  "21": em("RJ", "Rio de Janeiro e Baixada Fluminense"),
  "22": em("RJ", "Campos dos Goytacazes e Norte Fluminense"),
  "24": em("RJ", "Volta Redonda e Petrópolis"),
  "27": em("ES", "Vitória e Grande Vitória"),
  "28": em("ES", "Cachoeiro de Itapemirim e Sul do estado"),
  "31": em("MG", "Belo Horizonte e região metropolitana"),
  "32": em("MG", "Juiz de Fora e Zona da Mata"),
  "33": em("MG", "Governador Valadares e Teófilo Otoni"),
  "34": em("MG", "Uberlândia e Triângulo Mineiro"),
  "35": em("MG", "Poços de Caldas e Varginha"),
  "37": em("MG", "Divinópolis e Centro-Oeste mineiro"),
  "38": em("MG", "Montes Claros e Norte de Minas"),
  // ── Sul ────────────────────────────────────────────────────────────────────
  "41": em("PR", "Curitiba e região metropolitana"),
  "42": em("PR", "Ponta Grossa e Campos Gerais"),
  "43": em("PR", "Londrina e região"),
  "44": em("PR", "Maringá e Noroeste"),
  "45": em("PR", "Cascavel e Foz do Iguaçu"),
  "46": em("PR", "Pato Branco e Francisco Beltrão"),
  "47": em("SC", "Joinville, Blumenau e Itajaí"),
  "48": em("SC", "Florianópolis e Sul catarinense"),
  "49": em("SC", "Chapecó e Meio-Oeste"),
  "51": em("RS", "Porto Alegre e região metropolitana"),
  "53": em("RS", "Pelotas e Rio Grande"),
  "54": em("RS", "Caxias do Sul e Serra Gaúcha"),
  "55": em("RS", "Santa Maria e Fronteira Oeste"),
  // ── Centro-Oeste ───────────────────────────────────────────────────────────
  "61": em("DF", "Brasília e Entorno"),
  "62": em("GO", "Goiânia e região metropolitana"),
  "64": em("GO", "Rio Verde e Sul goiano"),
  "63": em("TO", "Palmas e todo o estado"),
  "65": em("MT", "Cuiabá e Várzea Grande"),
  "66": em("MT", "Rondonópolis e Sinop"),
  "67": em("MS", "Campo Grande e todo o estado"),
  // ── Norte ──────────────────────────────────────────────────────────────────
  "68": em("AC", "Rio Branco e todo o estado"),
  "69": em("RO", "Porto Velho e todo o estado"),
  "91": em("PA", "Belém e região metropolitana"),
  "93": em("PA", "Santarém e Oeste do Pará"),
  "94": em("PA", "Marabá e Sudeste do Pará"),
  "92": em("AM", "Manaus e região"),
  "97": em("AM", "Coari, Tefé e interior"),
  "95": em("RR", "Boa Vista e todo o estado"),
  "96": em("AP", "Macapá e todo o estado"),
  // ── Nordeste ───────────────────────────────────────────────────────────────
  "71": em("BA", "Salvador e região metropolitana"),
  "73": em("BA", "Ilhéus, Itabuna e Porto Seguro"),
  "74": em("BA", "Juazeiro e Norte baiano"),
  "75": em("BA", "Feira de Santana e Recôncavo"),
  "77": em("BA", "Vitória da Conquista e Barreiras"),
  "79": em("SE", "Aracaju e todo o estado"),
  "81": em("PE", "Recife e Região Metropolitana"),
  "87": em("PE", "Petrolina, Caruaru e Sertão"),
  "82": em("AL", "Maceió e todo o estado"),
  "83": em("PB", "João Pessoa e Campina Grande"),
  "84": em("RN", "Natal e Mossoró"),
  "85": em("CE", "Fortaleza e região metropolitana"),
  "88": em("CE", "Juazeiro do Norte e Sobral"),
  "86": em("PI", "Teresina e Norte do Piauí"),
  "89": em("PI", "Picos e Floriano"),
  "98": em("MA", "São Luís e região"),
  "99": em("MA", "Imperatriz e Sul maranhense"),
};

/**
 * Resolve a praça a partir de um telefone (com ou sem máscara).
 * Retorna `null` para telefone vazio, curto demais ou DDD fora do plano.
 */
export function localizacaoPorTelefone(
  telefone: string | null | undefined,
): LocalDDD | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const ddd = digitos.slice(0, 2);
  const achado = MAPA[ddd];
  return achado ? { ddd, ...achado } : null;
}
