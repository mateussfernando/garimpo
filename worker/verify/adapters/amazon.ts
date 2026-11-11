// Amazon Brasil: o preço vem no texto da caixa de compra. Conferido em 10/11/2026 com uma página real:
// "R$599,99 ... 4% off à vista no Pix ... ou em até 10x de R$ 62,59/mês ... Em estoque" e "priceAmount":625.90.
import { parseBRL } from "@/lib/money";
import { decodeEntities, stripTags } from "../../http/html";
import type { Adapter } from "./types";

export const amazon: Adapter = (html) => {
  const text = stripTags(html).replace(/\s+/g, " ");
  const title = html.match(/id="productTitle"[^>]*>\s*([^<]+)/)?.[1];
  const priceAmount = html.match(/"priceAmount":\s*([\d.]+)/)?.[1];
  const full = priceAmount ? Math.round(Number(priceAmount) * 100) : null;

  // Pix: "R$599,99 (R$ 599 , 99) 4% off à vista no Pix".
  const pixM = text.match(/R\$ ?([\d.]+,\d{2})(?: R\$ ?[\d.]+ ?, ?\d{2})? (?:\d{1,2}% off )?à vista no Pix/i);
  const cashCents = pixM ? parseBRL(pixM[1]) : null;

  // Parcelas: procura depois do Pix quando ele existe, para não pegar a parcela de outro produto da página.
  const from = pixM?.index ?? 0;
  const instM = text.slice(from).match(/(\d{1,2})x de R\$ ?([\d.]+,\d{2})/i);
  const installments = instM ? Number(instM[1]) : null;
  const installmentCents = instM ? parseBRL(instM[2]) : null;

  let cardCents = full;
  let interest: boolean | null = null;
  if (installments && installmentCents) {
    const total = installments * installmentCents;
    if (full != null && Math.abs(full - total) <= installments) interest = false; // as parcelas somam o preço cheio
    else if (full == null) cardCents = total;
    const after = text.slice(from + (instM!.index ?? 0), from + (instM!.index ?? 0) + 90);
    if (interest == null) interest = /sem juros/i.test(after) ? false : /com juros/i.test(after) ? true : null;
  }
  if (cardCents == null) return null;

  const listM = text.match(/De: ?R\$ ?([\d.]+,\d{2})/);
  const listCents = listM ? parseBRL(listM[1]) : null;

  const avail = html.match(/id="availability"[^>]*>\s*(?:<[^>]+>\s*)*([^<]+)/)?.[1]?.trim() ?? "";
  const available = /em estoque|dispon[ií]vel para envio/i.test(avail) ? true : /indispon[ií]vel|não dispon[ií]vel/i.test(avail) ? false : null;

  // "Entrega GRÁTIS ... no seu primeiro pedido" é condicional: só conta quando não há condição logo depois.
  const freeM = text.match(/Entrega GRÁTIS[^.]{0,90}/i)?.[0] ?? "";
  const freeShipping = freeM && !/primeiro pedido|prime|acima de/i.test(freeM) ? true : null;

  const image = html.match(/id="landingImage"[^>]*src="([^"]+)"/)?.[1] ?? html.match(/"hiRes":"([^"]+)"/)?.[1] ?? null;

  return {
    title: title ? decodeEntities(title).trim() : null,
    imageUrl: image,
    cardCents,
    installments,
    installmentCents,
    interest,
    cashCents: cashCents && cashCents < cardCents ? cashCents : null,
    listCents: listCents && listCents > cardCents ? listCents : null,
    freeShipping,
    available,
    coupon: null,
    extra: {},
  };
};
