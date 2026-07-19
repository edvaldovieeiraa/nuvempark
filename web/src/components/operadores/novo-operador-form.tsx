"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Loader2 } from "lucide-react";
import { criarOperador, type Resultado } from "@/app/painel/operadores/actions";
import { useToast } from "@/components/ui/toast";

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};

const INPUT: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#FAFBFC",
  fontSize: 13,
  color: "#1F2937",
  padding: "0 13px",
  outline: "none",
};

/** Formulário da página /painel/operadores/novo — redireciona ao salvar. */
export function NovoOperadorForm({ patioId }: { patioId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarOperador,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Operador criado!", estado.msg);
      router.push(`/painel/operadores?patio=${patioId}`);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router, patioId]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      style={{
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
        padding: 22,
      }}
    >
      <form action={agir}>
        <input type="hidden" name="patio_id" value={patioId} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <div style={LABEL}>Nome completo</div>
            <input name="nome" required placeholder="João da Silva" style={INPUT} />
          </div>
          <div>
            <div style={LABEL}>Usuário (login no app)</div>
            <input
              name="usuario"
              required
              placeholder="JOAO"
              className="mono"
              style={{ ...INPUT, textTransform: "uppercase", letterSpacing: ".06em" }}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div style={LABEL}>Senha (mín. 6 caracteres)</div>
            <input
              name="senha"
              type="password"
              required
              minLength={6}
              style={INPUT}
            />
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pendente}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              padding: "0 18px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(90deg,#16A34A,#22C55E)",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
              opacity: pendente ? 0.6 : 1,
            }}
          >
            {pendente ? (
              <Loader2 className="w-[15px] h-[15px] animate-spin" />
            ) : (
              <Users className="w-[15px] h-[15px]" />
            )}
            Criar operador
          </button>
          <button
            type="button"
            onClick={() => router.push(`/painel/operadores?patio=${patioId}`)}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 11,
              border: "1px solid #E4E8EC",
              background: "#fff",
              fontSize: 13,
              fontWeight: 700,
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "#8695A0",
          lineHeight: 1.6,
        }}
      >
        O operador entra no app com o{" "}
        <b style={{ color: "#6B7280" }}>código da sua rede</b> + esse usuário e
        senha. Ele fica vinculado a este pátio automaticamente.
      </p>
    </motion.section>
  );
}
