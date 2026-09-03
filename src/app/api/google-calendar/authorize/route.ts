import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getGoogleCalendarAuthUrl } from "@/lib/googleCalendar";

// Só master conecta a conta do Calendar — é a agenda pessoal do dono do
// negócio, não algo que qualquer papel deveria poder trocar.
export async function GET() {
  const profile = await requireProfile();
  if (profile.role !== "master") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  return NextResponse.redirect(getGoogleCalendarAuthUrl());
}
