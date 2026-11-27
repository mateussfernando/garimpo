import { ImageResponse } from "next/og";

// Prévia do link (WhatsApp, LinkedIn, Telegram...): gerada em código, sem arquivo de imagem no projeto (decisão de 12/11).
// 1200x630 é o tamanho que todos aceitam; o WhatsApp pede imagem leve, então só cores lisas e texto.
export const alt = "Garimpo: as melhores ofertas da Black Friday, com nota de 0 a 10";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORIAS = ["Notebooks", "Celulares", "TV e vídeo", "Informática", "Cupons"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(160deg, #1c2026 0%, #0b0c0e 70%)",
          color: "#ecedee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <svg width="76" height="76" viewBox="0 0 32 32">
              <path d="M4 8 10.5 13 15.5 10 23 21" fill="none" stroke="#ecedee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24.5" cy="23" r="5" fill="#f5b83d" />
              <circle cx="23" cy="21.5" r="1.6" fill="#ffd77a" />
            </svg>
            <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: -1 }}>Garimpo</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28, color: "#9aa0a6", border: "2px solid #2a2f36", borderRadius: 999, padding: "10px 24px" }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: "#3ddc84" }} />
            Black Friday ao vivo
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1000 }}>
            As melhores ofertas da Black Friday, num lugar só
          </div>
          <div style={{ fontSize: 32, color: "#b4b9be", lineHeight: 1.3, maxWidth: 1000 }}>
            Cada oferta com nota de 0 a 10 pelo histórico de preço, conferida na loja.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {CATEGORIAS.map((c) => (
            <div key={c} style={{ display: "flex", fontSize: 28, padding: "12px 24px", borderRadius: 12, background: "#1a1e23", border: "2px solid #2a2f36", color: "#ecedee" }}>
              {c}
            </div>
          ))}
          <div style={{ display: "flex", fontSize: 28, padding: "12px 24px", borderRadius: 12, background: "#f5b83d", color: "#1a1306", fontWeight: 700 }}>
            Nota 10,0
          </div>
        </div>
      </div>
    ),
    size,
  );
}
