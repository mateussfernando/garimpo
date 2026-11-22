// Permissões que o código conhece. Um cargo é só um conjunto delas (tabelas cargos e cargo_permissoes).
// Permissão nova: entra aqui e numa migração (INSERT em permissoes). O cargo "admin" tem todas, sempre.

export const PERMISSOES = {
  "ofertas.ver": "Ver a Vitrine, o Detalhe das ofertas e os Cupons",
  "ia.analises.ver": "Ver as análises da IA (veredito, nota, resumo e radar)",
  "alvos.proprios": "Criar e editar os próprios Alvos",
  "ofertas.detalhes_internos": "Ver os nomes dos grupos, o link do post e o motivo técnico da conferência",
  "ia.gerenciar": "Fila da IA, custo e uso da assinatura, Pausar, Chamar IA e escolher Claude ou agy",
  "fontes.gerenciar": "Tela Fontes: grupos, convites, sugestões e fontes configuráveis",
  "lojas.gerenciar": "Tela Lojas: saúde das lojas e pausar a conferência",
  "cupons.moderar": "Esconder um cupom para todos",
  "sistema.ver": "Saúde das fontes, máquina e fila de conferência no cabeçalho",
  "usuarios.gerenciar": "Usuários e cargos",
} as const;

export type Permissao = keyof typeof PERMISSOES;

/** O que o cargo "usuário" (o de quem se cadastra) recebe na criação. Depois, quem manda é a tela de cargos. */
export const PERMISSOES_DO_USUARIO: Permissao[] = ["ofertas.ver", "ia.analises.ver", "alvos.proprios"];

export const ehPermissao = (s: string): s is Permissao => s in PERMISSOES;
