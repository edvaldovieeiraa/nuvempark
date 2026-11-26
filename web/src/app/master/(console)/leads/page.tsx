import { redirect } from "next/navigation";

/** "Leads do site" virou o CRM (req. 21). O endereço antigo continua valendo. */
export default function LeadsPage() {
  redirect("/master/crm");
}
