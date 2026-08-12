"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScanLine, ArrowLeft, KeyboardIcon } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";

/**
 * `BarcodeDetector` não é universal — hoje falta no Safari e em Firefox, que
 * juntos são boa parte dos celulares de balcão. A entrada manual não é plano B
 * decorativo: para uma parte dos lojistas ela É o caminho, e por isso aparece
 * junto, e não escondida atrás de um "problemas?".
 */
type Detector = {
  detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [suportado, setSuportado] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const janela = window as unknown as {
      BarcodeDetector?: new (o: { formats: string[] }) => Detector;
    };
    if (!janela.BarcodeDetector) {
      setSuportado(false);
      return;
    }
    setSuportado(true);

    let parar = false;
    let fluxo: MediaStream | null = null;
    const detector = new janela.BarcodeDetector({ formats: ["qr_code"] });

    (async () => {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({
          // Câmera traseira: o cupom está na mão do cliente, do outro lado do
          // balcão.
          video: { facingMode: "environment" },
        });
        if (parar) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = fluxo;
        await video.play();

        const procurar = async () => {
          if (parar || !videoRef.current) return;
          try {
            const achados = await detector.detect(videoRef.current);
            const valor = achados[0]?.rawValue;
            if (valor) {
              parar = true;
              router.replace(`/parceiro?codigo=${encodeURIComponent(valor)}`);
              return;
            }
          } catch {
            // Quadro ruim (desfoque, pouca luz) — tenta o próximo.
          }
          requestAnimationFrame(procurar);
        };
        requestAnimationFrame(procurar);
      } catch {
        setErro(
          "Não foi possível abrir a câmera. Autorize o acesso ou digite o código.",
        );
      }
    })();

    return () => {
      parar = true;
      fluxo?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  return (
    <div className="space-y-5">
      <Link
        href="/parceiro"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-texto-2 hover:text-brand-700"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-xl font-extrabold text-texto flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-brand-600" /> Ler o cupom
        </h1>
        <p className="text-sm text-texto-2 mt-0.5">
          Aponte a câmera para o QR impresso no cupom do cliente.
        </p>
      </div>

      {suportado !== false && (
        <div className="relative rounded-2xl overflow-hidden border border-borda bg-black aspect-[3/4]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="w-2/3 aspect-square rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-xl bg-perigo/10 border border-perigo/30 px-3 py-2 text-sm font-semibold text-perigo"
        >
          {erro}
        </p>
      )}

      {suportado === false && (
        <p className="rounded-xl bg-fundo border border-borda px-3 py-2 text-sm text-texto-2">
          Este navegador não lê QR. Digite abaixo o código impresso no cupom —
          funciona igual.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) {
            router.replace(`/parceiro?codigo=${encodeURIComponent(manual.trim())}`);
          }
        }}
        className="rounded-2xl border border-borda bg-superficie p-4 space-y-3"
      >
        <Campo label="Ou digite o código do cupom">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Código impresso abaixo do QR"
            autoComplete="off"
          />
        </Campo>
        <Botao type="submit" className="w-full">
          <KeyboardIcon className="w-4 h-4" /> Usar este código
        </Botao>
      </form>
    </div>
  );
}
