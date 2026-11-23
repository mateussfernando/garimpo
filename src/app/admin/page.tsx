import { PainelAdmin } from "@/components/painel-admin";
import { Restrita } from "@/components/restrita";

export const metadata = { title: "Garimpo · Painel" };

export default function Page() {
  return (
    <Restrita perm="sistema.ver">
      <PainelAdmin />
    </Restrita>
  );
}
