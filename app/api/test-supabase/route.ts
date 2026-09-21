import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Dieser Diagnose-Endpunkt ist deaktiviert." }, { status: 404 });
}
