"""Gera os elementos gráficos da página da Play (ícone, recurso gráfico, capturas).

Uso: python3 gerar_play.py <raiz-do-repo>
Saída: <raiz>/app/store/play/
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(sys.argv[1])
OUT = RAIZ / "app/store/play"
OUT.mkdir(parents=True, exist_ok=True)
UP = RAIZ / "web/public/uploads"

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
BOLD, DEMI, MEDIUM = 0, 2, 5
VERDE_TOPO = (22, 163, 74)     # #16A34A
VERDE_BASE = (22, 101, 52)     # #166534
FUNDO_CLARO = (240, 247, 242)


def fonte(tam, peso=BOLD):
    return ImageFont.truetype(AVENIR, tam, index=peso)


def gradiente(w, h, c1, c2):
    g = Image.new("RGB", (w, h))
    px = g.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        cor = tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))
        for x in range(w):
            px[x, y] = cor
    return g


def cantos(im, raio):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], raio, fill=255)
    out = im.convert("RGBA")
    out.putalpha(m)
    return out


def com_sombra(base, im, xy, raio_blur=28, deslocamento=18, opacidade=90):
    sombra = Image.new("RGBA", (im.size[0] + 120, im.size[1] + 120), (0, 0, 0, 0))
    a = im.split()[-1].point(lambda v: opacidade if v else 0)
    sombra.paste((0, 0, 0, 255), (60, 60 + deslocamento), a)
    sombra = sombra.filter(ImageFilter.GaussianBlur(raio_blur))
    base.alpha_composite(sombra, (xy[0] - 60, xy[1] - 60))
    base.alpha_composite(im, xy)


def texto_centro(d, cx, y, txt, f, cor):
    w = d.textlength(txt, font=f)
    d.text((cx - w / 2, y), txt, font=f, fill=cor)


# ---------------------------------------------------------------- 1) ícone 512
icone = Image.open(RAIZ / "app/assets/icon/app_icon.png").convert("RGBA")
# Cantos transparentes → fundo com a mesma cor de cada linha (gradiente vertical
# do próprio ícone, amostrado no centro horizontal da borda opaca).
fundo = Image.new("RGBA", icone.size)
px_i, px_f = icone.load(), fundo.load()
for y in range(icone.size[1]):
    amostra = None
    for x in list(range(0, 60)) + list(range(452, 512)):
        r, g, b, a = px_i[x, y]
        if a == 255 and g > r + 40:
            amostra = (r, g, b, 255)
            break
    if amostra is None:
        amostra = px_i[256, y][:3] + (255,)
    for x in range(icone.size[0]):
        px_f[x, y] = amostra
fundo.alpha_composite(icone)
fundo.convert("RGB").save(OUT / "icone-512.png", optimize=True)

# ------------------------------------------------------- 2) capturas 1080x1920
TELAS = [
    ("Screenshot_20260723-175938.png", "Operação completa", "no celular do operador"),
    ("Screenshot_20260720-204441.png", "Entrada pela câmera:", "o app lê a placa"),
    ("Screenshot_20260717-201543.png", "Todo o pátio", "em tempo real"),
    ("Screenshot_20260723-181324.png", "Saída com a tarifa", "calculada na hora"),
    ("Screenshot_20260720-204528.png", "Pix com QR Code", "direto na tela"),
    ("Screenshot_20260717-201549.png", "Caixa do turno", "aberto e fechado no app"),
]
W, H = 1080, 1920
for i, (arq, l1, l2) in enumerate(TELAS, 1):
    base = gradiente(W, H, VERDE_TOPO, VERDE_BASE).convert("RGBA")
    d = ImageDraw.Draw(base)
    texto_centro(d, W / 2, 120, l1, fonte(76), (255, 255, 255))
    texto_centro(d, W / 2, 215, l2, fonte(76, DEMI), (220, 252, 231))
    tela = Image.open(UP / arq).convert("RGB")
    alvo_h = 1500
    alvo_w = round(tela.size[0] * alvo_h / tela.size[1])
    tela = cantos(tela.resize((alvo_w, alvo_h), Image.LANCZOS), 44)
    # moldura branca fina simulando o aparelho
    moldura = cantos(Image.new("RGB", (alvo_w + 24, alvo_h + 24), (255, 255, 255)), 56)
    moldura.alpha_composite(tela, (12, 12))
    x = (W - moldura.size[0]) // 2
    com_sombra(base, moldura, (x, 370))
    base.convert("RGB").save(OUT / f"captura-{i:02d}.png", optimize=True)

# ------------------------------------------------- 3) recurso gráfico 1024x500
FW, FH = 1024, 500
fg = gradiente(FW, FH, VERDE_TOPO, VERDE_BASE).convert("RGBA")
d = ImageDraw.Draw(fg)
ic = Image.open(RAIZ / "app/assets/icon/app_icon.png").convert("RGBA").resize((96, 96), Image.LANCZOS)
fg.alpha_composite(ic, (56, 60))
d.text((168, 72), "NuvemPark", font=fonte(54), fill=(255, 255, 255))
d.text((56, 196), "O estacionamento inteiro", font=fonte(44), fill=(255, 255, 255))
d.text((56, 252), "no celular do operador", font=fonte(44, DEMI), fill=(220, 252, 231))
d.text((56, 340), "Placa pela câmera · Pix · Ticket Bluetooth", font=fonte(24, MEDIUM), fill=(220, 252, 231))
d.text((56, 376), "Funciona sem internet", font=fonte(24, MEDIUM), fill=(220, 252, 231))
tela = Image.open(UP / "Screenshot_20260723-175938.png").convert("RGB")
tw = 300
tela = tela.resize((tw, round(tela.size[1] * tw / tela.size[0])), Image.LANCZOS)
tela = cantos(tela, 30)
mold = cantos(Image.new("RGB", (tw + 16, tela.size[1] + 16), (255, 255, 255)), 38)
mold.alpha_composite(tela, (8, 8))
com_sombra(fg, mold, (FW - tw - 90, 56), raio_blur=20, deslocamento=10)  # sai pela base: recorte natural
fg.convert("RGB").save(OUT / "recurso-grafico-1024x500.png", optimize=True)

for f in sorted(OUT.iterdir()):
    im = Image.open(f)
    print(f.name, im.size, f"{f.stat().st_size // 1024} KB")
