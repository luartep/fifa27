import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulatedBets, simBankroll } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { potentialReturn } from "@/lib/valueEngine";

export const dynamic = "force-dynamic";

const USER_ID = "apuesta"; // único usuario fijo del sistema

async function getOrCreateBankroll() {
  const [existing] = await db
    .select()
    .from(simBankroll)
    .where(eq(simBankroll.userId, USER_ID))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(simBankroll)
    .values({ userId: USER_ID })
    .returning();
  return created;
}

export async function GET() {
  const bankroll = await getOrCreateBankroll();
  const bets = await db
    .select()
    .from(simulatedBets)
    .where(eq(simulatedBets.userId, USER_ID))
    .orderBy(desc(simulatedBets.placedAt));

  const summary = {
    balance: Number(bankroll.balance),
    totalStaked: bets.reduce((sum, b) => sum + Number(b.stake), 0),
    pending: bets.filter((b) => b.outcome === "pending").length,
    won: bets.filter((b) => b.outcome === "won").length,
    lost: bets.filter((b) => b.outcome === "lost").length,
  };

  return NextResponse.json({ bankroll, bets, summary });
}

/**
 * POST /api/bets
 * Body: { matchId, market, oddsTaken, stake }
 *
 * Coloca una apuesta SIMULADA: descuenta de la banca virtual al momento,
 * y queda "pending" hasta que el partido se resuelva (ver /api/bets/settle
 * o el flujo automático cuando PATCH /api/matches marca un resultado).
 */
export async function POST(req: NextRequest) {
  try {
    const { matchId, market, oddsTaken, stake } = await req.json();

    if (!matchId || !market || !oddsTaken || !stake || stake <= 0) {
      return NextResponse.json({ error: "Datos de apuesta incompletos." }, { status: 400 });
    }

    const bankroll = await getOrCreateBankroll();
    const currentBalance = Number(bankroll.balance);

    if (stake > currentBalance) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Banca simulada actual: $${currentBalance.toLocaleString("es-CL")}` },
        { status: 400 }
      );
    }

    const ret = potentialReturn(stake, oddsTaken);

    const [bet] = await db
      .insert(simulatedBets)
      .values({
        userId: USER_ID,
        matchId,
        market,
        oddsTaken: oddsTaken.toString(),
        stake: stake.toString(),
        potentialReturn: ret.toString(),
      })
      .returning();

    await db
      .update(simBankroll)
      .set({ balance: (currentBalance - stake).toString(), updatedAt: new Date() })
      .where(eq(simBankroll.userId, USER_ID));

    return NextResponse.json({ ok: true, bet, newBalance: currentBalance - stake });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
