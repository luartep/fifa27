import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/setup?key=<CRON_SECRET>
 *
 * Endpoint de USO ÚNICO para crear las tablas y cargar el calendario
 * completo del Mundial 2026, pensado para visitarse directamente desde
 * el navegador (sin terminal). Reutiliza CRON_SECRET como clave de
 * protección para no agregar un secreto más a configurar.
 *
 * Es seguro volver a visitarlo más de una vez: usa `CREATE TABLE IF NOT
 * EXISTS` y `ON CONFLICT DO UPDATE`, así que no duplica nada.
 *
 * Una vez confirmado que funcionó, este archivo se puede borrar del
 * proyecto (o dejar, ya que requiere el secreto para ejecutarse).
 */

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const key = req.nextUrl.searchParams.get("key");
  return key === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "No autorizado. Visita /api/setup?key=TU_CRON_SECRET" },
      { status: 401 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Falta DATABASE_URL" }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);
  const log: string[] = [];

  try {
    // ── 1. Crear tablas ──
    log.push("Creando tablas...");

    await sql.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(120) NOT NULL UNIQUE,
        group_name VARCHAR(40) NOT NULL,
        home_team VARCHAR(80) NOT NULL,
        away_team VARCHAR(80) NOT NULL,
        home_flag VARCHAR(10),
        away_flag VARCHAR(10),
        venue VARCHAR(160),
        oddschecker_url VARCHAR(500),
        kickoff_utc TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        home_score INTEGER,
        away_score INTEGER,
        odds_home NUMERIC(8,3),
        odds_draw NUMERIC(8,3),
        odds_away NUMERIC(8,3),
        odds_over25 NUMERIC(8,3),
        odds_under25 NUMERIC(8,3),
        handicap_markets JSONB DEFAULT '[]',
        news_items JSONB DEFAULT '[]',
        our_prob_home NUMERIC(5,2),
        our_prob_draw NUMERIC(5,2),
        our_prob_away NUMERIC(5,2),
        our_prob_over25 NUMERIC(5,2),
        our_prob_under25 NUMERIC(5,2),
        best_market VARCHAR(120),
        best_market_odds NUMERIC(8,3),
        edge_pct NUMERIC(6,2),
        value_type VARCHAR(20),
        last_scraped_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    log.push("✓ Tabla matches");

    await sql.query(`
      CREATE TABLE IF NOT EXISTS odds_history (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL,
        odds_home NUMERIC(8,3),
        odds_draw NUMERIC(8,3),
        odds_away NUMERIC(8,3),
        odds_over25 NUMERIC(8,3),
        odds_under25 NUMERIC(8,3),
        source VARCHAR(40) DEFAULT 'oddschecker',
        scraped_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    log.push("✓ Tabla odds_history");

    await sql.query(`
      CREATE TABLE IF NOT EXISTS simulated_bets (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(40) NOT NULL DEFAULT 'apuesta',
        match_id INTEGER NOT NULL,
        market VARCHAR(120) NOT NULL,
        odds_taken NUMERIC(8,3) NOT NULL,
        stake NUMERIC(12,2) NOT NULL,
        potential_return NUMERIC(12,2) NOT NULL,
        outcome VARCHAR(10) NOT NULL DEFAULT 'pending',
        settled_at TIMESTAMPTZ,
        placed_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    log.push("✓ Tabla simulated_bets");

    await sql.query(`
      CREATE TABLE IF NOT EXISTS learning_stats (
        id SERIAL PRIMARY KEY,
        market_key VARCHAR(40) NOT NULL UNIQUE,
        label VARCHAR(80) NOT NULL,
        hits INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    log.push("✓ Tabla learning_stats");

    await sql.query(`
      CREATE TABLE IF NOT EXISTS sim_bankroll (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(40) NOT NULL UNIQUE DEFAULT 'apuesta',
        balance NUMERIC(14,2) NOT NULL DEFAULT 100000,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    log.push("✓ Tabla sim_bankroll");

    // ── 2. Cargar calendario completo ──
    log.push("Cargando calendario de partidos...");
    const inserted = await loadSchedule(sql);
    log.push(`✓ ${inserted} partidos insertados/actualizados`);

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error desconocido",
        log,
      },
      { status: 500 }
    );
  }
}

type SeedMatch = {
  externalId: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  venue: string;
  kickoffUtc: string;
  oddscheckerUrl?: string;
  status?: "scheduled" | "finished";
  homeScore?: number;
  awayScore?: number;
};

async function loadSchedule(sql: ReturnType<typeof neon>): Promise<number> {
  const ALL: SeedMatch[] = SCHEDULE_DATA;
  let count = 0;

  for (const m of ALL) {
    await sql.query(
      `
      INSERT INTO matches (external_id, group_name, home_team, away_team, home_flag, away_flag, venue, oddschecker_url, kickoff_utc, status, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (external_id) DO UPDATE SET
        kickoff_utc = EXCLUDED.kickoff_utc,
        venue = EXCLUDED.venue,
        status = EXCLUDED.status,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        updated_at = now();
      `,
      [
        m.externalId,
        m.group,
        m.homeTeam,
        m.awayTeam,
        m.homeFlag,
        m.awayFlag,
        m.venue,
        m.oddscheckerUrl ?? null,
        m.kickoffUtc,
        m.status ?? "scheduled",
        m.homeScore ?? null,
        m.awayScore ?? null,
      ]
    );
    count++;
  }

  return count;
}

// ── Calendario completo: fase de grupos + bracket eliminatorio hasta la final ──
// (mismo contenido que db/seed.ts, duplicado aquí porque este endpoint
// usa el driver SQL crudo en vez de Drizzle, para evitar depender del
// esquema de Drizzle en este script de un solo uso).
const SCHEDULE_DATA: SeedMatch[] = [
  { externalId: "g-mexico-sudafrica", group: "Grupo A", homeTeam: "México", awayTeam: "Sudáfrica", homeFlag: "🇲🇽", awayFlag: "🇿🇦", venue: "Estadio Azteca, Ciudad de México", kickoffUtc: "2026-06-11T20:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-corea-chequia", group: "Grupo A", homeTeam: "Corea del Sur", awayTeam: "Chequia", homeFlag: "🇰🇷", awayFlag: "🇨🇿", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-12T02:00:00Z", status: "finished", homeScore: 1, awayScore: 2 },
  { externalId: "g-canada-bosnia", group: "Grupo B", homeTeam: "Canadá", awayTeam: "Bosnia y Herz.", homeFlag: "🇨🇦", awayFlag: "🇧🇦", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-12T19:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-eeuu-paraguay", group: "Grupo D", homeTeam: "EE.UU.", awayTeam: "Paraguay", homeFlag: "🇺🇸", awayFlag: "🇵🇾", venue: "SoFi Stadium, Los Ángeles", kickoffUtc: "2026-06-13T01:00:00Z", status: "finished", homeScore: 4, awayScore: 1 },
  { externalId: "g-qatar-suiza", group: "Grupo B", homeTeam: "Qatar", awayTeam: "Suiza", homeFlag: "🇶🇦", awayFlag: "🇨🇭", venue: "Levi's Stadium, San Francisco", kickoffUtc: "2026-06-13T16:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-brasil-marruecos", group: "Grupo C", homeTeam: "Brasil", awayTeam: "Marruecos", homeFlag: "🇧🇷", awayFlag: "🇲🇦", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-13T19:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-escocia-haiti", group: "Grupo C", homeTeam: "Escocia", awayTeam: "Haití", homeFlag: "🏴", awayFlag: "🇭🇹", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-14T01:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-australia-turquia", group: "Grupo D", homeTeam: "Australia", awayTeam: "Turquía", homeFlag: "🇦🇺", awayFlag: "🇹🇷", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-14T04:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-alemania-curazao", group: "Grupo E", homeTeam: "Alemania", awayTeam: "Curazao", homeFlag: "🇩🇪", awayFlag: "🇨🇼", venue: "Estadio Houston", kickoffUtc: "2026-06-14T16:00:00Z", status: "finished", homeScore: 7, awayScore: 1 },
  { externalId: "g-holanda-japon", group: "Grupo F", homeTeam: "Países Bajos", awayTeam: "Japón", homeFlag: "🇳🇱", awayFlag: "🇯🇵", venue: "AT&T Stadium, Dallas", kickoffUtc: "2026-06-14T19:00:00Z", status: "finished", homeScore: 2, awayScore: 2 },
  { externalId: "g-suecia-tunez", group: "Grupo F", homeTeam: "Suecia", awayTeam: "Túnez", homeFlag: "🇸🇪", awayFlag: "🇹🇳", venue: "Estadio Monterrey", kickoffUtc: "2026-06-14T22:00:00Z", status: "finished", homeScore: 5, awayScore: 1 },
  { externalId: "g-civ-ecuador", group: "Grupo E", homeTeam: "Costa de Marfil", awayTeam: "Ecuador", homeFlag: "🇨🇮", awayFlag: "🇪🇨", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-15T01:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-espana-caboverde", group: "Grupo H", homeTeam: "España", awayTeam: "Cabo Verde", homeFlag: "🇪🇸", awayFlag: "🇨🇻", venue: "Estadio Atlanta", kickoffUtc: "2026-06-15T16:00:00Z", status: "finished", homeScore: 0, awayScore: 0 },
  { externalId: "g-belgica-egipto", group: "Grupo G", homeTeam: "Bélgica", awayTeam: "Egipto", homeFlag: "🇧🇪", awayFlag: "🇪🇬", venue: "SoFi Stadium, Los Ángeles", kickoffUtc: "2026-06-15T19:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-arabia-uruguay", group: "Grupo H", homeTeam: "Arabia Saudita", awayTeam: "Uruguay", homeFlag: "🇸🇦", awayFlag: "🇺🇾", venue: "Hard Rock Stadium, Miami", kickoffUtc: "2026-06-15T22:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-iran-nz", group: "Grupo G", homeTeam: "Irán", awayTeam: "Nueva Zelanda", homeFlag: "🇮🇷", awayFlag: "🇳🇿", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-16T01:00:00Z", status: "finished", homeScore: 2, awayScore: 2 },
  { externalId: "g-francia-senegal", group: "Grupo I", homeTeam: "Francia", awayTeam: "Senegal", homeFlag: "🇫🇷", awayFlag: "🇸🇳", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-16T19:00:00Z", status: "finished", homeScore: 3, awayScore: 1 },
  { externalId: "g-iraq-noruega", group: "Grupo I", homeTeam: "Iraq", awayTeam: "Noruega", homeFlag: "🇮🇶", awayFlag: "🇳🇴", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-16T22:00:00Z", status: "finished", homeScore: 1, awayScore: 4 },
  { externalId: "g-argentina-argelia", group: "Grupo J", homeTeam: "Argentina", awayTeam: "Argelia", homeFlag: "🇦🇷", awayFlag: "🇩🇿", venue: "Arrowhead Stadium, Kansas City", kickoffUtc: "2026-06-17T02:00:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-austria-jordania", group: "Grupo J", homeTeam: "Austria", awayTeam: "Jordania", homeFlag: "🇦🇹", awayFlag: "🇯🇴", venue: "Levi's Stadium, San Francisco", kickoffUtc: "2026-06-17T05:00:00Z", status: "finished", homeScore: 3, awayScore: 1 },
  { externalId: "g-portugal-congo", group: "Grupo K", homeTeam: "Portugal", awayTeam: "Congo DR", homeFlag: "🇵🇹", awayFlag: "🇨🇩", venue: "Estadio Houston", kickoffUtc: "2026-06-17T17:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-inglaterra-croacia", group: "Grupo L", homeTeam: "Inglaterra", awayTeam: "Croacia", homeFlag: "🏴", awayFlag: "🇭🇷", venue: "AT&T Stadium, Arlington", kickoffUtc: "2026-06-17T21:00:00Z", status: "finished", homeScore: 4, awayScore: 2 },
  { externalId: "g-ghana-panama", group: "Grupo L", homeTeam: "Ghana", awayTeam: "Panamá", homeFlag: "🇬🇭", awayFlag: "🇵🇦", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-18T00:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-uzbekistan-colombia", group: "Grupo K", homeTeam: "Uzbekistán", awayTeam: "Colombia", homeFlag: "🇺🇿", awayFlag: "🇨🇴", venue: "Estadio Ciudad de México", kickoffUtc: "2026-06-18T05:00:00Z", status: "finished", homeScore: 1, awayScore: 3 },
  { externalId: "g-sudafrica-chequia", group: "Grupo A", homeTeam: "Sudáfrica", awayTeam: "Chequia", homeFlag: "🇿🇦", awayFlag: "🇨🇿", venue: "Estadio Atlanta", kickoffUtc: "2026-06-18T17:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-suiza-bosnia", group: "Grupo B", homeTeam: "Suiza", awayTeam: "Bosnia y Herz.", homeFlag: "🇨🇭", awayFlag: "🇧🇦", venue: "SoFi Stadium, Los Ángeles", kickoffUtc: "2026-06-18T20:00:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-canada-qatar", group: "Grupo B", homeTeam: "Canadá", awayTeam: "Qatar", homeFlag: "🇨🇦", awayFlag: "🇶🇦", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-18T20:00:00Z", status: "finished", homeScore: 6, awayScore: 0 },
  { externalId: "g-mexico-corea", group: "Grupo A", homeTeam: "México", awayTeam: "Corea del Sur", homeFlag: "🇲🇽", awayFlag: "🇰🇷", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-19T02:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-eeuu-australia", group: "Grupo D", homeTeam: "EE.UU.", awayTeam: "Australia", homeFlag: "🇺🇸", awayFlag: "🇦🇺", venue: "Lumen Field, Seattle", kickoffUtc: "2026-06-19T19:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-escocia-marruecos", group: "Grupo C", homeTeam: "Escocia", awayTeam: "Marruecos", homeFlag: "🏴", awayFlag: "🇲🇦", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-19T19:00:00Z", status: "finished", homeScore: 0, awayScore: 1 },
  { externalId: "g-brasil-haiti", group: "Grupo C", homeTeam: "Brasil", awayTeam: "Haití", homeFlag: "🇧🇷", awayFlag: "🇭🇹", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-19T21:30:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-turquia-paraguay", group: "Grupo D", homeTeam: "Turquía", awayTeam: "Paraguay", homeFlag: "🇹🇷", awayFlag: "🇵🇾", venue: "Levi's Stadium, San Francisco", kickoffUtc: "2026-06-20T01:00:00Z", status: "finished", homeScore: 0, awayScore: 1 },
  { externalId: "g-holanda-suecia", group: "Grupo F", homeTeam: "Países Bajos", awayTeam: "Suecia", homeFlag: "🇳🇱", awayFlag: "🇸🇪", venue: "Estadio Houston", kickoffUtc: "2026-06-20T17:00:00Z", status: "finished", homeScore: 5, awayScore: 1 },
  { externalId: "g-alemania-civ", group: "Grupo E", homeTeam: "Alemania", awayTeam: "Costa de Marfil", homeFlag: "🇩🇪", awayFlag: "🇨🇮", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-20T20:00:00Z", status: "finished", homeScore: 2, awayScore: 1 },
  { externalId: "g-ecuador-curazao", group: "Grupo E", homeTeam: "Ecuador", awayTeam: "Curazao", homeFlag: "🇪🇨", awayFlag: "🇨🇼", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-21T00:00:00Z", status: "finished", homeScore: 0, awayScore: 0 },
  { externalId: "g-tunez-japon", group: "Grupo F", homeTeam: "Túnez", awayTeam: "Japón", homeFlag: "🇹🇳", awayFlag: "🇯🇵", venue: "Estadio Monterrey", kickoffUtc: "2026-06-21T04:00:00Z", status: "finished", homeScore: 0, awayScore: 4 },
  { externalId: "g-espana-arabia", group: "Grupo H", homeTeam: "España", awayTeam: "Arabia Saudita", homeFlag: "🇪🇸", awayFlag: "🇸🇦", venue: "Mercedes-Benz Stadium, Atlanta", kickoffUtc: "2026-06-21T16:00:00Z", status: "finished", homeScore: 4, awayScore: 0 },
  { externalId: "g-belgica-iran", group: "Grupo G", homeTeam: "Bélgica", awayTeam: "Irán", homeFlag: "🇧🇪", awayFlag: "🇮🇷", venue: "SoFi Stadium, Inglewood", kickoffUtc: "2026-06-21T19:00:00Z", status: "finished", homeScore: 0, awayScore: 0 },
  { externalId: "g-uruguay-caboverde", group: "Grupo H", homeTeam: "Uruguay", awayTeam: "Cabo Verde", homeFlag: "🇺🇾", awayFlag: "🇨🇻", venue: "Hard Rock Stadium, Miami", kickoffUtc: "2026-06-21T22:00:00Z", status: "finished", homeScore: 2, awayScore: 2 },
  { externalId: "g-nz-egipto", group: "Grupo G", homeTeam: "Nueva Zelanda", awayTeam: "Egipto", homeFlag: "🇳🇿", awayFlag: "🇪🇬", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-22T01:00:00Z", status: "finished", homeScore: 1, awayScore: 3 },
  { externalId: "g-argentina-austria", group: "Grupo J", homeTeam: "Argentina", awayTeam: "Austria", homeFlag: "🇦🇷", awayFlag: "🇦🇹", venue: "AT&T Stadium, Arlington", kickoffUtc: "2026-06-22T17:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-francia-iraq", group: "Grupo I", homeTeam: "Francia", awayTeam: "Iraq", homeFlag: "🇫🇷", awayFlag: "🇮🇶", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-22T21:00:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-noruega-senegal", group: "Grupo I", homeTeam: "Noruega", awayTeam: "Senegal", homeFlag: "🇳🇴", awayFlag: "🇸🇳", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-23T00:00:00Z", status: "finished", homeScore: 3, awayScore: 2 },
  { externalId: "g-jordania-argelia", group: "Grupo J", homeTeam: "Jordania", awayTeam: "Argelia", homeFlag: "🇯🇴", awayFlag: "🇩🇿", venue: "Levi's Stadium, Santa Clara", kickoffUtc: "2026-06-23T03:00:00Z", status: "finished", homeScore: 1, awayScore: 2 },
  { externalId: "g-senegal-iraq", group: "Grupo I", homeTeam: "Senegal", awayTeam: "Iraq", homeFlag: "🇸🇳", awayFlag: "🇮🇶", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-23T19:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-portugal-uzbekistan", group: "Grupo K", homeTeam: "Portugal", awayTeam: "Uzbekistán", homeFlag: "🇵🇹", awayFlag: "🇺🇿", venue: "Estadio Houston", kickoffUtc: "2026-06-23T17:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-inglaterra-ghana", group: "Grupo L", homeTeam: "Inglaterra", awayTeam: "Ghana", homeFlag: "🏴", awayFlag: "🇬🇭", venue: "Gillette Stadium, Foxborough", kickoffUtc: "2026-06-23T20:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-panama-croacia", group: "Grupo L", homeTeam: "Panamá", awayTeam: "Croacia", homeFlag: "🇵🇦", awayFlag: "🇭🇷", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-23T23:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-colombia-congo", group: "Grupo K", homeTeam: "Colombia", awayTeam: "Congo DR", homeFlag: "🇨🇴", awayFlag: "🇨🇩", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-24T02:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-bosnia-qatar", group: "Grupo B", homeTeam: "Bosnia y Herz.", awayTeam: "Qatar", homeFlag: "🇧🇦", awayFlag: "🇶🇦", venue: "Lumen Field, Seattle", kickoffUtc: "2026-06-24T17:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-suiza-canada", group: "Grupo B", homeTeam: "Suiza", awayTeam: "Canadá", homeFlag: "🇨🇭", awayFlag: "🇨🇦", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-24T17:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-marruecos-haiti", group: "Grupo C", homeTeam: "Marruecos", awayTeam: "Haití", homeFlag: "🇲🇦", awayFlag: "🇭🇹", venue: "Mercedes-Benz Stadium, Atlanta", kickoffUtc: "2026-06-24T20:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-escocia-brasil", group: "Grupo C", homeTeam: "Escocia", awayTeam: "Brasil", homeFlag: "🏴", awayFlag: "🇧🇷", venue: "Hard Rock Stadium, Miami", kickoffUtc: "2026-06-24T20:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-chequia-mexico", group: "Grupo A", homeTeam: "Chequia", awayTeam: "México", homeFlag: "🇨🇿", awayFlag: "🇲🇽", venue: "Estadio Azteca, Ciudad de México", kickoffUtc: "2026-06-25T00:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-sudafrica-corea", group: "Grupo A", homeTeam: "Sudáfrica", awayTeam: "Corea del Sur", homeFlag: "🇿🇦", awayFlag: "🇰🇷", venue: "Estadio Monterrey", kickoffUtc: "2026-06-25T00:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-curazao-civ", group: "Grupo E", homeTeam: "Curazao", awayTeam: "Costa de Marfil", homeFlag: "🇨🇼", awayFlag: "🇨🇮", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-25T18:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-ecuador-alemania", group: "Grupo E", homeTeam: "Ecuador", awayTeam: "Alemania", homeFlag: "🇪🇨", awayFlag: "🇩🇪", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-25T18:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-japon-suecia", group: "Grupo F", homeTeam: "Japón", awayTeam: "Suecia", homeFlag: "🇯🇵", awayFlag: "🇸🇪", venue: "AT&T Stadium, Arlington", kickoffUtc: "2026-06-25T23:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-tunez-holanda", group: "Grupo F", homeTeam: "Túnez", awayTeam: "Países Bajos", homeFlag: "🇹🇳", awayFlag: "🇳🇱", venue: "Sporting KC, Kansas City", kickoffUtc: "2026-06-26T00:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-turquia-eeuu", group: "Grupo D", homeTeam: "Turquía", awayTeam: "EE.UU.", homeFlag: "🇹🇷", awayFlag: "🇺🇸", venue: "SoFi Stadium, Inglewood", kickoffUtc: "2026-06-26T02:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-paraguay-australia", group: "Grupo D", homeTeam: "Paraguay", awayTeam: "Australia", homeFlag: "🇵🇾", awayFlag: "🇦🇺", venue: "Levi's Stadium, Santa Clara", kickoffUtc: "2026-06-26T02:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-francia-noruega", group: "Grupo I", homeTeam: "Francia", awayTeam: "Noruega", homeFlag: "🇫🇷", awayFlag: "🇳🇴", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-26T19:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-senegal-iraq-2", group: "Grupo I", homeTeam: "Senegal", awayTeam: "Iraq", homeFlag: "🇸🇳", awayFlag: "🇮🇶", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-26T19:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-caboverde-arabia", group: "Grupo H", homeTeam: "Cabo Verde", awayTeam: "Arabia Saudita", homeFlag: "🇨🇻", awayFlag: "🇸🇦", venue: "Estadio Houston", kickoffUtc: "2026-06-27T01:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-uruguay-espana", group: "Grupo H", homeTeam: "Uruguay", awayTeam: "España", homeFlag: "🇺🇾", awayFlag: "🇪🇸", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-27T01:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-egipto-iran", group: "Grupo G", homeTeam: "Egipto", awayTeam: "Irán", homeFlag: "🇪🇬", awayFlag: "🇮🇷", venue: "Lumen Field, Seattle", kickoffUtc: "2026-06-27T04:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-nz-belgica", group: "Grupo G", homeTeam: "Nueva Zelanda", awayTeam: "Bélgica", homeFlag: "🇳🇿", awayFlag: "🇧🇪", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-27T04:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-inglaterra-panama", group: "Grupo L", homeTeam: "Inglaterra", awayTeam: "Panamá", homeFlag: "🏴", awayFlag: "🇵🇦", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-27T22:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-croacia-ghana", group: "Grupo L", homeTeam: "Croacia", awayTeam: "Ghana", homeFlag: "🇭🇷", awayFlag: "🇬🇭", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-27T22:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },

  // Ronda de 32 — placeholders hasta confirmar cruces reales tras fase de grupos
  { externalId: "r32-m73", group: "Octavos de 32", homeTeam: "Sudáfrica/3ro", awayTeam: "Canadá/3ro", homeFlag: "🏆", awayFlag: "🏆", venue: "Los Angeles Stadium", kickoffUtc: "2026-06-29T01:00:00Z" },
  { externalId: "r32-m74", group: "Octavos de 32", homeTeam: "Alemania", awayTeam: "3ro Grupo A/B/C/D/F", homeFlag: "🇩🇪", awayFlag: "🏆", venue: "Boston Stadium", kickoffUtc: "2026-06-29T20:30:00Z" },
  { externalId: "r32-m75", group: "Octavos de 32", homeTeam: "Países Bajos", awayTeam: "Marruecos", homeFlag: "🇳🇱", awayFlag: "🇲🇦", venue: "Estadio Monterrey", kickoffUtc: "2026-06-30T02:00:00Z" },
  { externalId: "r32-m76", group: "Octavos de 32", homeTeam: "Brasil", awayTeam: "Japón", homeFlag: "🇧🇷", awayFlag: "🇯🇵", venue: "Houston Stadium", kickoffUtc: "2026-06-30T22:00:00Z" },
  { externalId: "r32-m77", group: "Octavos de 32", homeTeam: "Ganador Grupo I", awayTeam: "3ro Grupo C/D/F/G/H", homeFlag: "🏆", awayFlag: "🏆", venue: "New York New Jersey Stadium", kickoffUtc: "2026-07-01T22:00:00Z" },
  { externalId: "r32-m78", group: "Octavos de 32", homeTeam: "Costa de Marfil", awayTeam: "2do Grupo I", homeFlag: "🇨🇮", awayFlag: "🏆", venue: "Dallas Stadium", kickoffUtc: "2026-07-02T18:00:00Z" },
  { externalId: "r32-m79", group: "Octavos de 32", homeTeam: "México", awayTeam: "3ro Grupo C/E/F/H/I", homeFlag: "🇲🇽", awayFlag: "🏆", venue: "Mexico City Stadium", kickoffUtc: "2026-07-03T02:00:00Z" },
  { externalId: "r32-m80", group: "Octavos de 32", homeTeam: "Ganador Grupo L", awayTeam: "3ro Grupo E/H/I/J/K", homeFlag: "🏆", awayFlag: "🏆", venue: "Atlanta Stadium", kickoffUtc: "2026-07-03T17:00:00Z" },
  { externalId: "r32-m81", group: "Octavos de 32", homeTeam: "EE.UU.", awayTeam: "Bosnia y Herz.", homeFlag: "🇺🇸", awayFlag: "🇧🇦", venue: "San Francisco Bay Area Stadium", kickoffUtc: "2026-07-04T01:00:00Z" },
  { externalId: "r32-m82", group: "Octavos de 32", homeTeam: "Ganador Grupo G", awayTeam: "3ro Grupo A/E/H/I/J", homeFlag: "🏆", awayFlag: "🏆", venue: "Seattle Stadium", kickoffUtc: "2026-06-30T21:00:00Z" },

  // Octavos de Final
  { externalId: "r16-1", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Houston Stadium", kickoffUtc: "2026-07-04T17:00:00Z" },
  { externalId: "r16-2", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Philadelphia Stadium", kickoffUtc: "2026-07-04T21:00:00Z" },
  { externalId: "r16-3", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Atlanta Stadium", kickoffUtc: "2026-07-07T17:00:00Z" },
  { externalId: "r16-4", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Vancouver, BC Place", kickoffUtc: "2026-07-07T23:00:00Z" },

  // Cuartos de Final
  { externalId: "qf-1", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Foxborough, Gillette Stadium", kickoffUtc: "2026-07-09T20:00:00Z" },
  { externalId: "qf-2", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Inglewood, SoFi Stadium", kickoffUtc: "2026-07-10T19:00:00Z" },
  { externalId: "qf-3", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Miami Gardens, Hard Rock Stadium", kickoffUtc: "2026-07-11T21:00:00Z" },
  { externalId: "qf-4", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Kansas City, Arrowhead Stadium", kickoffUtc: "2026-07-12T01:00:00Z" },

  // Semifinales
  { externalId: "sf-1", group: "Semifinal", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Arlington, AT&T Stadium", kickoffUtc: "2026-07-14T19:00:00Z" },
  { externalId: "sf-2", group: "Semifinal", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Atlanta Stadium", kickoffUtc: "2026-07-15T19:00:00Z" },

  // Tercer puesto
  { externalId: "3rd-place", group: "Tercer Puesto", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Miami Gardens, Hard Rock Stadium", kickoffUtc: "2026-07-18T21:00:00Z" },

  // Final
  { externalId: "final", group: "Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "East Rutherford, New York New Jersey Stadium", kickoffUtc: "2026-07-19T19:00:00Z" },
];
