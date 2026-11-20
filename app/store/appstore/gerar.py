"""Gera as capturas da App Store (iPhone 6,9", 1320x2868) com o mesmo visual da Play.

Uso: python3 app/store/appstore/gerar.py <raiz-do-repo>
As telas-fonte são as mesmas da Play (web/public/uploads). A interface Flutter é
igual no iPhone e nenhuma delas mostra barra ou botões do Android.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(sys.argv[1])
OUT = RAIZ / "app/store/appstore"
UP = RAIZ / "web/public/uploads"
AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
BOLD, DEMI = 0, 2
VERDE_TOPO, VERDE_BASE = (22, 163, 74), (22, 101, 52)

TELAS = [
    ("Screenshot_20260723-175938.png", "Operação completa", "no celular do operador"),
    ("Screenshot_20260720-204441.png", "Entrada pela câmera:", "o app lê a placa"),
    ("Screenshot_20260717-201543.png", "Todo o pátio", "em tempo real"),
    ("Screenshot_20260723-181324.png", "Saída com a tarifa", "calculada na hora"),
    ("Screenshot_20260720-204528.png", "Pix com QR Code", "direto na tela"),
    ("Screenshot_20260717-201549.png", "Caixa do turno", "aberto e fechado no app"),
]
W, H = 1320, 2868


def fonte(tam, peso=BOLD):
    return ImageFont.truetype(AVENIR, tam, index=peso)


def gradiente(w, h, c1, c2):
    linha = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        linha.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(c1, c2)))
    return linha.resize((w, h))


def cantos(im, raio):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], raio, fill=255)
    out = im.convert("RGBA")
    out.putalpha(m)
    return out


def com_sombra(base, im, xy, raio_blur=36, deslocamento=24, opacidade=90):
    sombra = Image.new("RGBA", (im.size[0] + 160, im.size[1] + 160), (0, 0, 0, 0))
    a = im.split()[-1].point(lambda v: opacidade if v else 0)
    sombra.paste((0, 0, 0, 255), (80, 80 + deslocamento), a)
    sombra = sombra.filter(ImageFilter.GaussianBlur(raio_blur))
    base.alpha_composite(sombra, (xy[0] - 80, xy[1] - 80))
    base.alpha_composite(im, xy)


def texto_centro(d, y, txt, f, cor):
    d.text(((W - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=cor)


for i, (arq, l1, l2) in enumerate(TELAS, 1):
    base = gradiente(W, H, VERDE_TOPO, VERDE_BASE).convert("RGBA")
    d = ImageDraw.Draw(base)
    texto_centro(d, 190, l1, fonte(100), (255, 255, 255))
    texto_centro(d, 315, l2, fonte(100, DEMI), (220, 252, 231))
    tela = Image.open(UP / arq).convert("RGB")
    alvo_h = 2220
    alvo_w = round(tela.size[0] * alvo_h / tela.size[1])
    tela = cantos(tela.resize((alvo_w, alvo_h), Image.LANCZOS), 64)
    moldura = cantos(Image.new("RGB", (alvo_w + 32, alvo_h + 32), (255, 255, 255)), 80)
    moldura.alpha_composite(tela, (16, 16))
    com_sombra(base, moldura, ((W - moldura.size[0]) // 2, 540))
    destino = OUT / f"captura-{i:02d}.png"
    base.convert("RGB").save(destino, optimize=True)
    print(destino.name, Image.open(destino).size)
