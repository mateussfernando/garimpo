import { Lojas } from "@/components/lojas";
import { Restrita } from "@/components/restrita";

export const metadata = { title: "Garimpo · Lojas" };

export default function Page() {
  return (
    <Restrita perm="lojas.gerenciar">
      <Lojas />
    </Restrita>
  );
}
