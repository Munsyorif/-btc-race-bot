// BTC race bot: single-asset trend follower on 1-minute cbBTC closes.
//
// Idea: BTC trends in multi-hour legs and whipsaws on the minute. This bot only
// trades when a medium-term uptrend is confirmed on two independent readings —
// a fast EMA above a slow EMA, and a 60-minute return above a threshold — and it
// holds until the fast EMA crosses back under the slow one. It sits in cash
// through downtrends and chop, trades rarely (a round trip costs ~26 bps), and
// never uses leverage, shorts, or any clock, network or randomness: every
// decision is a pure function of the bars seen so far, so two runs agree.
//
// Parameters (round numbers, chosen on the dev window for a clear margin, not
// tuned to the last dollar): fast EMA 30 bars, slow EMA 60 bars, entry needs
// fast > slow by 10 bps and a 60-bar return above 50 bps, exit on fast < slow,
// 60-bar cooldown after an exit. Full equity in, whole position out.

import { BPS, runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST_BARS = 30;
const SLOW_BARS = 60;
const ENTRY_GAP_BPS = 10n; // fast must clear slow by this much to enter
const CONFIRM_BPS = 50n; // 60-bar return must clear this much to enter
const COOLDOWN_BARS = 60; // bars to wait after an exit before re-entering
const MAX_SLIPPAGE_BPS = 1000; // far above any 1-minute gap; fills are ~20 bps off the close
const SCALE = 1_000_000_000n; // EMA fixed-point scale (exact integer math, no floats)

// Closes so far, newest last, as raw price ints (price_scale 5).
const closes: bigint[] = [];
let fastEma: bigint | null = null; // EMA of closes, scaled by SCALE
let slowEma: bigint | null = null;
let inPosition = false;
let cooldown = 0;

/** EMA step in scaled integers: ema' = (2*close + (n-1)*ema) / (n+1). */
function emaStep(prev: bigint, close: bigint, n: number): bigint {
  const bigN = BigInt(n);
  return (2n * close * SCALE + (bigN - 1n) * prev) / (bigN + 1n);
}

/** Trailing return over `n` bars, in bps (truncated, signed), or null without the history. */
function trailingReturnBps(n: number): bigint | null {
  const i = closes.length - 1;
  if (i < n) return null;
  const now = closes[i];
  const then = closes[i - n];
  return ((now - then) * 10_000n) / then;
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    fastEma = fastEma === null ? close * SCALE : emaStep(fastEma, close, FAST_BARS);
    slowEma = slowEma === null ? close * SCALE : emaStep(slowEma, close, SLOW_BARS);

    // Warm-up bars build history only: orders on them are rejected anyway.
    if (state.warmingUp) return [];
    // Need a full slow window before the trend readings mean anything.
    if (closes.length - 1 < SLOW_BARS) return [];

    if (cooldown > 0) {
      cooldown -= 1;
      if (!inPosition) return [];
    }

    if (!inPosition) {
      const r60 = trailingReturnBps(60);
      if (r60 === null || r60 <= CONFIRM_BPS) return [];
      // fast > slow by ENTRY_GAP_BPS, exactly: fast*10000 > slow*(10000+gap).
      if (fastEma === null || slowEma === null) return [];
      if (fastEma * BPS <= slowEma * (BPS + ENTRY_GAP_BPS)) return [];
      const room = state.weightRoom(SYMBOL);
      const spend = state.cash < room ? state.cash : room;
      if (spend < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      inPosition = true;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }

    // In a position: exit the moment the fast EMA crosses back under the slow one.
    if (fastEma !== null && slowEma !== null && fastEma < slowEma) {
      const held = state.positions.get(SYMBOL);
      if (!held || held.qty === 0n) {
        inPosition = false;
        return [];
      }
      inPosition = false;
      cooldown = COOLDOWN_BARS;
      return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
