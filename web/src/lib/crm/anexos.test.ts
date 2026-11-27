import { describe, expect, it } from "vitest";
import {
  LIMITE_BYTES,
  LIMITE_PRINTS,
  cabeNaNota,
  caminhoDoLead,
  dimensoesDoCabecalho,
  dimensoesReduzidas,
  extensaoDoTipo,
  novoCaminho,
  tipoPorBytes,
} from "@/lib/crm/anexos";

const LEAD = "3f1c2b4a-1111-4222-8333-444455556666";
const UUID = "9a2e7d10-aaaa-4bbb-8ccc-dddd0000eeee";

function bytes(...partes: (number[] | string)[]): Uint8Array {
  const out: number[] = [];
  for (const p of partes) {
    if (typeof p === "string") for (const c of p) out.push(c.charCodeAt(0));
    else out.push(...p);
  }
  return new Uint8Array(out);
}
const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16be = (n: number) => [(n >>> 8) & 255, n & 255];
const u32le = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const u24le = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];

// PNG: assinatura + IHDR (largura/altura big-endian nos bytes 16..23)
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], u32be(13), "IHDR", u32be(1170), u32be(2532), [8, 6, 0, 0, 0]);
// JPEG: SOI, um APP0 curto, SOF0 com altura/largura
const JPEG = bytes([0xff, 0xd8], [0xff, 0xe0], u16be(4), [0, 0], [0xff, 0xc0], u16be(11), [8], u16be(600), u16be(800), [3, 1, 0x22, 0]);
// JPEG progressivo (SOF2) depois de um DQT
const JPEG_PROG = bytes([0xff, 0xd8], [0xff, 0xdb], u16be(3), [0], [0xff, 0xc2], u16be(11), [8], u16be(1080), u16be(1920), [3, 0, 0, 0]);
// WebP VP8X: largura-1 e altura-1 em 24 bits little-endian nos bytes 24..29
const WEBP_X = bytes("RIFF", u32le(30), "WEBP", "VP8X", u32le(10), [0, 0, 0, 0], u24le(2559), u24le(1439));
// WebP VP8L: 14 bits de largura-1 e 14 de altura-1 depois do byte 0x2f
function vp8l(w: number, h: number) {
  const v = (w - 1) | ((h - 1) << 14);
  return bytes("RIFF", u32le(30), "WEBP", "VP8L", u32le(10), [0x2f], u32le(v));
}
// WebP VP8 (lossy): código de quadro 9d 01 2a e dimensões de 14 bits
const WEBP_VP8 = bytes("RIFF", u32le(30), "WEBP", "VP8 ", u32le(10), [0, 0, 0], [0x9d, 0x01, 0x2a], [0x20, 0x03], [0x58, 0x02]);

describe("tipoPorBytes", () => {
  it("reconhece PNG, JPEG e WebP pelos bytes", () => {
    expect(tipoPorBytes(PNG)).toBe("image/png");
    expect(tipoPorBytes(JPEG)).toBe("image/jpeg");
    expect(tipoPorBytes(WEBP_X)).toBe("image/webp");
  });
  it("recusa o resto, inclusive GIF e arquivo curto", () => {
    expect(tipoPorBytes(bytes("GIF89a", [0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(tipoPorBytes(bytes("RIFF", u32le(4), "WAVE"))).toBeNull();
    expect(tipoPorBytes(bytes([0x89, 0x50]))).toBeNull();
    expect(tipoPorBytes(new Uint8Array())).toBeNull();
  });
});

describe("dimensoesDoCabecalho", () => {
  it("PNG", () => expect(dimensoesDoCabecalho(PNG, "image/png")).toEqual({ largura: 1170, altura: 2532 }));
  it("JPEG baseline e progressivo", () => {
    expect(dimensoesDoCabecalho(JPEG, "image/jpeg")).toEqual({ largura: 800, altura: 600 });
    expect(dimensoesDoCabecalho(JPEG_PROG, "image/jpeg")).toEqual({ largura: 1920, altura: 1080 });
  });
  it("WebP VP8X, VP8L e VP8", () => {
    expect(dimensoesDoCabecalho(WEBP_X, "image/webp")).toEqual({ largura: 2560, altura: 1440 });
    expect(dimensoesDoCabecalho(vp8l(1170, 2532), "image/webp")).toEqual({ largura: 1170, altura: 2532 });
    expect(dimensoesDoCabecalho(WEBP_VP8, "image/webp")).toEqual({ largura: 800, altura: 600 });
  });
  it("cabeçalho quebrado devolve null", () => {
    expect(dimensoesDoCabecalho(PNG.slice(0, 20), "image/png")).toBeNull();
    expect(dimensoesDoCabecalho(bytes([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg")).toBeNull();
    expect(dimensoesDoCabecalho(bytes("RIFF", u32le(4), "WEBP", "ABCD"), "image/webp")).toBeNull();
  });
});

describe("dimensoesReduzidas", () => {
  it("não aumenta imagem pequena", () => {
    expect(dimensoesReduzidas(1170, 2532)).toEqual({ largura: 1170, altura: 2532 });
    expect(dimensoesReduzidas(2560, 1440)).toEqual({ largura: 2560, altura: 1440 });
  });
  it("reduz o lado maior a 2560 mantendo a proporção", () => {
    expect(dimensoesReduzidas(5120, 2880)).toEqual({ largura: 2560, altura: 1440 });
    expect(dimensoesReduzidas(1290, 2796 * 2)).toEqual({ largura: 591, altura: 2560 });
  });
  it("nunca chega a zero", () => {
    expect(dimensoesReduzidas(10000, 1)).toEqual({ largura: 2560, altura: 1 });
  });
});

describe("cabeNaNota", () => {
  it("limite de 5 por nota", () => {
    expect(LIMITE_PRINTS).toBe(5);
    expect(cabeNaNota(0, 2)).toEqual({ aceitos: 2, recusados: 0 });
    expect(cabeNaNota(4, 3)).toEqual({ aceitos: 1, recusados: 2 });
    expect(cabeNaNota(5, 1)).toEqual({ aceitos: 0, recusados: 1 });
  });
  it("limite de 5 MB", () => expect(LIMITE_BYTES).toBe(5 * 1024 * 1024));
});

describe("caminhos", () => {
  it("gera e confere o caminho do lead", () => {
    const c = novoCaminho(LEAD, UUID, "image/webp");
    expect(c).toBe(`${LEAD}/${UUID}.webp`);
    expect(caminhoDoLead(LEAD, c)).toBe(true);
    expect(extensaoDoTipo("image/jpeg")).toBe("jpg");
    expect(extensaoDoTipo("image/png")).toBe("png");
  });
  it("recusa caminho de outro lead, com pasta extra ou extensão errada", () => {
    const outro = "00000000-1111-4222-8333-444455556666";
    expect(caminhoDoLead(LEAD, `${outro}/${UUID}.webp`)).toBe(false);
    expect(caminhoDoLead(LEAD, `${LEAD}/../${UUID}.webp`)).toBe(false);
    expect(caminhoDoLead(LEAD, `${LEAD}/${UUID}.gif`)).toBe(false);
    expect(caminhoDoLead(LEAD, `${LEAD}/${UUID}.WEBP`)).toBe(false);
    expect(caminhoDoLead("x", `x/${UUID}.webp`)).toBe(false);
  });
});
