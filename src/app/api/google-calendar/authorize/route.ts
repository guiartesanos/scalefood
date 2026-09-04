import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getGoogleCalendarAuthUrl, gerarState } from "@/lib/googleCalendar";

// Só master conecta a conta do Calendar — é a agenda pessoal do dono do
// negócio, não algo que qualquer papel deveria poder trocar. O state
// fica num cookie curto até o callback (anti-CSRF, ver googleCalendar.ts).
export async function GET() {
  const profile = await requireProfile();
  if (profile.role !== "master") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const state = gerarState();
  const response = NextResponse.redirect(getGoogleCalendarAuthUrl(state));
  response.cookies.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
