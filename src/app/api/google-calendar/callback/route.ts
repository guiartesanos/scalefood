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
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get("google_calendar_oauth_state")?.value;

  // state precisa bater com o que a gente mesmo gerou no /authorize —
  // sem isso, um code obtido pelo próprio atacante (numa conta Google
  // dele) podia ser trocado só levando o master a abrir esse link.
  if (erro || !code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${base}/consultoria?calendar=erro`);
  }

  try {
    await trocarCodigoPorToken(code);
    const response = NextResponse.redirect(`${base}/consultoria?calendar=conectado`);
    response.cookies.delete("google_calendar_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(`${base}/consultoria?calendar=erro`);
  }
}
