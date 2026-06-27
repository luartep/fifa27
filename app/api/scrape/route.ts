import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches, oddsHistory } from "@/db/schema";
import { scrapeMatchOdds } from "@/lib/scraper";
import { calculateEdge, impliedProbability } from "@/lib/valueEngine";
import { recalculateLearningStats } from "@/lib/learningEngine";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // el scraping de varios partidos puede tardar; default de Vercel es 10-15s

/**
 * GET /api/scrape
 *
 * Pensado para ser llamado por un Cron Job de Vercel (vercel.json) cada
 * pocos minutos. Hace 3 cosas, cada una aislada para que un fallo en una
 * no tumbe las otras:
 *   1. Para cada partido NO finalizado con una oddscheckerUrl conocida,
 *      scrapea cuotas nuevas y guarda un snapshot en odds_history.
 *   2. Actualiza el resultado/estado del partido si ya se jugó
 *      (esto requiere una fuente de resultados — ver nota abajo).
 *   3. Si algún partido pasó a "finished" en esta corrida, recalcula
 *      las estadísticas del motor de aprendizaje.
 *
 * NOTA sobre resultados en vivo: Oddschecker no es la mejor fuente para
 * marcadores en vivo (es una casa de comparación de cuotas, no un live-score).
 * Este endpoint deja un TODO marcado donde se debería conectar una fuente
 * de resultados (ej. scraping de un marcador en vivo, o una API gratuita
 * de resultados). Mientras tanto, los resultados se pueden actualizar
 * manualmente vía /api/matches (PATCH) si hace falta.
 */

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results: {
    matchId: number;
    externalId: string;
    status: "ok" | "skipped" | "error";
    detail?: string;
  }[] = [];

  // Solo scrapeamos partidos no finalizados que tengan URL de Oddschecker configurada.
  const pendingMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "scheduled"));

  for (const match of pendingMatches) {
    const oddscheckerUrl = match.oddscheckerUrl ?? undefined;
    if (!oddscheckerUrl) {
      results.push({
        matchId: match.id,
        externalId: match.externalId,
        status: "skipped",
        detail: "Sin URL de Oddschecker configurada",
      });
      continue;
    }

    try {
      const scraped = await scrapeMatchOdds(oddscheckerUrl);
      if (!scraped) {
        results.push({
          matchId: match.id,
          externalId: match.externalId,
          status: "error",
          detail: "Scraper devolvió null (página no disponible o estructura cambió)",
        });
        continue;
      }

      // Guardamos snapshot histórico siempre que obtuvimos algo.
      await db.insert(oddsHistory).values({
        matchId: match.id,
        oddsHome: scraped.oddsHome?.toString(),
        oddsDraw: scraped.oddsDraw?.toString(),
        oddsAway: scraped.oddsAway?.toString(),
        oddsOver25: scraped.oddsOver25?.toString(),
        oddsUnder25: scraped.oddsUnder25?.toString(),
        source: "oddschecker",
      });

      // Recalculamos edge/valor con nuestras probabilidades ya guardadas
      // (estas se generan/ajustan aparte, vía el modelo propio).
      const ourProbHome = Number(match.ourProbHome ?? 0);
      const ourProbOver25 = Number(match.ourProbOver25 ?? 0);

      let bestMarket = match.bestMarket;
      let bestMarketOdds = match.bestMarketOdds;
      let edgePct = match.edgePct;
      let valueType = match.valueType;

      if (scraped.oddsHome && ourProbHome > 0) {
        const homeEdge = calculateEdge(ourProbHome, scraped.oddsHome);
        if (!edgePct || homeEdge.edgePct > Number(edgePct)) {
          bestMarket = `${match.homeTeam} (Local)`;
          bestMarketOdds = scraped.oddsHome.toString();
          edgePct = homeEdge.edgePct.toString();
          valueType = homeEdge.valueType;
        }
      }
      if (scraped.oddsOver25 && ourProbOver25 > 0) {
        const overEdge = calculateEdge(ourProbOver25, scraped.oddsOver25);
        if (!edgePct || overEdge.edgePct > Number(edgePct)) {
          bestMarket = "Over 2.5 Goles";
          bestMarketOdds = scraped.oddsOver25.toString();
          edgePct = overEdge.edgePct.toString();
          valueType = overEdge.valueType;
        }
      }

      await db
        .update(matches)
        .set({
          oddsHome: scraped.oddsHome?.toString(),
          oddsDraw: scraped.oddsDraw?.toString(),
          oddsAway: scraped.oddsAway?.toString(),
          oddsOver25: scraped.oddsOver25?.toString(),
          oddsUnder25: scraped.oddsUnder25?.toString(),
          handicapMarkets: scraped.handicapMarkets,
          bestMarket,
          bestMarketOdds,
          edgePct,
          valueType,
          lastScrapedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(matches.id, match.id));

      results.push({ matchId: match.id, externalId: match.externalId, status: "ok" });
    } catch (err) {
      results.push({
        matchId: match.id,
        externalId: match.externalId,
        status: "error",
        detail: err instanceof Error ? err.message : "Error desconocido",
      });
    }

    // Pequeño delay entre requests para no golpear Oddschecker de forma agresiva.
    await new Promise((r) => setTimeout(r, 800));
  }

  // Si hubo partidos marcados manualmente como finished desde la última corrida,
  // esto recalcula el aprendizaje (es barato, así que lo hacemos siempre).
  await recalculateLearningStats();

  const durationMs = Date.now() - startedAt;
  return NextResponse.json({
    ok: true,
    durationMs,
    matchesProcessed: results.length,
    results,
  });
}
