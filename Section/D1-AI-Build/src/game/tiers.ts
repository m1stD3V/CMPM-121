/**
 * The studio's career path: as lifetime royalties grow, the setup levels up
 * from a bedroom rig to a full record label. Tiers gate which equipment the
 * studio can see and buy, so progression and theme travel together.
 */

/** One rung on the studio's climb from bedroom to label. */
export interface StudioTier {
  /** Display name, e.g. "Home Studio". */
  name: string;
  /** One-line flavor text describing this stage of the career. */
  blurb: string;
  /** Lifetime royalties needed to reach this tier. */
  earningsRequired: number;
}

/** The studio's climb, ordered from starting setup to record label. */
export const STUDIO_TIERS: StudioTier[] = [
  {
    name: "Bedroom Setup",
    blurb: "A laptop, headphones, and a dream.",
    earningsRequired: 0,
  },
  {
    name: "Home Studio",
    blurb: "Soundproofed walls and a dedicated work desk.",
    earningsRequired: 500,
  },
  {
    name: "Project Studio",
    blurb: "Clients book sessions by the hour.",
    earningsRequired: 3000,
  },
  {
    name: "Pro Studio",
    blurb: "Charting artists walk through the door.",
    earningsRequired: 15000,
  },
  {
    name: "Record Label",
    blurb: "You sign the talent now. The money signs itself.",
    earningsRequired: 50000,
  },
];

/**
 * The tier index reached by a given amount of lifetime earnings.
 * Returns the last tier whose requirement the earnings have met.
 */
export function tierIndexFor(lifetimeEarnings: number): number {
  let index = 0;
  for (let i = 0; i < STUDIO_TIERS.length; i++) {
    if (lifetimeEarnings >= STUDIO_TIERS[i].earningsRequired) index = i;
  }
  return index;
}

/** The tier a studio has reached, plus the next rung if one remains. */
export function currentTier(lifetimeEarnings: number): {
  tier: StudioTier;
  index: number;
  next: StudioTier | null;
} {
  const index = tierIndexFor(lifetimeEarnings);
  const tier = STUDIO_TIERS[index];
  const next = index + 1 < STUDIO_TIERS.length ? STUDIO_TIERS[index + 1] : null;
  return { tier, index, next };
}
