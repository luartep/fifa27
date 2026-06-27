/**
 * Motor de cálculo de valor y staking.
 * Misma lógica que el prototipo HTML, ahora tipada y testeable.
 */

export function impliedProbability(decimalOdds: number): number {
  if (!decimalOdds || decimalOdds <= 1) return 0;
  return Math.round((1 / decimalOdds) * 10000) / 100; // %
}

export type ValueType = "value" | "caution" | "novalue";

/**
 * Compara nuestra probabilidad estimada (modelo propio) contra la implícita
 * en la cuota de mercado. Devuelve el "edge" en puntos porcentuales y
 * una clasificación para la UI (verde/ámbar/rojo).
 */
export function calculateEdge(
  ourProbPct: number,
  marketOdds: number
): { edgePct: number; valueType: ValueType } {
  const impliedPct = impliedProbability(marketOdds);
  const edgePct = Math.round((ourProbPct - impliedPct) * 10) / 10;

  let valueType: ValueType = "novalue";
  if (edgePct >= 5) valueType = "value";
  else if (edgePct >= 1) valueType = "caution";

  return { edgePct, valueType };
}

/**
 * Criterio de Kelly fraccionado (moderado), con tope estricto de banca por partido.
 *
 * @param ourProbPct probabilidad estimada propia, en % (ej 60 = 60%)
 * @param decimalOdds cuota decimal de mercado (ej 2.15)
 * @param bankroll banca total disponible
 * @param fraction fracción de Kelly a usar (0.15 = 15%, "moderado")
 * @param capPct tope máximo de banca por partido, en fracción (0.03 = 3%)
 */
export function kellyStake(
  ourProbPct: number,
  decimalOdds: number,
  bankroll: number,
  fraction = 0.15,
  capPct = 0.03
): { stake: number; kellyFraction: number; capped: boolean } {
  const p = ourProbPct / 100;
  const b = decimalOdds - 1; // ganancia neta por unidad apostada
  if (b <= 0 || p <= 0) return { stake: 0, kellyFraction: 0, capped: false };

  const q = 1 - p;
  const fullKelly = (b * p - q) / b;
  const fractionalKelly = Math.max(0, fullKelly * fraction);

  const uncappedStake = bankroll * fractionalKelly;
  const maxStake = bankroll * capPct;
  const capped = uncappedStake > maxStake;
  const stake = Math.min(uncappedStake, maxStake);

  return {
    stake: Math.round(stake),
    kellyFraction: Math.round(fractionalKelly * 10000) / 10000,
    capped,
  };
}

export function potentialReturn(stake: number, decimalOdds: number): number {
  return Math.round(stake * decimalOdds * 100) / 100;
}

export function potentialProfit(stake: number, decimalOdds: number): number {
  return Math.round(stake * (decimalOdds - 1) * 100) / 100;
}
