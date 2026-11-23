import { Alvos } from "@/components/alvos";
import { Restrita } from "@/components/restrita";

export const metadata = { title: "Garimpo · Alvos" };

export default function Page() {
  return (
    <Restrita perm="alvos.proprios">
      <Alvos />
    </Restrita>
  );
}
