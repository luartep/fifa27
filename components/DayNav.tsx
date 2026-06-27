"use client";

import { chileDateKey, chileDayLabel, todayChileKey } from "@/lib/chileTime";
import type { MatchRecord } from "@/lib/types";

type Props = {
  matches: MatchRecord[];
  activeDay: string;
  onSelectDay: (day: string) => void;
};

export default function DayNav({ matches, activeDay, onSelectDay }: Props) {
  const dayMap = new Map<string, MatchRecord[]>();
  for (const m of matches) {
    const key = chileDateKey(m.kickoffUtc);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(m);
  }
  const sortedDays = Array.from(dayMap.keys()).sort();
  const today = todayChileKey();

  return (
    <div className="day-nav">
      {sortedDays.map((day) => {
        const isToday = day === today;
        const isActive = day === activeDay;
        const sample = dayMap.get(day)![0];
        const label = chileDayLabel(sample.kickoffUtc);
        const [weekday, num, mon] = label.split(" ");
        return (
          <button
            key={day}
            className={`day-btn ${isActive ? "active" : ""} ${isToday ? "today" : ""}`}
            onClick={() => onSelectDay(day)}
          >
            <span className="dnum">{num}</span>
            <span className="dmon">
              {mon}
              {isToday ? " · HOY" : ""}
            </span>
            <span className="dcnt">{dayMap.get(day)!.length}p</span>
          </button>
        );
      })}

      <style jsx>{`
        .day-nav {
          background: var(--s1);
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
          display: flex;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
          position: sticky;
          top: 0;
          z-index: 190;
        }
        .day-nav::-webkit-scrollbar {
          display: none;
        }
        .day-btn {
          padding: 10px 13px 9px;
          border: none;
          background: none;
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
        }
        .day-btn:hover {
          color: var(--text);
        }
        .day-btn.active {
          color: var(--gold);
          border-bottom-color: var(--gold);
        }
        .dnum {
          font-size: 14px;
          font-weight: 800;
          line-height: 1;
        }
        .dmon {
          font-size: 8px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .dcnt {
          font-size: 8px;
          font-weight: 700;
          background: var(--s3);
          color: var(--muted);
          padding: 1px 5px;
          border-radius: 6px;
          margin-top: 1px;
        }
        .day-btn.active .dcnt {
          background: var(--gold2);
          color: var(--gold);
        }
        .day-btn.today .dnum,
        .day-btn.today .dmon {
          color: var(--blue);
        }
        .day-btn.active.today .dnum,
        .day-btn.active.today .dmon {
          color: var(--gold);
        }
      `}</style>
    </div>
  );
}
