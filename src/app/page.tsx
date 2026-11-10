import { Vitrine } from "@/components/vitrine";

// A casca é estática; os dados vêm ao vivo no cliente (/api/offers + /api/stream).
export default function Page() {
  return <Vitrine />;
}
