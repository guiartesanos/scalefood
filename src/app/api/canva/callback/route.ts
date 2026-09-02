import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { trocarCodigoPorTokenCanva } from "@/lib/canva";

export async function GET(request: NextRequest) {
  const profile = await requireProfile();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (profile.role !== "master") {
    return NextResponse.redirect(`${base}/marketing?canva=sem-permissao`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const erro = request.nextUrl.searchParams.get("error");
  const verifier = request.cookies.get("canva_pkce_verifier")?.value;

  if (erro || !code || !verifier) {
    return NextResponse.redirect(`${base}/marketing?canva=erro`);
  }

  try {
    await trocarCodigoPorTokenCanva(code, verifier);
    const response = NextResponse.redirect(`${base}/marketing?canva=conectado`);
    response.cookies.delete("canva_pkce_verifier");
    return response;
  } catch {
    return NextResponse.redirect(`${base}/marketing?canva=erro`);
  }
}
