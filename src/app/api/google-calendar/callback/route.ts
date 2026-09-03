import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { trocarCodigoPorToken } from "@/lib/googleCalendar";

export async function GET(request: NextRequest) {
  const profile = await requireProfile();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (profile.role !== "master") {
    return NextResponse.redirect(`${base}/consultoria?calendar=sem-permissao`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const erro = request.nextUrl.searchParams.get("error");
  if (erro || !code) {
    return NextResponse.redirect(`${base}/consultoria?calendar=erro`);
  }

  try {
    await trocarCodigoPorToken(code);
    return NextResponse.redirect(`${base}/consultoria?calendar=conectado`);
  } catch {
    return NextResponse.redirect(`${base}/consultoria?calendar=erro`);
  }
}
