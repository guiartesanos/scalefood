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
            fontSize: 96,
            fontWeight: 700,
            color: "#F1EAD9",
            letterSpacing: 6,
          }}
        >
          FS
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
