import { FilaIa } from "@/components/fila-ia";
import { Restrita } from "@/components/restrita";

export const metadata = { title: "Garimpo · Fila da IA" };

export default function Page() {
  return (
    <Restrita perm="ia.gerenciar">
      <FilaIa />
    </Restrita>
  );
}
