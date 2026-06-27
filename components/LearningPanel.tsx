"use client";

import { useState } from "react";
import type { LearningRow } from "@/lib/types";

type Props = {
  learning: LearningRow[];
};

export default function LearningPanel({ learning }: Props) {
  const [open, setOpen] = useState(false);

  const totalChecks = learning.reduce((sum, r) => sum + r.total, 0);
  const totalHits = learning.reduce((sum, r) => sum + r.hits, 0);
  const accuracy = totalChecks > 0 ? Math.round((totalHits / totalChecks) * 100) : 0;
  const best = learning.reduce(
    (best, r) => (r.total >= 3 && r.accuracyPct > (best?.accuracyPct ?? -1) ? r : best),
    null as LearningRow | null
  );

  return (
    <>
      <div className={`learn-panel ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        <div className="learn-icon">🧠</div>
        <div className="learn-text">
          <div className="learn-title">Motor de Aprendizaje Activo</div>
          <div className="learn-sub">
            {totalChecks} señales evaluadas sobre partidos finalizados
          </div>
        </div>
        <div className="learn-stats">
          <div className="learn-stat">
            <div className="learn-stat-val">{accuracy}%</div>
            <div className="learn-stat-lbl">Precisión</div>
          </div>
          <div className="learn-stat">
            <div className="learn-stat-val">{best ? best.label.split(" ")[0] : "—"}</div>
            <div className="learn-stat-lbl">Mejor mercado</div>
          </div>
        </div>
        <div className="learn-chev">▼</div>
      </div>

      {open && (
        <div className="learn-detail">
          {learning.length === 0 ? (
            <div className="learn-empty">
              Aún no hay suficientes partidos finalizados para generar estadísticas.
            </div>
          ) : (
            learning.map((r) => {
              const color =
                r.accuracyPct >= 65 ? "var(--green)" : r.accuracyPct >= 45 ? "var(--amber)" : "var(--red)";
              const recLabel =
                r.recommendation === "priorizar"
                  ? "✅ Priorizar"
                  : r.recommendation === "neutral"
                  ? "⚠️ Neutral"
                  : "🔻 Reducir peso";
              return (
                <div className="learn-row" key={r.marketKey}>
                  <div className="learn-row-name">{r.label}</div>
                  <div className="learn-row-stats">
                    <div className="learn-bar-mini">
                      <div
                        className="learn-bar-fill"
                        style={{ width: `${r.accuracyPct}%`, background: color }}
                      />
                    </div>
                    <div className="learn-pct" style={{ color }}>
                      {r.accuracyPct}%
                    </div>
                    <div className="learn-rec">
                      {recLabel} ({r.hits}/{r.total})
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="learn-note">
            🧠 <strong>Cómo funciona:</strong> cada partido finalizado se compara contra las
            probabilidades que el sistema estimó previamente. El motor rastrea qué tipo de mercado
            (1X2, Over/Under, Ambos Anotan) tuvo mejor tasa de acierto histórica y ajusta
            automáticamente la confianza de futuras recomendaciones similares. Mercados con ≥65% de
            acierto se priorizan; los de &lt;45% se penalizan.
          </div>
        </div>
      )}

      <style jsx>{`
        .learn-panel {
          background: linear-gradient(135deg, var(--s2), #0f1525);
          border-bottom: 1px solid rgba(167, 139, 247, 0.18);
          padding: 11px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .learn-icon {
          font-size: 18px;
          flex-shrink: 0;
        }
        .learn-text {
          flex: 1;
          min-width: 0;
        }
        .learn-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--purple);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .learn-sub {
          font-size: 9px;
          color: var(--muted);
          margin-top: 1px;
        }
        .learn-stats {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .learn-stat {
          text-align: center;
        }
        .learn-stat-val {
          font-family: "Bebas Neue", sans-serif;
          font-size: 15px;
          color: var(--gold);
        }
        .learn-stat-lbl {
          font-size: 7px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .learn-chev {
          color: var(--dim);
          font-size: 10px;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .learn-panel.open .learn-chev {
          transform: rotate(180deg);
        }
        .learn-detail {
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 12px 16px;
        }
        .learn-empty {
          font-size: 11px;
          color: var(--muted);
          text-align: center;
          padding: 12px 0;
        }
        .learn-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid var(--border);
          font-size: 11px;
        }
        .learn-row:last-child {
          border-bottom: none;
        }
        .learn-row-name {
          color: var(--muted);
        }
        .learn-row-stats {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .learn-bar-mini {
          width: 50px;
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 3px;
          overflow: hidden;
        }
        .learn-bar-fill {
          height: 100%;
          border-radius: 3px;
        }
        .learn-pct {
          font-weight: 700;
          width: 32px;
          text-align: right;
          font-size: 10px;
        }
        .learn-rec {
          font-size: 9px;
          color: var(--muted);
          width: 90px;
          text-align: right;
        }
        .learn-note {
          font-size: 9px;
          color: var(--dim);
          margin-top: 8px;
          line-height: 1.5;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </>
  );
}
