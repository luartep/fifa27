"use client";

import { useState } from "react";
import type { BankrollSummary, SimulatedBet } from "@/lib/types";

type Props = {
  summary: BankrollSummary | null;
  bets: SimulatedBet[];
};

export default function BankrollPanel({ summary, bets }: Props) {
  const [open, setOpen] = useState(false);

  if (!summary) return null;

  return (
    <>
      <div className="bankroll-bar" onClick={() => setOpen(!open)}>
        <div className="bk-icon">🎲</div>
        <div className="bk-text">
          <div className="bk-title">Banca Simulada</div>
          <div className="bk-sub">{summary.pending} apuestas pendientes</div>
        </div>
        <div className="bk-balance">${summary.balance.toLocaleString("es-CL")}</div>
        <div className="bk-chev">{open ? "▲" : "▼"}</div>
      </div>

      {open && (
        <div className="bk-detail">
          <div className="bk-stats-row">
            <Stat label="Apostado total" value={`$${summary.totalStaked.toLocaleString("es-CL")}`} />
            <Stat label="Ganadas" value={String(summary.won)} color="var(--green)" />
            <Stat label="Perdidas" value={String(summary.lost)} color="var(--red)" />
          </div>

          <div className="bk-history-title">Historial de apuestas</div>
          {bets.length === 0 ? (
            <div className="bk-empty">Aún no has registrado apuestas simuladas.</div>
          ) : (
            <div className="bk-history">
              {bets.slice(0, 20).map((b) => (
                <div className="bk-row" key={b.id}>
                  <div className="bk-row-market">{b.market}</div>
                  <div className="bk-row-meta">
                    ${Number(b.stake).toLocaleString("es-CL")} @ {b.oddsTaken}
                  </div>
                  <span className={`bk-outcome ${b.outcome}`}>
                    {b.outcome === "pending"
                      ? "⏳ Pendiente"
                      : b.outcome === "won"
                      ? "✅ Ganada"
                      : b.outcome === "lost"
                      ? "❌ Perdida"
                      : "↩️ Anulada"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .bankroll-bar {
          background: linear-gradient(135deg, var(--s2), #0f1525);
          border-bottom: 1px solid rgba(245, 200, 66, 0.18);
          padding: 11px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .bk-icon {
          font-size: 18px;
        }
        .bk-text {
          flex: 1;
        }
        .bk-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--gold);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .bk-sub {
          font-size: 9px;
          color: var(--muted);
          margin-top: 1px;
        }
        .bk-balance {
          font-family: "Bebas Neue", sans-serif;
          font-size: 18px;
          color: var(--gold);
        }
        .bk-chev {
          color: var(--dim);
          font-size: 10px;
        }
        .bk-detail {
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 12px 16px;
        }
        .bk-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }
        .bk-history-title {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .bk-empty {
          font-size: 11px;
          color: var(--muted);
          text-align: center;
          padding: 16px 0;
        }
        .bk-history {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 280px;
          overflow-y: auto;
        }
        .bk-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--s1);
          border-radius: 7px;
          padding: 8px 10px;
        }
        .bk-row-market {
          flex: 1;
          font-size: 10px;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bk-row-meta {
          font-size: 9px;
          color: var(--muted);
          flex-shrink: 0;
        }
        .bk-outcome {
          font-size: 9px;
          font-weight: 700;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .bk-outcome.pending {
          color: var(--amber);
        }
        .bk-outcome.won {
          color: var(--green);
        }
        .bk-outcome.lost {
          color: var(--red);
        }
      `}</style>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat-cell">
      <div className="stat-val" style={{ color: color ?? "var(--text)" }}>
        {value}
      </div>
      <div className="stat-lbl">{label}</div>
      <style jsx>{`
        .stat-cell {
          background: var(--s1);
          border-radius: 8px;
          padding: 8px;
          text-align: center;
        }
        .stat-val {
          font-family: "Bebas Neue", sans-serif;
          font-size: 16px;
        }
        .stat-lbl {
          font-size: 8px;
          color: var(--muted);
          text-transform: uppercase;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
