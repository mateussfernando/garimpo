'use client'

import Link from 'next/link'
import type { StoreQuoteDTO } from '@/lib/offers'
import { Badge, ago, brl } from './shell'

/** Lojas diferentes no grupo (a "loja não identificada" não conta). */
export const storeCount = (lojas: StoreQuoteDTO[]) =>
  new Set(lojas.map((l) => l.store).filter(Boolean)).size

/** Total pago de verdade: no cartão + frete (quando a loja cobra e sabemos quanto). */
const totalOf = (l: StoreQuoteDTO) =>
  l.priceCardCents == null
    ? null
    : l.priceCardCents + (l.freeShipping ? 0 : (l.shippingCents ?? 0))

function condition(l: StoreQuoteDTO): string {
  const parts: string[] = []
  if (l.installments && l.installmentCents)
    parts.push(
      l.installments === 1
        ? '1x'
        : `${l.installments}x de ${brl(l.installmentCents)}${l.interest ? ' com juros' : l.interest === false ? ' sem juros' : ''}`,
    )
  if (l.cashCents && l.priceCardCents && l.cashCents < l.priceCardCents)
    parts.push(`Pix ${brl(l.cashCents)}`)
  parts.push(
    l.freeShipping
      ? 'frete grátis'
      : l.shippingCents
        ? `frete ${brl(l.shippingCents)}`
        : 'frete a ver',
  )
  if (l.coupon) parts.push(`cupom ${l.coupon}`)
  return parts.join(' · ')
}

/**
 * O mesmo produto em lojas diferentes, da mais barata para a mais cara (esgotada por último).
 * A mais barata ganha o selo; as outras mostram quanto custam a mais. `currentId` marca a oferta aberta.
 */
export function CompararLojas({
  lojas,
  currentId,
  now,
  compact,
}: {
  lojas: StoreQuoteDTO[]
  currentId: number
  now: number | null
  compact?: boolean
}) {
  const priced = lojas.filter(
    (l) => l.available !== false && totalOf(l) != null,
  )
  const cheapest = priced.length
    ? Math.min(...priced.map((l) => totalOf(l)!))
    : null
  const shown = compact ? lojas.slice(0, 6) : lojas

  return (
    <ol className="flex flex-col gap-2">
      {shown.map((l) => {
        const total = totalOf(l)
        const diff =
          total != null && cheapest != null && l.available !== false
            ? total - cheapest
            : null
        const best = diff === 0
        const here = l.id === currentId
        return (
          <li
            key={l.id}
            className={`flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 ${best ? 'border-good-dot/50 bg-good-dot/5' : 'border-card-line'} ${l.available === false ? 'opacity-55' : ''}`}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="truncate text-[14px] font-semibold text-ink">
                  {l.store ?? 'Loja não identificada'}
                </span>
                {best && <Badge tone="good">Mais barato</Badge>}
                {here && <Badge tone="neutral">Esta oferta</Badge>}
                {l.available === false && <Badge tone="bad">Esgotado</Badge>}
                {l.interest === true && <Badge tone="bad">Com juros</Badge>}
              </span>
              <span
                className="truncate font-mono text-[12px] text-ink-3"
                title={condition(l)}
              >
                {condition(l)}
              </span>
              {!compact && (
                <span
                  className="truncate text-[11.5px] text-label"
                  title={l.title}
                >
                  {l.verifyStatus === 'verificado'
                    ? `conferido na loja ${ago(l.verifiedAt, now)}`
                    : l.verifyStatus === 'pendente'
                      ? 'conferindo na loja…'
                      : 'preço do post, não conferido'}{' '}
                  · {l.sources.slice(0, 2).join(', ')}
                  {l.sources.length > 2 ? ` +${l.sources.length - 2}` : ''}
                </span>
              )}
            </span>
            <span className="flex flex-none flex-col items-end gap-0.5">
              <span className="font-mono tnum text-[16px] font-semibold text-num">
                {brl(l.priceCardCents)}
              </span>
              <span
                className={`font-mono tnum text-[11.5px] ${best ? 'text-good' : 'text-muted'}`}
              >
                {diff == null
                  ? l.verifyStatus === 'verificado'
                    ? ''
                    : 'não conferido'
                  : best
                    ? priced.length > 1
                      ? 'menor total'
                      : ''
                    : `+ ${brl(diff)}`}
              </span>
            </span>
            <span className="flex flex-none flex-col gap-1.5">
              {l.url ? (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-9 items-center justify-center rounded-[10px] px-3.5 text-[13px] font-semibold ${best ? 'bg-ink text-bg' : 'border border-control text-ink-2 hover:text-ink'}`}
                >
                  Comprar
                </a>
              ) : (
                <span className="flex h-9 items-center rounded-[10px] border border-control px-3 text-xs text-muted">
                  sem link
                </span>
              )}
              {!here && !compact && (
                <Link
                  href={`/oferta/${l.id}`}
                  className="text-center text-[11px] text-label hover:text-ink-2"
                >
                  detalhe
                </Link>
              )}
            </span>
          </li>
        )
      })}
      {compact && lojas.length > shown.length && (
        <li className="px-1 text-xs text-label">
          e mais {lojas.length - shown.length} lojas na página completa
        </li>
      )}
    </ol>
  )
}

/** Uma frase sobre a diferença entre a loja mais barata e a mais cara. */
export function spreadText(lojas: StoreQuoteDTO[]): string | null {
  const totals = lojas
    .filter((l) => l.available !== false && l.store)
    .map(totalOf)
    .filter((x): x is number => x != null)
  if (totals.length < 2) return null
  const lo = Math.min(...totals)
  const hi = Math.max(...totals)
  if (hi === lo) return 'Mesmo preço em todas.'
  return `Economia de ${brl(hi - lo)} (${Math.round(((hi - lo) / hi) * 100)}%) escolhendo a mais barata.`
}
