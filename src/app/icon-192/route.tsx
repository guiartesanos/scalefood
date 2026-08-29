import { ImageResponse } from "next/og";


export async function GET() {
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
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#F1EAD9",
            letterSpacing: 2,
          }}
        >
          FS
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
