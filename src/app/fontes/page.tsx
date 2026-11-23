import { Fontes } from "@/components/fontes";
import { Restrita } from "@/components/restrita";

export const metadata = { title: "Garimpo · Fontes" };

export default function Page() {
  return (
    <Restrita perm="fontes.gerenciar">
      <Fontes />
    </Restrita>
  );
}
