"use client";

import { useEffect, useState, useCallback } from "react";
import type { MatchRecord, LearningRow, SimulatedBet, BankrollSummary } from "@/lib/types";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos — "cada pocos minutos" como se definió

export function useMatches() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/matches", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMatches(data.matches ?? []);
      setLastFetch(new Date());
    } catch (err) {
      console.warn("No se pudo refrescar partidos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  return { matches, loading, lastFetch, refetch: fetchMatches };
}

export function useLearning() {
  const [learning, setLearning] = useState<LearningRow[]>([]);

  const fetchLearning = useCallback(async () => {
    try {
      const res = await fetch("/api/learning", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setLearning(data.learning ?? []);
    } catch (err) {
      console.warn("No se pudo refrescar aprendizaje:", err);
    }
  }, []);

  useEffect(() => {
    fetchLearning();
    const interval = setInterval(fetchLearning, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLearning]);

  return { learning, refetch: fetchLearning };
}

export function useBets() {
  const [bets, setBets] = useState<SimulatedBet[]>([]);
  const [summary, setSummary] = useState<BankrollSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(async () => {
    try {
      const res = await fetch("/api/bets", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setBets(data.bets ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      console.warn("No se pudo refrescar apuestas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  async function placeBet(params: {
    matchId: number;
    market: string;
    oddsTaken: number;
    stake: number;
  }) {
    const res = await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "No se pudo registrar la apuesta.");
    }
    await fetchBets();
    return data;
  }

  return { bets, summary, loading, refetch: fetchBets, placeBet };
}
