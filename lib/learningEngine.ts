import { db } from "@/lib/db";
import { matches, learningStats } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Tipos de mercado que rastreamos para el aprendizaje.
 * Cada uno tiene una función "hit" que, dado el partido finalizado,
 * determina si la predicción de ESE mercado se cumplió.
 */
const MARKET_DEFINITIONS: {
  key: string;
  label: string;
  hit: (m: typeof matches.$inferSelect) => boolean | null; // null = no aplica a este partido
}[] = [
  {
    key: "1x2_fav",
    label: "1X2 Favorito",
    hit: (m) => {
      if (m.homeScore == null || m.awayScore == null) return null;
      const probs = [
        { side: "home", p: Number(m.ourProbHome ?? 0) },
        { side: "draw", p: Number(m.ourProbDraw ?? 0) },
        { side: "away", p: Number(m.ourProbAway ?? 0) },
      ];
      const favorite = probs.reduce((a, b) => (b.p > a.p ? b : a));
      if (favorite.side === "home") return m.homeScore > m.awayScore;
      if (favorite.side === "away") return m.awayScore > m.homeScore;
      return m.homeScore === m.awayScore;
    },
  },
  {
    key: "over25",
    label: "Over 2.5 Goles",
    hit: (m) => {
      if (m.homeScore == null || m.awayScore == null) return null;
      if (Number(m.ourProbOver25 ?? 0) < 50) return null; // solo evaluamos cuando lo "recomendamos"
      return m.homeScore + m.awayScore > 2.5;
    },
  },
  {
    key: "under25",
    label: "Under 2.5 Goles",
    hit: (m) => {
      if (m.homeScore == null || m.awayScore == null) return null;
      if (Number(m.ourProbUnder25 ?? 0) < 50) return null;
      return m.homeScore + m.awayScore < 2.5;
    },
  },
  {
    key: "btts",
    label: "Ambos Anotan",
    hit: (m) => {
      if (m.homeScore == null || m.awayScore == null) return null;
      return m.homeScore > 0 && m.awayScore > 0;
    },
  },
];

/**
 * Recalcula TODAS las estadísticas de aprendizaje desde cero, recorriendo
 * los partidos finalizados. Se llama tras cada actualización de resultados
 * en el cron de scraping. Es idempotente: correrlo varias veces da el mismo resultado.
 */
export async function recalculateLearningStats() {
  const finishedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "finished"));

  const tally: Record<string, { hits: number; total: number; label: string }> = {};
  for (const def of MARKET_DEFINITIONS) {
    tally[def.key] = { hits: 0, total: 0, label: def.label };
  }

  for (const match of finishedMatches) {
    for (const def of MARKET_DEFINITIONS) {
      const outcome = def.hit(match);
      if (outcome === null) continue;
      tally[def.key].total++;
      if (outcome) tally[def.key].hits++;
    }
  }

  for (const [key, stats] of Object.entries(tally)) {
    await db
      .insert(learningStats)
      .values({
        marketKey: key,
        label: stats.label,
        hits: stats.hits,
        total: stats.total,
      })
      .onConflictDoUpdate({
        target: learningStats.marketKey,
        set: {
          hits: stats.hits,
          total: stats.total,
          updatedAt: new Date(),
        },
      });
  }

  return tally;
}

export type LearningSummary = {
  marketKey: string;
  label: string;
  hits: number;
  total: number;
  accuracyPct: number;
  recommendation: "priorizar" | "neutral" | "reducir";
}[];

export async function getLearningSummary(): Promise<LearningSummary> {
  const rows = await db.select().from(learningStats);
  return rows
    .filter((r) => r.total > 0)
    .map((r) => {
      const accuracyPct = Math.round((r.hits / r.total) * 100);
      const recommendation =
        accuracyPct >= 65 ? "priorizar" : accuracyPct >= 45 ? "neutral" : "reducir";
      return {
        marketKey: r.marketKey,
        label: r.label,
        hits: r.hits,
        total: r.total,
        accuracyPct,
        recommendation,
      };
    });
}

/**
 * Da un multiplicador de confianza (0.5 a 1.3) para un mercado dado,
 * basado en su track record histórico. Se usa para ajustar qué tan fuerte
 * recomendamos un mercado en partidos futuros similares.
 */
export async function getMarketConfidenceMultiplier(marketKey: string): Promise<number> {
  const [row] = await db
    .select()
    .from(learningStats)
    .where(eq(learningStats.marketKey, marketKey))
    .limit(1);

  if (!row || row.total < 3) return 1.0; // sin suficiente historial, neutral

  const accuracy = row.hits / row.total;
  if (accuracy >= 0.65) return 1.3;
  if (accuracy >= 0.45) return 1.0;
  return 0.5;
}
