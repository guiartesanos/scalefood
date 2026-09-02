import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getGoogleDriveAuthUrl } from "@/lib/googleDrive";

// Só master conecta a conta do Drive — é a conta pessoal do dono do
// negócio, não algo que qualquer papel deveria poder trocar.
export async function GET() {
  const profile = await requireProfile();
  if (profile.role !== "master") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  return NextResponse.redirect(getGoogleDriveAuthUrl());
}
