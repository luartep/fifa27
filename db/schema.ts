import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Partidos del Mundial 2026.
 * Una fila por partido. Las cuotas/resultado se actualizan
 * por el cron de scraping (cada pocos minutos).
 */
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 120 }).notNull().unique(), // slug estable, ej "2026-06-23-portugal-uzbekistan"
  group: varchar("group_name", { length: 40 }).notNull(), // "Grupo K"
  homeTeam: varchar("home_team", { length: 80 }).notNull(),
  awayTeam: varchar("away_team", { length: 80 }).notNull(),
  homeFlag: varchar("home_flag", { length: 10 }),
  awayFlag: varchar("away_flag", { length: 10 }),
  venue: varchar("venue", { length: 160 }),

  // URL de la página del partido en Oddschecker, usada por el cron de scraping.
  // Se configura manualmente al crear el partido (ver db/seed.ts).
  oddscheckerUrl: varchar("oddschecker_url", { length: 500 }),

  // Guardamos siempre en UTC; la conversión a hora de Chile se hace en el cliente/servidor al leer.
  kickoffUtc: timestamp("kickoff_utc", { withTimezone: true }).notNull(),

  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled | live | finished
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),

  // Cuotas más recientes (formato decimal, ya convertidas desde fraccional/americano)
  oddsHome: numeric("odds_home", { precision: 8, scale: 3 }),
  oddsDraw: numeric("odds_draw", { precision: 8, scale: 3 }),
  oddsAway: numeric("odds_away", { precision: 8, scale: 3 }),
  oddsOver25: numeric("odds_over25", { precision: 8, scale: 3 }),
  oddsUnder25: numeric("odds_under25", { precision: 8, scale: 3 }),

  // Mercados adicionales de hándicap, guardados como JSON flexible:
  // [{ market: "Portugal -1.5 (Asiático)", odds: 2.15, impliedProb: 46.5 }, ...]
  handicapMarkets: jsonb("handicap_markets").default([]),

  // Análisis / noticias generadas (texto libre, lo arma el motor de análisis)
  newsItems: jsonb("news_items").default([]),

  // Resultado de nuestro modelo de probabilidad propio
  ourProbHome: numeric("our_prob_home", { precision: 5, scale: 2 }),
  ourProbDraw: numeric("our_prob_draw", { precision: 5, scale: 2 }),
  ourProbAway: numeric("our_prob_away", { precision: 5, scale: 2 }),
  ourProbOver25: numeric("our_prob_over25", { precision: 5, scale: 2 }),
  ourProbUnder25: numeric("our_prob_under25", { precision: 5, scale: 2 }),

  bestMarket: varchar("best_market", { length: 120 }),
  bestMarketOdds: numeric("best_market_odds", { precision: 8, scale: 3 }),
  edgePct: numeric("edge_pct", { precision: 6, scale: 2 }),
  valueType: varchar("value_type", { length: 20 }), // value | caution | novalue | played

  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Histórico de cuotas: cada vez que el scraper corre, guarda un snapshot.
 * Esto es lo que alimenta gráficos de movimiento de cuotas y --- más importante ---
 * el motor de aprendizaje (comparar cuota al momento de "recomendar" vs cuota final).
 */
export const oddsHistory = pgTable("odds_history", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  oddsHome: numeric("odds_home", { precision: 8, scale: 3 }),
  oddsDraw: numeric("odds_draw", { precision: 8, scale: 3 }),
  oddsAway: numeric("odds_away", { precision: 8, scale: 3 }),
  oddsOver25: numeric("odds_over25", { precision: 8, scale: 3 }),
  oddsUnder25: numeric("odds_under25", { precision: 8, scale: 3 }),
  source: varchar("source", { length: 40 }).default("oddschecker"),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow(),
});

/**
 * Apuestas simuladas (modo simulación, dinero ficticio).
 * Un solo usuario fijo (apuesta/apuesta) pero deja la columna userId
 * lista para multi-usuario en el futuro.
 */
export const simulatedBets = pgTable("simulated_bets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 40 }).notNull().default("apuesta"),
  matchId: integer("match_id").notNull(),
  market: varchar("market", { length: 120 }).notNull(),
  oddsTaken: numeric("odds_taken", { precision: 8, scale: 3 }).notNull(),
  stake: numeric("stake", { precision: 12, scale: 2 }).notNull(),
  potentialReturn: numeric("potential_return", { precision: 12, scale: 2 }).notNull(),

  // settled cuando el partido termina: won | lost | void | pending
  outcome: varchar("outcome", { length: 10 }).notNull().default("pending"),
  settledAt: timestamp("settled_at", { withTimezone: true }),

  placedAt: timestamp("placed_at", { withTimezone: true }).defaultNow(),
});

/**
 * Estadísticas agregadas del motor de aprendizaje, por tipo de mercado.
 * Se recalcula cada vez que un partido pasa a "finished".
 */
export const learningStats = pgTable("learning_stats", {
  id: serial("id").primaryKey(),
  marketKey: varchar("market_key", { length: 40 }).notNull().unique(), // "1x2_fav", "over25", etc
  label: varchar("label", { length: 80 }).notNull(),
  hits: integer("hits").notNull().default(0),
  total: integer("total").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Bankroll virtual del modo simulación (banca ficticia, separada del dinero real).
 */
export const simBankroll = pgTable("sim_bankroll", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 40 }).notNull().default("apuesta").unique(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("100000"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
