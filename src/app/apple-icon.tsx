import { ImageResponse } from "next/og";

// Ícone de quem salva o Garimpo na tela inicial do celular: a marca (src/components/logo.tsx) clara sobre o fundo escuro.
// O iPhone arredonda os cantos sozinho, então o fundo vai até a borda.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #1c2026, #0b0c0e)" }}>
        <svg width="116" height="116" viewBox="0 0 32 32">
          <path d="M4 8 10.5 13 15.5 10 23 21" fill="none" stroke="#ecedee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24.5" cy="23" r="5" fill="#f5b83d" />
          <circle cx="23" cy="21.5" r="1.6" fill="#ffd77a" />
        </svg>
      </div>
    ),
    size,
  );
}
