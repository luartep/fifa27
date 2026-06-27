import * as cheerio from "cheerio";

/**
 * Scraper de Oddschecker.
 *
 * IMPORTANTE — naturaleza frágil del scraping:
 * Oddschecker cambia su HTML/clases con cierta frecuencia y puede servir
 * contenido vía JS del lado cliente en algunas vistas. Este scraper:
 *   1. Intenta varios selectores conocidos (con fallback) en lugar de uno solo.
 *   2. Nunca lanza una excepción que tumbe todo el cron — cada partido
 *      que falla se reporta y se sigue con el resto.
 *   3. Devuelve null en vez de inventar datos cuando no logra parsear.
 *
 * Si Oddschecker cambia su estructura y esto deja de funcionar,
 * revisar `parseMatchOdds` y ajustar los selectores — el resto del
 * pipeline (DB, UI) no necesita cambios.
 */

export type ScrapedOdds = {
  oddsHome: number | null;
  oddsDraw: number | null;
  oddsAway: number | null;
  oddsOver25: number | null;
  oddsUnder25: number | null;
  handicapMarkets: { market: string; odds: number }[];
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Convierte cuotas fraccionales tipo "6/4" a formato decimal. */
function fractionalToDecimal(frac: string): number | null {
  const match = frac.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const den = parseInt(match[2], 10);
  if (!den) return null;
  return Math.round((num / den + 1) * 100) / 100;
}

/** Acepta tanto "6/4" como "2.40" como "+150" / "-150" (americano). */
function parseAnyOddsFormat(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  if (/^[+-]\d+$/.test(text)) {
    const american = parseInt(text, 10);
    if (american > 0) return Math.round((american / 100 + 1) * 100) / 100;
    return Math.round((100 / Math.abs(american) + 1) * 100) / 100;
  }

  if (text.includes("/")) {
    return fractionalToDecimal(text);
  }

  const decimal = parseFloat(text);
  return Number.isFinite(decimal) ? decimal : null;
}

/**
 * Busca la cuota "mejor" (la más alta entre casas) para una fila de mercado,
 * que es justamente lo que Oddschecker está diseñado para mostrar:
 * compara casas de apuestas y resalta la mejor cuota de cada selección.
 */
function bestOddsInRow($row: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): number | null {
  const candidates: number[] = [];
  $row.find("[data-odds], .odds, .bc, td.bc").each((_, el) => {
    const raw =
      $(el).attr("data-odds") ?? $(el).attr("data-o") ?? $(el).text();
    const parsed = parseAnyOddsFormat(raw || "");
    if (parsed) candidates.push(parsed);
  });
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

export async function fetchOddscheckerPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      // Oddschecker es lento en SSR; damos margen pero no infinito.
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[scraper] Oddschecker respondió ${res.status} para ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[scraper] Falló fetch de ${url}:`, err);
    return null;
  }
}

/**
 * Parsea la página de un partido (1X2 + Over/Under 2.5 + algunos hándicaps)
 * a partir del HTML crudo. Selectores con fallback porque Oddschecker
 * reordena/renombra clases con cierta frecuencia.
 */
export function parseMatchOdds(html: string): ScrapedOdds {
  const $ = cheerio.load(html);
  const result: ScrapedOdds = {
    oddsHome: null,
    oddsDraw: null,
    oddsAway: null,
    oddsOver25: null,
    oddsUnder25: null,
    handicapMarkets: [],
  };

  // Tabla de resultado del partido (1X2): Oddschecker normalmente la marca
  // con data-bk o filas .diff-row dentro de un contenedor "match-on-coupon".
  const rows = $("tr.diff-row, tr[data-bname], .eventTable tr").toArray();

  // Heurística: la primera fila suele ser "Home", segunda "Draw", tercera "Away"
  // cuando el mercado es 1X2. Si no calza, no forzamos nada.
  if (rows.length >= 3) {
    const home = bestOddsInRow($(rows[0]), $);
    const draw = bestOddsInRow($(rows[1]), $);
    const away = bestOddsInRow($(rows[2]), $);
    result.oddsHome = home;
    result.oddsDraw = draw;
    result.oddsAway = away;
  }

  // Mercado Over/Under 2.5 — buscamos filas cuyo nombre de selección lo mencione.
  $("tr").each((_, el) => {
    const label = $(el).find("td, th").first().text().toLowerCase();
    if (label.includes("over 2.5")) {
      const odds = bestOddsInRow($(el), $);
      if (odds) result.oddsOver25 = odds;
    }
    if (label.includes("under 2.5")) {
      const odds = bestOddsInRow($(el), $);
      if (odds) result.oddsUnder25 = odds;
    }
    // Hándicaps asiáticos/europeos: filas con un signo +/- seguido de número.
    const hcapMatch = label.match(/([a-záéíóúñ\s]+)\s*([+-]\d+(\.\d+)?)/i);
    if (hcapMatch) {
      const odds = bestOddsInRow($(el), $);
      if (odds) {
        result.handicapMarkets.push({
          market: label.trim(),
          odds,
        });
      }
    }
  });

  return result;
}

/**
 * Punto de entrada para un partido: dada una URL de Oddschecker,
 * devuelve las cuotas parseadas o null si algo falló (nunca lanza).
 */
export async function scrapeMatchOdds(
  oddscheckerUrl: string
): Promise<ScrapedOdds | null> {
  const html = await fetchOddscheckerPage(oddscheckerUrl);
  if (!html) return null;
  try {
    return parseMatchOdds(html);
  } catch (err) {
    console.warn(`[scraper] Falló el parseo de ${oddscheckerUrl}:`, err);
    return null;
  }
}
