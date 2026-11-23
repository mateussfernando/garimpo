// Tema do site: claro, escuro ou o do sistema (padrão). A escolha fica só no navegador (localStorage "garimpo:tema").
// O script abaixo roda no <head> antes de a página pintar (src/app/layout.tsx), para não piscar o tema errado.

export type Tema = "sistema" | "claro" | "escuro";
export const CHAVE_TEMA = "garimpo:tema";
export const ehTema = (v: unknown): v is Tema => v === "sistema" || v === "claro" || v === "escuro";

/** O tema que vale de fato: "sistema" vira claro ou escuro pelo que o aparelho prefere. */
export const temaEfetivo = (t: Tema, sistemaEscuro: boolean): "claro" | "escuro" => (t === "sistema" ? (sistemaEscuro ? "escuro" : "claro") : t);

export const SCRIPT_TEMA = `(function(){var d=document.documentElement;try{var v=localStorage.getItem("${CHAVE_TEMA}");var e=v==="escuro"||(v!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=e?"dark":"light";d.style.colorScheme=e?"dark":"light"}catch(x){var s=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;d.dataset.theme=s?"dark":"light"}})()`;
