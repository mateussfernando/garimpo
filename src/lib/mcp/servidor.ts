// O MCP do Garimpo (pedido do usuário, 27/11): as ferramentas que o Claude usa para ler e mudar o básico do app.
// Um servidor por conta: cada ferramenta confere a permissão de quem usa (as mesmas do site, src/config/permissoes.ts)
// e passa pelo mesmo filtro de visão (src/lib/visao.ts). Serve ao servidor local (scripts/mcp.ts, por stdio) e à rota
// /api/mcp (pela internet, com chave de acesso).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Permissao } from "@/config/permissoes";
import { CATEGORY_SLUGS, categoryName } from "@/config/categories";
import { JANELA_MAX, JANELA_MIN } from "@/config/janela";
import { controlarIa, criarAlvo, marcarOferta, mudarAlvo, mudarJanela } from "@/lib/acoes";
import { getAcessos } from "@/lib/acessos";
import { AlvoInput, getAlvos } from "@/lib/alvos";
import { getCupons } from "@/lib/cupons";
import { getOfferDetail } from "@/lib/detail";
import { getJanelaHoras } from "@/lib/janela";
import { formatBRL, normalize } from "@/lib/money";
import { getStatus, listOffers, porNota, type OfferDTO } from "@/lib/offers";
import { getPainel } from "@/lib/painel";
import { precoDe, type PrecoPref } from "@/lib/preco";
import { pode, type Usuario } from "@/lib/sessao";
import { contextoDe, cupomVisivel, detalheVisivel, ofertaVisivel, statusVisivel } from "@/lib/visao";

const SITE = (process.env.BETTER_AUTH_URL ?? "http://localhost:3333").replace(/\/$/, "");

type Resultado = { content: { type: "text"; text: string }[]; isError?: boolean };
const ok = (dados: unknown): Resultado => ({ content: [{ type: "text", text: JSON.stringify(dados, null, 1) }] });
const erro = (msg: string): Resultado => ({ content: [{ type: "text", text: msg }], isError: true });
const semPermissao = (p: Permissao) => erro(`Sua conta não tem a permissão "${p}" no Garimpo.`);

const reais = (c: number | null | undefined) => (c == null ? null : formatBRL(c));
const Preco = z.enum(["cartao", "pix"]).optional().describe("Preço em destaque: cartão (padrão) ou Pix");

/** Uma oferta resumida para o Claude: o que o card mostra, sem o que só a tela usa. */
function resumo(o: OfferDTO, pref: PrecoPref) {
  const p = precoDe(o, pref);
  return {
    id: o.id,
    titulo: o.title,
    loja: o.store,
    preco: reais(p.cents),
    forma: p.rotulo,
    outro_preco: p.outro ? `${p.outro.rotulo} ${reais(p.outro.cents)}` : null,
    parcelas: o.installments && o.installmentCents ? `${o.installments}x de ${reais(o.installmentCents)}${o.interest ? " com juros" : ""}` : null,
    frete_gratis: o.freeShipping,
    cupom: o.coupon,
    nota: o.nota,
    categoria: categoryName(o.category),
    alvo: o.alvo?.name ?? null,
    alvo_atingido: o.alvoAtingido,
    preco_alvo: reais(o.alvo?.targetCents),
    historico: o.historico,
    conferida: o.verifyStatus,
    vigiando: o.watched,
    outras_lojas: o.lojas.length > 1 ? o.lojas.length - 1 : 0,
    entrou: o.entrouEm,
    link_loja: o.url,
    pagina: `${SITE}/oferta/${o.id}`,
  };
}

export function servidorGarimpo(eu: Usuario): McpServer {
  const server = new McpServer(
    { name: "garimpo", version: "1.0.0" },
    {
      instructions:
        "Garimpo: ofertas do Telegram e de sites de promoção, com nota de 0 a 10, Alvos (o que a pessoa quer comprar) e cupons. " +
        "Preços em reais; o preço principal é o total no cartão parcelado, salvo quando a oferta diz Pix ou só 'anunciado'. " +
        `Conta em uso: ${eu.name} (cargo ${eu.cargo.nome}). Ferramentas que mudam algo valem só para esta conta, exceto janela da Vitrine e IA, que valem para todos.`,
    },
  );
  const leitura = { readOnlyHint: true, openWorldHint: false } as const;
  const escrita = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

  // ---------------- Ler ----------------

  server.registerTool(
    "buscar_ofertas",
    {
      title: "Buscar ofertas",
      description: "Ofertas da Vitrine (a mesma janela de horas do site), com filtros. Sem filtros: as de nota mais alta.",
      inputSchema: {
        busca: z.string().max(100).optional().describe("Palavras do título (todas precisam aparecer), ex.: 'monitor 27 144hz'"),
        categoria: z.enum(CATEGORY_SLUGS).optional().describe("Slug da categoria"),
        loja: z.string().max(40).optional().describe("Parte do nome da loja, ex.: 'kabum'"),
        preco_max: z.number().positive().optional().describe("Preço máximo em reais"),
        so_alvo_atingido: z.boolean().optional().describe("Só ofertas que bateram o preço-alvo de um Alvo seu"),
        so_vigiadas: z.boolean().optional().describe("Só as que você está vigiando"),
        ordem: z.enum(["nota", "recentes", "preco"]).optional().describe("Padrão: nota"),
        limite: z.number().int().min(1).max(50).optional().describe("Padrão: 15"),
        preco: Preco,
      },
      annotations: leitura,
    },
    async (a) => {
      if (!pode(eu, "ofertas.ver")) return semPermissao("ofertas.ver");
      const pref: PrecoPref = a.preco ?? "cartao";
      const c = await contextoDe(eu);
      let lista = (await listOffers({ userId: eu.id, pref })).map((o) => ofertaVisivel(o, c));
      const palavras = a.busca ? normalize(a.busca).split(/\s+/).filter(Boolean) : [];
      const loja = a.loja ? normalize(a.loja) : null;
      lista = lista.filter((o) => {
        if (palavras.length && !palavras.every((w) => normalize(o.title).includes(w))) return false;
        if (a.categoria && o.category !== a.categoria) return false;
        if (loja && !normalize(o.store ?? "").includes(loja)) return false;
        const v = precoDe(o, pref).cents;
        if (a.preco_max && (v == null || v > a.preco_max * 100)) return false;
        if (a.so_alvo_atingido && !o.alvoAtingido) return false;
        if (a.so_vigiadas && !o.watched) return false;
        return true;
      });
      const ordem = a.ordem ?? "nota";
      lista.sort(
        ordem === "recentes"
          ? (x, y) => y.createdAt.localeCompare(x.createdAt)
          : ordem === "preco"
            ? (x, y) => (precoDe(x, pref).cents ?? Infinity) - (precoDe(y, pref).cents ?? Infinity)
            : porNota,
      );
      return ok({ janela_horas: await getJanelaHoras(), encontradas: lista.length, ofertas: lista.slice(0, a.limite ?? 15).map((o) => resumo(o, pref)) });
    },
  );

  server.registerTool(
    "ver_oferta",
    {
      title: "Ver oferta",
      description: "O detalhe de uma oferta: preço, histórico de preço do produto, outras lojas, de onde veio e a análise da IA.",
      inputSchema: { id: z.number().int().positive().describe("O id da oferta"), preco: Preco },
      annotations: leitura,
    },
    async ({ id, preco }) => {
      if (!pode(eu, "ofertas.ver")) return semPermissao("ofertas.ver");
      const pref: PrecoPref = preco ?? "cartao";
      const d = await getOfferDetail(id, eu.id, pref);
      const fora = d && (!d.offer.isActive || d.offer.productActive === false);
      if (!d || (fora && !pode(eu, "ofertas.moderar"))) return erro(`A oferta ${id} não existe ou saiu da Vitrine.`);
      const v = detalheVisivel(d, await contextoDe(eu));
      return ok({
        oferta: resumo(v.offer, pref),
        fora_da_vitrine: fora || undefined,
        historico_por_dia: v.history.slice(-30).map((h) => ({ dia: h.day, preco: reais(h.cents) })),
        referencias: {
          mediana: reais(v.stats.medianCents),
          menor_antes: reais(v.stats.minPrevCents),
          menor_antes_em: v.stats.minPrevDay,
          preco_alvo: reais(v.stats.alvoCents),
          teto: reais(v.stats.tetoCents),
          pontos: v.stats.points,
        },
        outras_lojas: v.ladder.map((l) => ({ id: l.id, loja: l.store, cartao: reais(l.priceCardCents), pix: reais(l.cashCents), frete_gratis: l.freeShipping, link: l.url })),
        postado_em: v.heat.map((h) => ({ fonte: h.source, quando: h.at })),
        analise_ia: v.insight,
      });
    },
  );

  server.registerTool(
    "listar_cupons",
    {
      title: "Listar cupons",
      description: "Cupons vistos nos últimos 3 dias, os mais recentes primeiro.",
      inputSchema: {
        loja: z.string().max(40).optional().describe("Parte do nome da loja"),
        busca: z.string().max(100).optional().describe("Palavras do título ou do código"),
        limite: z.number().int().min(1).max(50).optional().describe("Padrão: 20"),
      },
      annotations: leitura,
    },
    async (a) => {
      if (!pode(eu, "ofertas.ver")) return semPermissao("ofertas.ver");
      const c = await contextoDe(eu);
      const loja = a.loja ? normalize(a.loja) : null;
      const palavras = a.busca ? normalize(a.busca).split(/\s+/).filter(Boolean) : [];
      const lista = (await getCupons())
        .map((x) => cupomVisivel(x, c))
        .filter((x) => (!loja || normalize(x.store ?? "").includes(loja)) && palavras.every((w) => normalize(`${x.title} ${x.code ?? ""}`).includes(w)));
      return ok({
        encontrados: lista.length,
        cupons: lista.slice(0, a.limite ?? 20).map((x) => ({
          codigo: x.code,
          titulo: x.title,
          loja: x.store,
          desconto: x.discountKind === "pct" ? `${x.discountValue}%` : x.discountKind === "reais" ? reais(x.discountValue) : x.discountKind,
          minimo: reais(x.minCents),
          teto: reais(x.capCents),
          condicoes: x.conditions,
          para_o_produto: x.forProduct,
          link: x.url,
          visto_por_ultimo: x.lastSeenAt,
        })),
      });
    },
  );

  server.registerTool(
    "listar_alvos",
    {
      title: "Listar Alvos",
      description: "Os seus Alvos (o que você quer comprar): termos, exclusões, faixas com preço-alvo e quantas ofertas pegaram em 7 dias.",
      annotations: leitura,
    },
    async () => {
      if (!pode(eu, "alvos.proprios")) return semPermissao("alvos.proprios");
      const { alvos } = await getAlvos(eu.id);
      return ok(
        alvos.map((x) => ({
          id: x.id,
          nome: x.name,
          ligado: x.active,
          termos: x.terms,
          exclusoes: x.exclusions,
          ofertas_7d: x.offers7d,
          atingidos_7d: x.hits7d,
          faixas: x.faixas.map((f) => ({ faixa: f.label, mediana: reais(f.medianCents), precos: f.n, preco_alvo: reais(f.targetCents), teto: reais(f.ceilingCents) })),
        })),
      );
    },
  );

  server.registerTool(
    "status_garimpo",
    {
      title: "Status do Garimpo",
      description: "Como o app está agora: ofertas de hoje, Alvos, radar da IA e, para quem vê o sistema, fontes, fila e IA.",
      annotations: leitura,
    },
    async () => {
      if (!pode(eu, "ofertas.ver")) return semPermissao("ofertas.ver");
      return ok({ ...statusVisivel(await getStatus(eu.id), eu), janela_horas: await getJanelaHoras() });
    },
  );

  server.registerTool(
    "painel_admin",
    {
      title: "Painel do admin",
      description: "Os números do Painel: ofertas, conferência, IA, nota, contas, fontes, lojas e os acessos ao site (agora, hoje, 7 dias).",
      annotations: leitura,
    },
    async () => {
      if (!pode(eu, "sistema.ver")) return semPermissao("sistema.ver");
      const [painel, acessos] = await Promise.all([getPainel(eu), getAcessos(eu)]);
      return ok({ ...painel, acessos });
    },
  );

  // ---------------- Mudar ----------------

  server.registerTool(
    "marcar_oferta",
    {
      title: "Marcar oferta",
      description: "Vigiar, descartar (some da sua Vitrine) ou adiar (soneca) uma oferta. Vale só para a sua conta.",
      inputSchema: {
        id: z.number().int().positive(),
        vigiar: z.boolean().optional(),
        descartar: z.boolean().optional(),
        soneca_minutos: z.number().int().min(0).max(24 * 60).optional().describe("0 tira a soneca"),
      },
      annotations: { ...escrita, idempotentHint: true },
    },
    async (a) => {
      if (!pode(eu, "ofertas.ver")) return semPermissao("ofertas.ver");
      if (a.vigiar === undefined && a.descartar === undefined && a.soneca_minutos === undefined) return erro("Diga o que marcar: vigiar, descartar ou soneca_minutos.");
      const feito = await marcarOferta(eu.id, a.id, { watched: a.vigiar, dismissed: a.descartar, snoozeMinutes: a.soneca_minutos });
      return feito ? ok({ ok: true }) : erro(`A oferta ${a.id} não existe.`);
    },
  );

  server.registerTool(
    "criar_alvo",
    {
      title: "Criar Alvo",
      description: "Cria um Alvo na sua conta. Termos: palavras que a oferta precisa ter (qualquer uma); exclusões: palavras que tiram a oferta.",
      inputSchema: {
        nome: z.string().describe("De 2 a 40 letras, ex.: 'Monitor 27'"),
        termos: z.array(z.string()).describe("Ex.: ['monitor 27', '27 polegadas']"),
        exclusoes: z.array(z.string()).optional().describe("Ex.: ['suporte', 'capa']"),
      },
      annotations: escrita,
    },
    async (a) => {
      if (!pode(eu, "alvos.proprios")) return semPermissao("alvos.proprios");
      const p = AlvoInput.safeParse({ name: a.nome, terms: a.termos, exclusions: a.exclusoes ?? [] });
      if (!p.success) return erro(p.error.issues[0]?.message ?? "Alvo inválido.");
      return ok({ ok: true, id: await criarAlvo(eu.id, p.data), aviso: "O worker classifica as ofertas dos últimos 7 dias no Alvo novo em alguns segundos." });
    },
  );

  server.registerTool(
    "editar_alvo",
    {
      title: "Editar Alvo",
      description: "Muda nome, termos e exclusões de um Alvo seu, ou liga e desliga. Para editar, mande nome, termos e exclusões completos.",
      inputSchema: {
        id: z.number().int().positive(),
        acao: z.enum(["editar", "ligar", "desligar"]),
        nome: z.string().optional(),
        termos: z.array(z.string()).optional(),
        exclusoes: z.array(z.string()).optional(),
      },
      annotations: escrita,
    },
    async (a) => {
      if (!pode(eu, "alvos.proprios")) return semPermissao("alvos.proprios");
      let feito: boolean;
      if (a.acao === "editar") {
        const p = AlvoInput.safeParse({ name: a.nome, terms: a.termos, exclusions: a.exclusoes ?? [] });
        if (!p.success) return erro(p.error.issues[0]?.message ?? "Mande nome e termos.");
        feito = await mudarAlvo(eu.id, a.id, { acao: "editar", dados: p.data });
      } else {
        feito = await mudarAlvo(eu.id, a.id, { acao: a.acao });
      }
      return feito ? ok({ ok: true }) : erro(`O Alvo ${a.id} não é seu ou não existe.`);
    },
  );

  server.registerTool(
    "janela_vitrine",
    {
      title: "Janela da Vitrine",
      description: `De quantas horas para trás a Vitrine mostra ofertas, para todos (de ${JANELA_MIN} a ${JANELA_MAX}). Sem horas: só mostra a atual.`,
      inputSchema: { horas: z.number().int().min(JANELA_MIN).max(JANELA_MAX).optional() },
      annotations: { ...escrita, idempotentHint: true },
    },
    async ({ horas }) => {
      if (!pode(eu, "ofertas.moderar")) return semPermissao("ofertas.moderar");
      if (horas !== undefined) await mudarJanela(horas);
      return ok({ janela_horas: await getJanelaHoras() });
    },
  );

  server.registerTool(
    "controlar_ia",
    {
      title: "Controlar a IA",
      description: "Pausar, continuar ou pedir uma rodada da IA do Garimpo agora (o worker faz; o MCP só avisa).",
      inputSchema: { acao: z.enum(["pausar", "continuar", "rodar"]) },
      annotations: escrita,
    },
    async ({ acao }) => {
      if (!pode(eu, "ia.gerenciar")) return semPermissao("ia.gerenciar");
      await controlarIa(acao);
      return ok({ ok: true, acao });
    },
  );

  return server;
}
