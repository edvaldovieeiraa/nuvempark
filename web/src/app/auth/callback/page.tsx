import { Suspense } from "react";
import { CallbackHandler } from "@/components/auth-callback";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmando… · NuvemPark" };

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}
