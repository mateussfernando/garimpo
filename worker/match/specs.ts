// Especificações tiradas do título, sem IA, e a faixa do Alvo a que o produto pertence.
// A faixa existe para comparar só o que é comparável: um monitor 27" QHD com outros 27" QHD.
import type { OfferSpecs } from "@/lib/db/schema";
import { plain } from "./alvos";

export type Band = { key: string; label: string };

const num = (s: string) => Number(s.replace(",", "."));

export function extractSpecs(title: string): OfferSpecs {
  const raw = title.toLowerCase();
  const t = plain(title);
  const specs: OfferSpecs = {};

  // Polegadas: 27", 23.8'', 27 polegadas, 27 pol, ou "27 QHD".
  const inch =
    raw.match(/(\d{2}(?:[.,]\d)?)\s*(?:"|''|”|″|pol\b|polegadas?)/) ??
    raw.match(/\b(\d{2}(?:[.,]\d)?)\s*(?=(?:w?qhd|fhd|full\s*hd|uhd|4k|2k|ips|va\b|curvo))/);
  if (inch) {
    const v = num(inch[1]);
    if (v >= 15 && v <= 57) specs.inches = v;
  }

  if (/\b(4k|uhd|2160p)\b/.test(t)) specs.res = "4k";
  else if (/\b(w?qhd|2k|1440p|quad hd)\b/.test(t)) specs.res = "qhd";
  else if (/\b(fhd|full hd|fullhd|1080p)\b/.test(t)) specs.res = "fhd";
  else if (/\b(hd|720p)\b/.test(t)) specs.res = "hd";
  if (/\b(ultrawide|ultra wide|uwqhd|wfhd|21 9|32 9)\b/.test(t)) specs.ultrawide = true;

  const hz = t.match(/\b(\d{2,3}) ?hz\b/);
  if (hz) specs.hz = Number(hz[1]);

  // Capacidade: a maior entre os valores que parecem de armazenamento.
  const caps = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*(tb|gb)\b/g)]
    .map((m) => Math.round(num(m[1]) * (m[2] === "tb" ? 1000 : 1)))
    .filter((gb) => gb >= 120);
  if (caps.length) specs.gb = Math.max(...caps);
  if (/\b(nvme|m\.2|pcie)\b/.test(raw)) specs.nvme = true;

  if (/\b(sem fio|wireless|bluetooth|2\.4 ?g(hz)?|lightspeed|hyperspeed|dongle)\b/.test(raw)) specs.wireless = true;
  else if (/\b(com fio|cabeado|usb)\b/.test(raw)) specs.wireless = false;

  if (/\b(mecanico|mechanical|hot ?swap|hotswap|switch (red|blue|brown|linear|tatil|optico|outemu|gateron|kailh))\b/.test(t)) specs.mechanical = true;

  // Tamanho de mousepad: pelas medidas (900x400mm) ou pela palavra.
  const dims = raw.match(/(\d{2,4})\s*x\s*(\d{2,4})\s*(mm|cm)?/);
  if (dims) {
    const mul = dims[3] === "cm" || (!dims[3] && Number(dims[1]) < 150) ? 10 : 1;
    const big = Math.max(Number(dims[1]), Number(dims[2])) * mul;
    if (big >= 150 && big <= 1500) specs.size = big >= 700 ? "estendido" : big >= 400 ? "grande" : big >= 300 ? "medio" : "pequeno";
  }
  if (!specs.size) {
    if (/\b(estendido|extended|extra grande|xxl|xl|gigante|speed max)\b/.test(t)) specs.size = "estendido";
    else if (/\b(grande|large)\b/.test(t)) specs.size = "grande";
    else if (/\b(medio|medium)\b/.test(t)) specs.size = "medio";
    else if (/\b(pequeno|small|mini)\b/.test(t)) specs.size = "pequeno";
  }
  return specs;
}

const RES_LABEL = { hd: "HD", fhd: "Full HD", qhd: "QHD", "4k": "4K" } as const;

function sizeBucket(inches: number): string {
  if (inches < 23) return "22";
  if (inches < 26) return "24";
  if (inches < 29) return "27";
  if (inches < 33.5) return "32";
  return "34";
}

function capBucket(gb: number): { key: string; label: string } | null {
  if (gb <= 130) return { key: "120", label: "120 GB" };
  if (gb <= 260) return { key: "250", label: "240 a 256 GB" };
  if (gb <= 520) return { key: "500", label: "480 a 512 GB" };
  if (gb <= 1050) return { key: "1000", label: "1 TB" };
  if (gb <= 2100) return { key: "2000", label: "2 TB" };
  if (gb <= 4200) return { key: "4000", label: "4 TB" };
  return null;
}

/** Faixa do produto dentro do Alvo. null = faltou informação no título para comparar com segurança. */
export function bandOf(alvoSlug: string, specs: OfferSpecs): Band | null {
  switch (alvoSlug) {
    case "monitor": {
      if (!specs.inches || !specs.res) return null;
      const size = sizeBucket(specs.inches);
      const wide = specs.ultrawide || specs.inches >= 33.5;
      return { key: `${wide ? "uw" : size}-${specs.res}`, label: `${wide ? "Ultrawide" : `${size}"`} ${RES_LABEL[specs.res]}` };
    }
    case "ssd": {
      if (!specs.gb) return null;
      const cap = capBucket(specs.gb);
      if (!cap) return null;
      return { key: `${cap.key}-${specs.nvme ? "nvme" : "sata"}`, label: `${cap.label} ${specs.nvme ? "NVMe" : "SATA"}` };
    }
    case "mouse":
    case "headset":
      return specs.wireless ? { key: "sem-fio", label: "Sem fio" } : { key: "com-fio", label: "Com fio" };
    case "teclado": {
      const mech = !!specs.mechanical;
      const wl = !!specs.wireless;
      return {
        key: `${mech ? "mec" : "mem"}-${wl ? "sf" : "cf"}`,
        label: mech ? (wl ? "Mecânico sem fio" : "Mecânico com fio") : wl ? "Sem fio" : "Membrana com fio",
      };
    }
    case "mousepad": {
      if (!specs.size) return null;
      const label = { pequeno: "Pequeno", medio: "Médio", grande: "Grande", estendido: "Estendido" }[specs.size];
      return { key: specs.size, label };
    }
    case "webcam": {
      const res = specs.res ?? "fhd";
      return { key: res, label: RES_LABEL[res] };
    }
    default:
      return { key: "geral", label: "Geral" };
  }
}
