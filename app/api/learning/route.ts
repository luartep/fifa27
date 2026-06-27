import { NextResponse } from "next/server";
import { getLearningSummary } from "@/lib/learningEngine";

// Esta ruta consulta la base de datos en cada request; nunca debe
// pre-renderizarse como estática durante `next build`.
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getLearningSummary();
  return NextResponse.json({ learning: summary });
}
