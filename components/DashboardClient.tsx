"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMatches, useLearning, useBets } from "@/lib/hooks";
import { chileDateKey, todayChileKey } from "@/lib/chileTime";
import DayNav from "@/components/DayNav";
import LearningPanel from "@/components/LearningPanel";
import BankrollPanel from "@/components/BankrollPanel";
import MatchCard from "@/components/MatchCard";

export default function DashboardClient() {
  const router = useRouter();
  const { matches, loading, lastFetch, refetch } = useMatches();
  const { learning } = useLearning();
  const { bets, summary, placeBet } = useBets();

  const [activeDay, setActiveDay] = useState<string | null>(null);

  const today = todayChileKey();
  const effectiveDay = activeDay ?? today;

  const matchesForDay = useMemo(
    () => matches.filter((m) => chileDateKey(m.kickoffUtc) === effectiveDay),
    [matches, effectiveDay]
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="dashboard">
      <div className="hdr">
        <div>
          <div className="hdr-logo">
            ⚽ Mundial <span>2026</span>
          </div>
          <div className="hdr-sub">Panel de Mercados · Hora de Chile</div>
        </div>
        <div className="hdr-right">
          <div className="live-badge">
            <div className="live-dot" />
            {lastFetch ? `Actualizado ${lastFetch.toLocaleTimeString("es-CL")}` : "Cargando..."}
          </div>
          <button className="refresh-btn" onClick={refetch} title="Refrescar ahora">
            ↺
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </div>

      <LearningPanel learning={learning} />
      <BankrollPanel summary={summary} bets={bets} />

      <DayNav matches={matches} activeDay={effectiveDay} onSelectDay={setActiveDay} />

      <div className="content">
        {loading ? (
          <div className="loading-state">Cargando partidos...</div>
        ) : matchesForDay.length === 0 ? (
          <div className="empty-day">
            <div className="ei">📅</div>
            <div className="et">Sin partidos para este día.</div>
          </div>
        ) : (
          <>
            <div className="day-section-header">
              {effectiveDay === today ? "🔴 HOY — " : ""}
              {matchesForDay.length} partido{matchesForDay.length > 1 ? "s" : ""}
            </div>
            {matchesForDay.map((m) => (
              <MatchCard key={m.id} match={m} onPlaceBet={placeBet} />
            ))}
          </>
        )}
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          padding-bottom: 40px;
        }
        .hdr {
          background: linear-gradient(160deg, #0b1830, #080b12);
          border-bottom: 1px solid rgba(79, 142, 247, 0.18);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 200;
        }
        .hdr-logo {
          font-family: "Bebas Neue", sans-serif;
          font-size: 20px;
          letter-spacing: 0.12em;
          color: #fff;
          line-height: 1;
        }
        .hdr-logo span {
          color: var(--gold);
        }
        .hdr-sub {
          font-size: 9px;
          color: var(--muted);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .hdr-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .live-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--green2);
          border: 1px solid rgba(31, 217, 125, 0.22);
          border-radius: 20px;
          padding: 4px 9px;
          font-size: 9px;
          font-weight: 700;
          color: var(--green);
          white-space: nowrap;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          background: var(--green);
          border-radius: 50%;
        }
        .refresh-btn,
        .logout-btn {
          background: var(--s2);
          border: 1px solid var(--border2);
          border-radius: 7px;
          color: var(--muted);
          font-size: 11px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .logout-btn:hover,
        .refresh-btn:hover {
          color: var(--text);
        }
        .content {
          padding: 12px 14px 40px;
        }
        .day-section-header {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
          padding: 4px 0 8px;
        }
        .loading-state,
        .empty-day {
          text-align: center;
          padding: 40px 20px;
          color: var(--muted);
        }
        .empty-day .ei {
          font-size: 32px;
          margin-bottom: 9px;
        }
      `}</style>
    </div>
  );
}
