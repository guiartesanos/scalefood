import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getGoogleDriveAuthUrl, gerarState } from "@/lib/googleDrive";

// Só master conecta a conta do Drive — é a conta pessoal do dono do
// negócio, não algo que qualquer papel deveria poder trocar. O state
// fica num cookie curto até o callback (anti-CSRF, ver googleDrive.ts).
export async function GET() {
  const profile = await requireProfile();
  if (profile.role !== "master") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const state = gerarState();
  const response = NextResponse.redirect(getGoogleDriveAuthUrl(state));
  response.cookies.set("google_drive_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
