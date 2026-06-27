export type MatchRecord = {
  id: number;
  externalId: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  venue: string | null;
  kickoffUtc: string;
  status: "scheduled" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
  oddsHome: string | null;
  oddsDraw: string | null;
  oddsAway: string | null;
  oddsOver25: string | null;
  oddsUnder25: string | null;
  handicapMarkets: { market: string; odds: number }[];
  newsItems: { type: string; icon: string; text: string }[];
  ourProbHome: string | null;
  ourProbDraw: string | null;
  ourProbAway: string | null;
  ourProbOver25: string | null;
  ourProbUnder25: string | null;
  bestMarket: string | null;
  bestMarketOdds: string | null;
  edgePct: string | null;
  valueType: "value" | "caution" | "novalue" | "played" | null;
  lastScrapedAt: string | null;
};

export type LearningRow = {
  marketKey: string;
  label: string;
  hits: number;
  total: number;
  accuracyPct: number;
  recommendation: "priorizar" | "neutral" | "reducir";
};

export type SimulatedBet = {
  id: number;
  matchId: number;
  market: string;
  oddsTaken: string;
  stake: string;
  potentialReturn: string;
  outcome: "pending" | "won" | "lost" | "void";
  placedAt: string;
  settledAt: string | null;
};

export type BankrollSummary = {
  balance: number;
  totalStaked: number;
  pending: number;
  won: number;
  lost: number;
};
