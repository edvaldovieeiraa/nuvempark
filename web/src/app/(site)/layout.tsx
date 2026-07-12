import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/secoes";

/** Layout do site institucional: header + footer em todas as páginas. */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
