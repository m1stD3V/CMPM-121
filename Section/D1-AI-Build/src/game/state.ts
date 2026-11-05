/**
 * Studio Clicker's core numbers, kept free of DOM code so tests can exercise
 * the rules without a browser.
 *
 * The studio's only resource is money. Recording a track pays out royalties;
 * everything else in the game (equipment, staff, record deals) is built on
 * top of that flow.
 */

/** Money the studio has on hand, ready to spend. */
export interface StudioState {
  money: number;
}

/** Royalties paid out by a single recorded track at the start of the game. */
export const PAYOUT_PER_TRACK = 1;

/** Royalties per second that trickle in from music already released. */
export const BASE_ROYALTY_RATE = 0.1;

export function initialState(): StudioState {
  return { money: 0 };
}

/**
 * Record one track, paying out its royalty immediately.
 * Pure: returns a new state rather than mutating the one it was given.
 */
export function recordTrack(state: StudioState): StudioState {
  return { ...state, money: state.money + PAYOUT_PER_TRACK };
}

/**
 * Royalties earned per second. Grows as the studio acquires equipment and
 * talent; for now the only income is the baseline drip from released music.
 */
export function royaltiesPerSecond(_state: StudioState): number {
  return BASE_ROYALTY_RATE;
}

/**
 * Let `seconds` of studio time pass, crediting royalties for that period.
 * Time is measured in seconds so growth depends on elapsed time, never on
 * how often the game happens to repaint.
 */
export function applyRoyalties(
  state: StudioState,
  seconds: number,
): StudioState {
  if (seconds <= 0) return state;
  const gain = royaltiesPerSecond(state) * seconds;
  return { ...state, money: state.money + gain };
}
