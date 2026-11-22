'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AlvoDTO, AlvosDTO, FaixaDTO, TesteDTO } from '@/lib/alvos'
import { formatBRL, parseBRL } from '@/lib/money'
import { AppHeader, Badge, PageTitle, useLive, useStatus } from './shell'

function Btn({
  children,
  onClick,
  primary,
  danger,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  primary?: boolean
  danger?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const tone = primary
    ? 'border-ink bg-ink text-bg'
    : danger
      ? 'border-[rgba(255,107,107,0.4)] text-bad hover:bg-[rgba(255,107,107,0.08)]'
      : 'border-control text-ink-2 hover:text-ink'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-11 rounded-[10px] border px-3.5 text-[13px] font-medium disabled:opacity-50 ${tone}`}
    >
      {children}
    </button>
  )
}

async function send(
  url: string,
  method: string,
  body?: unknown,
): Promise<string | null> {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (r.ok) return null
  return (
    ((await r.json().catch(() => null)) as { erro?: string } | null)?.erro ??
    'não deu para salvar'
  )
}

/** Lista de termos como chips: × tira, Enter ou vírgula põe. */
function Chips({
  label,
  hint,
  values,
  onChange,
  tone,
}: {
  label: string
  hint: string
  values: string[]
  onChange: (v: string[]) => void
  tone: 'term' | 'excl'
}) {
  const [text, setText] = useState('')
  const add = () => {
    const parts = text
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (parts.length)
      onChange([...values, ...parts.filter((p) => !values.includes(p))])
    setText('')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.06em] text-label">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-control bg-bg px-2 py-1.5 focus-within:border-ink-3">
        {values.map((v) => (
          <span
            key={v}
            className={`inline-flex h-7 items-center gap-1 rounded-full pl-2.5 pr-1 font-mono text-xs ${tone === 'excl' ? 'border border-dashed border-control text-ink-3' : 'bg-active text-ink'}`}
          >
            {tone === 'excl' ? `sem ${v}` : v}
            <button
              type="button"
              aria-label={`Tirar ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-control hover:text-ink"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) =>
            e.target.value.endsWith(',')
              ? (setText(e.target.value), setTimeout(add))
              : setText(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            } else if (e.key === 'Backspace' && !text && values.length)
              onChange(values.slice(0, -1))
          }}
          onBlur={add}
          placeholder={values.length ? '' : hint}
          aria-label={`Adicionar a ${label.toLowerCase()}`}
          className="h-8 min-w-[140px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-ink-3"
        />
      </div>
    </div>
  )
}

/** Mostra o que os termos pegariam nas ofertas de 7 dias, enquanto você edita. */
function Teste({
  id,
  terms,
  exclusions,
}: {
  id: number | null
  terms: string[]
  exclusions: string[]
}) {
  const [r, setR] = useState<TesteDTO | null>(null)
  const [busy, setBusy] = useState(false)
  const key = JSON.stringify([terms, exclusions])
  useEffect(() => {
    if (!terms.length) return
    let alive = true
    const t = setTimeout(async () => {
      setBusy(true)
      const res = await fetch('/api/alvos/teste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, terms, exclusions }),
      })
        .then((x) => x.json() as Promise<TesteDTO>)
        .catch(() => null)
      if (alive) {
        setR(res)
        setBusy(false)
      }
    }, 500)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, id])
  if (!terms.length)
    return (
      <p className="rounded-[10px] border border-dashed border-control px-3 py-2.5 text-[13px] text-muted">
        Ponha pelo menos um termo para ver o que o Alvo pega.
      </p>
    )
  return (
    <div
      aria-live="polite"
      className={`flex flex-col gap-2 rounded-[10px] border border-line bg-bg px-3 py-2.5 transition-opacity ${busy ? 'opacity-60' : ''}`}
    >
      <span className="text-[13px]">
        {r ? (
          <>
            Pegaria <b className="font-mono tnum">{r.pega}</b> das{' '}
            <span className="font-mono tnum">{r.total}</span> ofertas dos
            últimos 7 dias
          </>
        ) : (
          'Testando nas ofertas dos últimos 7 dias…'
        )}
      </span>
      {r && r.exemplos.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {r.exemplos.map((e) => (
            <li key={e.id} className="truncate text-xs text-ink-2">
              <a
                href={`/oferta/${e.id}`}
                className="hover:text-ink hover:underline"
              >
                {e.title}
              </a>
            </li>
          ))}
        </ul>
      )}
      {r && r.perde.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-line pt-2">
          <span className="text-xs text-pause">
            Deixaria de pegar, por exemplo:
          </span>
          {r.perde.map((p) => (
            <span key={p.title} className="truncate text-xs text-muted">
              {p.title} <span className="text-ink-3">→ {p.alvo}</span>
            </span>
          ))}
        </div>
      )}
      <span className="text-[11px] text-ink-3">
        Vale o primeiro nome de produto do título: em “Notebook com SSD 1 TB”, o
        produto é o notebook, não o SSD.
      </span>
    </div>
  )
}

const centsText = (c: number | null) =>
  c == null
    ? ''
    : (c / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

function MoneyInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
}) {
  const bad = value.trim() !== '' && parseBRL(value) == null
  return (
    <label
      className="flex items-center gap-1 rounded-[10px] border border-control bg-bg px-2.5 focus-within:border-ink-3"
      data-bad={bad || undefined}
    >
      <span className="text-xs text-ink-3">R$</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={bad}
        className={`h-10 w-full min-w-0 bg-transparent font-mono tnum text-[13px] outline-none placeholder:text-ink-3 ${bad ? 'text-bad' : ''}`}
      />
    </label>
  )
}

function FaixaRow({
  alvo,
  f,
  onSaved,
}: {
  alvo: AlvoDTO
  f: FaixaDTO
  onSaved: () => Promise<void>
}) {
  const [t, setT] = useState(centsText(f.manualTargetCents))
  const [c, setC] = useState(centsText(f.manualCeilingCents))
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const tc = t.trim() ? parseBRL(t) : null
  const cc = c.trim() ? parseBRL(c) : null
  const invalid =
    (t.trim() !== '' && tc == null) || (c.trim() !== '' && cc == null)
  const dirty = tc !== f.manualTargetCents || cc !== f.manualCeilingCents
  const save = async (target: number | null, ceiling: number | null) => {
    setSaving(true)
    const e = await send(`/api/alvos/${alvo.id}`, 'PATCH', {
      acao: 'faixa',
      bandKey: f.bandKey,
      manualTargetCents: target,
      manualCeilingCents: ceiling,
    })
    setErr(e)
    setSaving(false)
    if (!e) await onSaved()
  }
  const manual = f.manualTargetCents != null || f.manualCeilingCents != null
  return (
    <div
      role="row"
      className="grid grid-cols-[1.3fr_0.7fr_0.9fr_1.2fr_1.2fr_1fr] items-center gap-3 border-b border-line px-3 py-2 last:border-b-0"
    >
      <span role="cell" className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium">{f.label}</span>
        <span className="text-[11px] text-ink-3">
          {manual
            ? 'valendo o seu preço'
            : f.autoTargetCents != null
              ? 'calculado dos preços vistos'
              : 'sem referência ainda'}
        </span>
      </span>
      <span role="cell" className="font-mono tnum text-[13px] text-ink-2">
        {f.n}
      </span>
      <span role="cell" className="font-mono tnum text-[13px] text-ink-2">
        {formatBRL(f.medianCents)}
      </span>
      <span role="cell">
        <MoneyInput
          value={t}
          onChange={setT}
          placeholder={
            f.autoTargetCents != null
              ? centsText(f.autoTargetCents)
              : 'automático'
          }
          label={`Preço-alvo de ${f.label}`}
        />
      </span>
      <span role="cell">
        <MoneyInput
          value={c}
          onChange={setC}
          placeholder={
            f.autoCeilingCents != null
              ? centsText(f.autoCeilingCents)
              : tc != null
                ? centsText(Math.round(tc * 1.35))
                : 'automático'
          }
          label={`Teto de ${f.label}`}
        />
      </span>
      <span role="cell" className="flex flex-col items-start gap-1">
        {dirty ? (
          <Btn
            primary
            disabled={invalid || saving}
            onClick={() => void save(tc, cc)}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </Btn>
        ) : manual ? (
          <Btn
            disabled={saving}
            onClick={() => {
              setT('')
              setC('')
              void save(null, null)
            }}
          >
            Automático
          </Btn>
        ) : null}
        {err && <span className="text-[11px] text-bad">{err}</span>}
      </span>
    </div>
  )
}

function Faixas({
  alvo,
  onSaved,
}: {
  alvo: AlvoDTO
  onSaved: () => Promise<void>
}) {
  // Alvo novo ainda sem ofertas: a faixa "Geral" já aceita um preço-alvo.
  const faixas: FaixaDTO[] = alvo.faixas.length
    ? alvo.faixas
    : alvo.origin === 'usuario'
      ? [
          {
            bandKey: 'geral',
            label: 'Geral',
            n: 0,
            medianCents: null,
            autoTargetCents: null,
            autoCeilingCents: null,
            manualTargetCents: null,
            manualCeilingCents: null,
            targetCents: null,
            ceilingCents: null,
          },
        ]
      : []
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.06em] text-label">
        Preço-alvo por faixa
      </span>
      {faixas.length === 0 ? (
        <p className="text-[13px] text-muted">
          As faixas aparecem quando chegarem ofertas deste Alvo.
        </p>
      ) : (
        <div
          role="table"
          aria-label={`Faixas de ${alvo.name}`}
          className="overflow-x-auto rounded-[10px] border border-line"
        >
          <div className="min-w-[640px]">
            <div
              role="row"
              className="grid grid-cols-[1.3fr_0.7fr_0.9fr_1.2fr_1.2fr_1fr] gap-3 border-b border-line px-3 py-2 text-[11px] uppercase tracking-[0.06em] text-label"
            >
              {['Faixa', 'Preços', 'Mediana', 'Preço-alvo', 'Teto', ''].map(
                (h, i) => (
                  <span key={i} role="columnheader">
                    {h}
                  </span>
                ),
              )}
            </div>
            {faixas.map((f) => (
              <FaixaRow
                key={`${f.bandKey}:${f.manualTargetCents}:${f.manualCeilingCents}`}
                alvo={alvo}
                f={f}
                onSaved={onSaved}
              />
            ))}
          </div>
        </div>
      )}
      <span className="text-[11px] text-ink-3">
        Vazio = automático: 85% (alvo) e 115% (teto) da mediana dos preços
        vistos em 7 dias, a partir de 5 preços. “Alvo atingido” só toca com o
        preço conferido na loja.
      </span>
    </div>
  )
}

function AlvoCard({
  alvo,
  onChanged,
}: {
  alvo: AlvoDTO
  onChanged: () => Promise<void>
}) {
  const [name, setName] = useState(alvo.name)
  const [terms, setTerms] = useState(alvo.terms)
  const [excl, setExcl] = useState(alvo.exclusions)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty =
    name.trim() !== alvo.name ||
    JSON.stringify(terms) !== JSON.stringify(alvo.terms) ||
    JSON.stringify(excl) !== JSON.stringify(alvo.exclusions)

  // O que veio do servidor (outra aba, voltar ao padrão) substitui o rascunho só quando não há edição pendente.
  const serverKey = JSON.stringify([alvo.name, alvo.terms, alvo.exclusions])
  const [seenKey, setSeenKey] = useState(serverKey)
  if (seenKey !== serverKey) {
    setSeenKey(serverKey)
    if (JSON.stringify([name.trim(), terms, excl]) === seenKey) {
      setName(alvo.name)
      setTerms(alvo.terms)
      setExcl(alvo.exclusions)
    }
  }

  const run = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    const e = await send(url, method, body)
    setErr(e)
    setBusy(false)
    if (!e) await onChanged()
  }
  const reset = () => {
    setName(alvo.name)
    setTerms(alvo.terms)
    setExcl(alvo.exclusions)
    setErr(null)
  }

  return (
    <article
      aria-labelledby={`alvo-${alvo.id}`}
      className={`flex flex-col gap-4 rounded-2xl border border-card-line bg-surface p-5 ${alvo.active ? '' : 'opacity-70'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <input
            id={`alvo-${alvo.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nome do Alvo"
            maxLength={40}
            className="-mx-1.5 rounded-md bg-transparent px-1.5 text-lg font-semibold tracking-tight outline-none hover:bg-active focus:bg-active"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone={alvo.active ? 'good' : 'neutral'}>
              {alvo.active ? 'Ligado' : 'Desligado'}
            </Badge>
            <Badge tone="neutral">
              {alvo.origin === 'usuario'
                ? 'Criado por você'
                : alvo.edited
                  ? 'Do Garimpo, editado'
                  : 'Do Garimpo'}
            </Badge>
            <span className="font-mono tnum">
              {alvo.offers7d} {alvo.offers7d === 1 ? 'oferta' : 'ofertas'} em 7
              dias
            </span>
            {alvo.hits7d > 0 && (
              <Badge tone="gold">{alvo.hits7d} Alvo atingido</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            disabled={busy}
            onClick={() =>
              void run(`/api/alvos/${alvo.id}`, 'PATCH', {
                acao: alvo.active ? 'desligar' : 'ligar',
              })
            }
          >
            {alvo.active ? 'Desligar' : 'Ligar'}
          </Btn>
          {alvo.canReset && !dirty && (
            <Btn
              disabled={busy}
              onClick={() =>
                void run(`/api/alvos/${alvo.id}`, 'PATCH', { acao: 'padrao' })
              }
            >
              Voltar ao padrão
            </Btn>
          )}
          {confirmDelete ? (
            <>
              <Btn
                danger
                disabled={busy}
                onClick={() => void run(`/api/alvos/${alvo.id}`, 'DELETE')}
              >
                Apagar mesmo
              </Btn>
              <Btn onClick={() => setConfirmDelete(false)}>Cancelar</Btn>
            </>
          ) : (
            <Btn danger onClick={() => setConfirmDelete(true)}>
              Apagar
            </Btn>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Chips
            label="Termos"
            hint="ex.: cadeira gamer, cadeira de escritorio"
            values={terms}
            onChange={setTerms}
            tone="term"
          />
          <Chips
            label="Exclusões"
            hint="ex.: infantil, capa"
            values={excl}
            onChange={setExcl}
            tone="excl"
          />
          {dirty && (
            <div className="flex flex-wrap items-center gap-2">
              <Btn
                primary
                disabled={busy || !terms.length || name.trim().length < 2}
                onClick={() =>
                  void run(`/api/alvos/${alvo.id}`, 'PATCH', {
                    acao: 'editar',
                    name,
                    terms,
                    exclusions: excl,
                  })
                }
              >
                {busy ? 'Salvando…' : 'Salvar'}
              </Btn>
              <Btn onClick={reset}>Descartar</Btn>
              <span className="text-xs text-muted">
                Ao salvar, as ofertas dos últimos 7 dias são reclassificadas.
              </span>
            </div>
          )}
          {err && <span className="text-xs text-bad">{err}</span>}
        </div>
        {dirty ? (
          <Teste id={alvo.id} terms={terms} exclusions={excl} />
        ) : (
          <Faixas alvo={alvo} onSaved={onChanged} />
        )}
      </div>
    </article>
  )
}

function NovoAlvo({ onDone }: { onDone: (saved: boolean) => Promise<void> }) {
  const [name, setName] = useState('')
  const [terms, setTerms] = useState<string[]>([])
  const [excl, setExcl] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    const e = await send('/api/alvos', 'POST', {
      name,
      terms,
      exclusions: excl,
    })
    setErr(e)
    setBusy(false)
    if (!e) await onDone(true)
  }
  return (
    <article
      aria-label="Novo Alvo"
      className="flex flex-col gap-4 rounded-2xl border border-ink-3 bg-surface p-5"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-[0.06em] text-label">
          Novo Alvo
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Nome, ex.: Cadeira gamer"
          aria-label="Nome do Alvo novo"
          className="h-11 rounded-[10px] border border-control bg-bg px-3 text-[15px] outline-none placeholder:text-ink-3 focus:border-ink-3"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Chips
            label="Termos"
            hint="como o produto aparece no título; Enter para pôr"
            values={terms}
            onChange={setTerms}
            tone="term"
          />
          <Chips
            label="Exclusões"
            hint="palavras que tiram o título do Alvo"
            values={excl}
            onChange={setExcl}
            tone="excl"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              primary
              disabled={busy || !terms.length || name.trim().length < 2}
              onClick={() => void save()}
            >
              {busy ? 'Criando…' : 'Criar Alvo'}
            </Btn>
            <Btn onClick={() => void onDone(false)}>Cancelar</Btn>
          </div>
          {err && <span className="text-xs text-bad">{err}</span>}
        </div>
        <Teste id={null} terms={terms} exclusions={excl} />
      </div>
    </article>
  )
}

export function Alvos() {
  const [data, setData] = useState<AlvosDTO | null>(null)
  const [adding, setAdding] = useState(false)
  const { status, live } = useStatus()
  const load = useCallback(async () => {
    setData(
      await fetch('/api/alvos', { cache: 'no-store' }).then((r) => r.json()),
    )
  }, [])
  useLive(load)
  const list = data?.alvos ?? []
  const on = list.filter((a) => a.active).length

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="alvos" status={status} live={live} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 pb-10 pt-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageTitle title="Alvos">
            O que você quer comprar. Uma oferta entra num Alvo quando o primeiro
            nome de produto do título é um dos termos dele e nenhuma exclusão
            aparece. O Alvo dá a faixa, o preço-alvo e o “Alvo atingido”;
            ofertas fora dos Alvos continuam na Vitrine.
          </PageTitle>
          {!adding && (
            <Btn primary onClick={() => setAdding(true)}>
              Novo Alvo
            </Btn>
          )}
        </div>
        <span className="text-[13px] text-muted">
          {on} {on === 1 ? 'ligado' : 'ligados'} de {list.length} · as mudanças
          valem para as ofertas que chegarem e para as dos últimos 7 dias
        </span>
        {adding && (
          <NovoAlvo
            onDone={async (saved) => {
              setAdding(false)
              if (saved) await load()
            }}
          />
        )}
        <div className="flex flex-col gap-4">
          {list.map((a) => (
            <AlvoCard key={a.id} alvo={a} onChanged={load} />
          ))}
          {data && list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-control px-5 py-6 text-[13px] text-muted">
              Nenhum Alvo. Crie um para o Garimpo calcular preço-alvo e avisar
              quando bater.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
