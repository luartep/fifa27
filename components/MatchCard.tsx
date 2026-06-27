"use client";

import { useState } from "react";
import { chileFullDateTime } from "@/lib/chileTime";
import type { MatchRecord } from "@/lib/types";

type Props = {
  match: MatchRecord;
  onPlaceBet: (params: { matchId: number; market: string; oddsTaken: number; stake: number }) => Promise<void>;
};

export default function MatchCard({ match, onPlaceBet }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"1x2" | "goals" | "hcap">("1x2");
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const isPlayed = match.status === "finished";
  const riskClass =
    match.valueType === "value" ? "rp-green" : match.valueType === "caution" ? "rp-amber" : isPlayed ? "rp-grey" : "rp-amber";
  const riskLabel = isPlayed
    ? "✅ Jugado"
    : match.valueType === "value"
    ? "🟢 Valor"
    : match.valueType === "caution"
    ? "🟡 Moderado"
    : "🔴 Sin valor";

  async function handlePlaceBet() {
    const stakeNum = parseFloat(stake);
    if (!stakeNum || stakeNum <= 0 || !match.bestMarket || !match.bestMarketOdds) {
      setFeedback({ ok: false, msg: "Ingresa un monto válido." });
      return;
    }
    setPlacing(true);
    setFeedback(null);
    try {
      await onPlaceBet({
        matchId: match.id,
        market: match.bestMarket,
        oddsTaken: Number(match.bestMarketOdds),
        stake: stakeNum,
      });
      setFeedback({ ok: true, msg: `Apuesta simulada registrada: $${stakeNum.toLocaleString("es-CL")}` });
      setStake("");
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Error al apostar." });
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className={`mcard ${open ? "open" : ""}`}>
      <div className="mcard-head" onClick={() => setOpen(!open)}>
        <div className="grp-pill">{match.group}</div>
        <div className="teams-row">
          <span className="t-flag">{match.homeFlag}</span>
          <span className="t-name">{match.homeTeam}</span>
          <span className="vs">VS</span>
          <span className="t-name">{match.awayTeam}</span>
          <span className="t-flag">{match.awayFlag}</span>
        </div>
        {isPlayed && match.homeScore != null && (
          <span className="result-badge">
            {match.homeScore}-{match.awayScore}
          </span>
        )}
        <div className="mtime-wrap">
          <div className="mtime-val">{chileFullDateTime(match.kickoffUtc).split(",")[1]?.trim()}</div>
          <div className="mtime-venue">{match.venue}</div>
        </div>
        <span className={`risk-pill ${riskClass}`}>{riskLabel}</span>
        <span className="chev">▼</span>
      </div>

      {open && (
        <div className="mcard-body">
          <div className="body-div" />

          {match.newsItems?.length > 0 && (
            <div className="news-stack">
              {match.newsItems.map((n, i) => (
                <div className={`news-item ${n.type}`} key={i}>
                  <span>{n.icon}</span>
                  <span dangerouslySetInnerHTML={{ __html: n.text }} />
                </div>
              ))}
            </div>
          )}

          <div className="tabs">
            <button className={tab === "1x2" ? "active" : ""} onClick={() => setTab("1x2")}>
              1X2
            </button>
            <button className={tab === "goals" ? "active" : ""} onClick={() => setTab("goals")}>
              Goles
            </button>
            <button className={tab === "hcap" ? "active" : ""} onClick={() => setTab("hcap")}>
              Handicap
            </button>
          </div>

          {tab === "1x2" && (
            <div className="tab-pane">
              <ProbRow
                label={match.homeTeam}
                pct={Number(match.ourProbHome ?? 0)}
                color="var(--green)"
                barClass="pf-win"
                odds={match.oddsHome}
              />
              <ProbRow
                label="Empate"
                pct={Number(match.ourProbDraw ?? 0)}
                color="var(--gold)"
                barClass="pf-draw"
                odds={match.oddsDraw}
              />
              <ProbRow
                label={match.awayTeam}
                pct={Number(match.ourProbAway ?? 0)}
                color="var(--red)"
                barClass="pf-lose"
                odds={match.oddsAway}
              />
            </div>
          )}

          {tab === "goals" && (
            <div className="tab-pane">
              <ProbRow
                label="Over 2.5 gls"
                pct={Number(match.ourProbOver25 ?? 0)}
                color="var(--blue)"
                barClass="pf-over"
                odds={match.oddsOver25}
              />
              <ProbRow
                label="Under 2.5 gls"
                pct={Number(match.ourProbUnder25 ?? 0)}
                color="var(--purple)"
                barClass="pf-under"
                odds={match.oddsUnder25}
              />
            </div>
          )}

          {tab === "hcap" && (
            <div className="tab-pane">
              {match.handicapMarkets?.length > 0 ? (
                <table className="htable">
                  <thead>
                    <tr>
                      <th>Mercado</th>
                      <th>Cuota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.handicapMarkets.map((h, i) => (
                      <tr key={i}>
                        <td>{h.market}</td>
                        <td>{h.odds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-note">Sin mercados de hándicap disponibles aún.</div>
              )}
            </div>
          )}

          {!isPlayed && match.bestMarket && match.valueType !== "novalue" && (
            <div className="bet-row">
              <div className="bet-row-title">💰 Modo Simulación · Apostar</div>
              <div className="bet-rec">
                <span className={`bet-rec-badge ${match.valueType === "value" ? "v-value" : "v-caution"}`}>
                  {match.valueType === "value" ? "✅ CON VALOR" : "⚠️ PRECAUCIÓN"}
                </span>
                <div className="bet-rec-text">
                  Mercado: <strong>{match.bestMarket}</strong> · Cuota{" "}
                  <strong>{match.bestMarketOdds}</strong> · Borde{" "}
                  <strong>{match.edgePct}%</strong>
                </div>
              </div>
              <div className="bet-inputs">
                <div className="input-group">
                  <label>Monto a simular</label>
                  <div className="bet-field-wrap">
                    <span className="bet-symbol">$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      placeholder="Ej: 5000"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                    />
                  </div>
                </div>
                <button className="calc-btn" disabled={placing} onClick={handlePlaceBet}>
                  {placing ? "..." : "Apostar"}
                </button>
              </div>
              {feedback && (
                <div className={`bet-feedback ${feedback.ok ? "ok" : "err"}`}>{feedback.msg}</div>
              )}
            </div>
          )}

          {!isPlayed && match.valueType === "novalue" && (
            <div className="novalue-box">
              <div className="nv-icon">🚫</div>
              <div>
                <div className="nv-title">SIN VALOR · NO APOSTAR</div>
                <div className="nv-text">
                  Ningún mercado de este partido supera la probabilidad implícita en la cuota con
                  margen suficiente.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .mcard {
          background: var(--s1);
          border: 1px solid var(--border);
          border-radius: 11px;
          margin-bottom: 9px;
          overflow: hidden;
        }
        .mcard.open {
          border-color: rgba(79, 142, 247, 0.2);
        }
        .mcard-head {
          padding: 12px 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .grp-pill {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: var(--s3);
          color: var(--muted);
          border-radius: 4px;
          padding: 2px 6px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .teams-row {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 0;
        }
        .t-flag {
          font-size: 17px;
        }
        .t-name {
          font-family: "Bebas Neue", sans-serif;
          font-size: 14px;
          letter-spacing: 0.05em;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80px;
        }
        .vs {
          font-size: 8px;
          color: var(--dim);
          font-weight: 700;
        }
        .result-badge {
          font-family: "Bebas Neue", sans-serif;
          font-size: 16px;
          color: #fff;
          background: var(--s3);
          border-radius: 6px;
          padding: 2px 8px;
          flex-shrink: 0;
        }
        .mtime-wrap {
          text-align: right;
          flex-shrink: 0;
        }
        .mtime-val {
          font-size: 10px;
          font-weight: 700;
        }
        .mtime-venue {
          font-size: 8px;
          color: var(--muted);
          margin-top: 1px;
          max-width: 100px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .risk-pill {
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rp-green {
          background: var(--green2);
          color: var(--green);
        }
        .rp-amber {
          background: var(--amber2);
          color: var(--amber);
        }
        .rp-grey {
          background: rgba(90, 104, 136, 0.12);
          color: var(--muted);
        }
        .chev {
          color: var(--dim);
          font-size: 9px;
          flex-shrink: 0;
        }
        .mcard.open .chev {
          transform: rotate(180deg);
        }
        .mcard-body {
          padding: 0 13px 13px;
        }
        .body-div {
          height: 1px;
          background: var(--border);
          margin-bottom: 11px;
        }
        .news-stack {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 11px;
        }
        .news-item {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          background: rgba(255, 255, 255, 0.02);
          border-left: 2px solid var(--dim);
          padding: 6px 8px;
          border-radius: 0 5px 5px 0;
          font-size: 11px;
          line-height: 1.45;
          color: var(--muted);
        }
        .news-item.inj {
          border-left-color: var(--red);
        }
        .news-item.form {
          border-left-color: var(--green);
        }
        .news-item.info {
          border-left-color: var(--blue);
        }
        .news-item.table {
          border-left-color: var(--gold);
        }
        .tabs {
          display: flex;
          gap: 2px;
          background: var(--bg);
          border-radius: 7px;
          padding: 3px;
          margin-bottom: 11px;
        }
        .tabs button {
          flex: 1;
          padding: 6px 0;
          border: none;
          background: none;
          color: var(--muted);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: 5px;
          cursor: pointer;
        }
        .tabs button.active {
          background: var(--s3);
          color: var(--text);
        }
        .htable {
          width: 100%;
          border-collapse: collapse;
        }
        .htable th {
          font-size: 8px;
          color: var(--dim);
          text-align: left;
          padding-bottom: 6px;
        }
        .htable td {
          padding: 6px;
          border-top: 1px solid var(--border);
          font-size: 10px;
        }
        .empty-note {
          font-size: 11px;
          color: var(--muted);
          padding: 8px 0;
        }
        .bet-row {
          margin-top: 12px;
          background: var(--s2);
          border: 1px solid var(--border2);
          border-radius: 10px;
          padding: 12px 13px;
        }
        .bet-row-title {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 9px;
        }
        .bet-rec {
          display: flex;
          gap: 7px;
          margin-bottom: 10px;
          align-items: flex-start;
        }
        .bet-rec-badge {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .v-value {
          background: var(--green2);
          color: var(--green);
        }
        .v-caution {
          background: var(--amber2);
          color: var(--amber);
        }
        .bet-rec-text {
          font-size: 11px;
          color: var(--muted);
          line-height: 1.45;
        }
        .bet-rec-text strong {
          color: var(--text);
        }
        .bet-inputs {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 7px;
          align-items: end;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .input-group label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--muted);
        }
        .bet-field-wrap {
          display: flex;
          align-items: center;
          background: var(--bg);
          border: 1px solid var(--border2);
          border-radius: 7px;
          padding: 0 10px;
          gap: 5px;
        }
        .bet-symbol {
          font-size: 13px;
          font-weight: 700;
          color: var(--gold);
        }
        .bet-field-wrap input {
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-size: 16px;
          font-weight: 700;
          width: 100%;
          padding: 9px 0;
        }
        .calc-btn {
          background: linear-gradient(135deg, var(--blue), #3a72e0);
          border: none;
          border-radius: 7px;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 10px 13px;
          cursor: pointer;
        }
        .calc-btn:disabled {
          opacity: 0.6;
        }
        .bet-feedback {
          margin-top: 8px;
          font-size: 10px;
          padding: 6px 9px;
          border-radius: 6px;
        }
        .bet-feedback.ok {
          background: var(--green2);
          color: var(--green);
        }
        .bet-feedback.err {
          background: var(--red2);
          color: var(--red);
        }
        .novalue-box {
          margin-top: 12px;
          background: var(--red2);
          border: 1px solid rgba(240, 82, 82, 0.2);
          border-radius: 10px;
          padding: 11px 13px;
          display: flex;
          gap: 9px;
        }
        .nv-icon {
          font-size: 18px;
        }
        .nv-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--red);
          text-transform: uppercase;
        }
        .nv-text {
          font-size: 10px;
          color: var(--muted);
          margin-top: 2px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

function ProbRow({
  label,
  pct,
  color,
  barClass,
  odds,
}: {
  label: string;
  pct: number;
  color: string;
  barClass: string;
  odds: string | null;
}) {
  return (
    <div className="prob-row">
      <div className="prob-lbl">{label}</div>
      <div className="prob-track">
        <div className={`prob-fill ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="prob-pct" style={{ color }}>
        {pct}%
      </div>
      <div className="prob-odds">{odds ?? "—"}</div>

      <style jsx>{`
        .prob-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
        }
        .prob-lbl {
          font-size: 10px;
          color: var(--muted);
          width: 80px;
          flex-shrink: 0;
        }
        .prob-track {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 3px;
          overflow: hidden;
        }
        .prob-fill {
          height: 100%;
          border-radius: 3px;
        }
        .pf-win {
          background: linear-gradient(90deg, var(--green), #17c96f);
        }
        .pf-draw {
          background: linear-gradient(90deg, var(--gold), #d4aa20);
        }
        .pf-lose {
          background: linear-gradient(90deg, var(--red), #d43c3c);
        }
        .pf-over {
          background: linear-gradient(90deg, var(--blue), #3a78e8);
        }
        .pf-under {
          background: linear-gradient(90deg, var(--purple), #8a72e0);
        }
        .prob-pct {
          font-size: 11px;
          font-weight: 700;
          width: 34px;
          text-align: right;
        }
        .prob-odds {
          font-size: 9px;
          color: var(--muted);
          width: 44px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
