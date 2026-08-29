import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignora o manifest.json pra "adicionar à tela de início" — só olha
// esse arquivo (apple-touch-icon). Sem ele o ícone salvo vira um
// screenshot da página.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1E1B14",
          color: "#F1EAD9",
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        FS
      </div>
    ),
    { ...size }
  );
}
