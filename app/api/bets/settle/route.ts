import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulatedBets, simBankroll, matches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const USER_ID = "apuesta";

/**
 * POST /api/bets/settle
 * Body: { matchId: number }
 *
 * Revisa todas las apuestas "pending" de ese partido y las liquida
 * comparando el mercado apostado contra el resultado real. Esto se
 * llama automáticamente desde PATCH /api/matches cuando un partido
 * pasa a "finished".
 */
export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json();
    if (!matchId) {
      return NextResponse.json({ error: "Falta matchId" }, { status: 400 });
    }

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match || match.homeScore == null || match.awayScore == null) {
      return NextResponse.json({ error: "Partido sin resultado aún." }, { status: 400 });
    }

    const pendingBets = await db
      .select()
      .from(simulatedBets)
      .where(and(eq(simulatedBets.matchId, matchId), eq(simulatedBets.outcome, "pending")));

    let totalPaid = 0;
    const settled: { betId: number; outcome: string; paid: number }[] = [];

    for (const bet of pendingBets) {
      const won = evaluateMarket(bet.market, match.homeScore, match.awayScore);
      const paid = won ? Number(bet.potentialReturn) : 0;
      totalPaid += paid;

      await db
        .update(simulatedBets)
        .set({ outcome: won ? "won" : "lost", settledAt: new Date() })
        .where(eq(simulatedBets.id, bet.id));

      settled.push({ betId: bet.id, outcome: won ? "won" : "lost", paid });
    }

    if (totalPaid > 0) {
      const [bankroll] = await db
        .select()
        .from(simBankroll)
        .where(eq(simBankroll.userId, USER_ID))
        .limit(1);
      const currentBalance = Number(bankroll?.balance ?? 0);
      await db
        .update(simBankroll)
        .set({ balance: (currentBalance + totalPaid).toString(), updatedAt: new Date() })
        .where(eq(simBankroll.userId, USER_ID));
    }

    return NextResponse.json({ ok: true, settled, totalPaid });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

/**
 * Evalúa si un texto de mercado (ej "Over 2.5 Goles", "Brasil (Local)",
 * "Brasil -1.5 (Asiático)") se cumplió dado el resultado final.
 * Es deliberadamente simple/basado en texto porque los mercados se
 * generan como strings legibles en vez de códigos estructurados —
 * si se necesita más precisión a futuro, conviene migrar `market` a
 * un objeto { type, selection, line } en vez de string libre.
 */
function evaluateMarket(market: string, homeScore: number, awayScore: number): boolean {
  const m = market.toLowerCase();
  const totalGoals = homeScore + awayScore;

  if (m.includes("over 2.5")) return totalGoals > 2.5;
  if (m.includes("under 2.5")) return totalGoals < 2.5;
  if (m.includes("over 1.5")) return totalGoals > 1.5;
  if (m.includes("under 1.5")) return totalGoals < 1.5;
  if (m.includes("over 3.5")) return totalGoals > 3.5;
  if (m.includes("ambos anotan")) return homeScore > 0 && awayScore > 0;
  if (m.includes("empate")) return homeScore === awayScore;

  // Hándicaps con número, ej "Brasil -1.5 (Asiático)" o "Brasil +1 (Asiático)"
  const hcapMatch = m.match(/([+-]\d+(\.\d+)?)/);
  if (hcapMatch && (m.includes("local") || m.includes("(") || m.includes("hcap") || m.includes("asiático") || m.includes("asiatico") || m.includes("europeo"))) {
    const line = parseFloat(hcapMatch[1]);
    // Asumimos que el hándicap se aplica al equipo mencionado primero en el string.
    // Esto es una heurística razonable dado que generamos los strings nosotros mismos.
    const adjustedHome = homeScore + line;
    return adjustedHome > awayScore;
  }

  // "Local" / "Visita" como Moneyline directo
  if (m.includes("local")) return homeScore > awayScore;
  if (m.includes("visita")) return awayScore > homeScore;

  // Doble chance
  if (m.includes("doble chance") || m.includes("dc")) {
    if (m.includes("1x")) return homeScore >= awayScore;
    if (m.includes("x2")) return awayScore >= homeScore;
  }

  return false;
}
