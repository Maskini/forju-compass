import { NextResponse } from "next/server";

// Unreviewed HTTP inserts must never silently become authoritative knowledge.
// Use the versioned catalog and the idempotent local importer instead.
export async function POST() {
  return NextResponse.json({ error: "Wissensimporte erfolgen über den geprüften Katalog und das lokale Importwerkzeug." }, { status: 405 });
}
