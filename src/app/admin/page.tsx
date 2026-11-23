import { Admin } from "@/components/admin";
import { Restrita } from "@/components/restrita";

export const metadata = { title: "Garimpo · Usuários e cargos" };

export default function Page() {
  return (
    <Restrita perm="usuarios.gerenciar">
      <Admin />
    </Restrita>
  );
}
