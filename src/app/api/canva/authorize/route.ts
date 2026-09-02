import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getCanvaAuthUrl, gerarPkce } from "@/lib/canva";

// Só master conecta o Canva — grava a conta pessoal usada pra gerar
// os designs. PKCE: o "verifier" fica num cookie curto até o callback.
export async function GET() {
  const profile = await requireProfile();
  if (profile.role !== "master") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { verifier, challenge } = gerarPkce();
  const response = NextResponse.redirect(getCanvaAuthUrl(challenge));
  response.cookies.set("canva_pkce_verifier", verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
