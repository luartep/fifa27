import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recalculateLearningStats } from "@/lib/learningEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  const allMatches = await db.select().from(matches).orderBy(matches.kickoffUtc);
  return NextResponse.json({ matches: allMatches });
}

/**
 * PATCH /api/matches
 * Body: { externalId: string, homeScore: number, awayScore: number, status?: "finished" }
 *
 * El scraper de cuotas no trae marcadores confiables (Oddschecker es un
 * comparador de cuotas, no un live-score). Mientras no se conecte una
 * fuente de resultados en vivo, este endpoint permite actualizar el
 * resultado de un partido a mano y dispara el recálculo del aprendizaje.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { externalId, homeScore, awayScore, status } = body;

    if (!externalId || homeScore == null || awayScore == null) {
      return NextResponse.json(
        { error: "Faltan campos: externalId, homeScore, awayScore" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(matches)
      .set({
        homeScore,
        awayScore,
        status: status ?? "finished",
        updatedAt: new Date(),
      })
      .where(eq(matches.externalId, externalId))
      .returning();

    const learning = await recalculateLearningStats();

    // Liquidar apuestas simuladas pendientes de este partido, si quedó finalizado.
    let settleResult = null;
    if ((status ?? "finished") === "finished" && updated[0]) {
      const settleRes = await fetch(
        `${req.nextUrl.origin}/api/bets/settle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: updated[0].id }),
        }
      );
      settleResult = await settleRes.json();
    }

    return NextResponse.json({ ok: true, learning, settleResult });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
