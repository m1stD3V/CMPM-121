/**
 * Studio Clicker — lay down tracks with a click, spend the royalties on
 * studio equipment, and grow a home setup into a record label.
 */
import vinylUrl from "./assets/vinyl.svg?no-inline";
import { payoutPerTrack, royaltiesPerSecond } from "./game/economy.ts";
import {
  applyRoyalties,
  initialState,
  purchaseEquipment,
  recordTrack,
  type StudioState,
} from "./game/state.ts";
import { currentTier } from "./game/tiers.ts";
import { createEquipmentList } from "./ui/equipment-list.ts";
import { el } from "./ui/elements.ts";
import "./style.css";

const app = document.querySelector<HTMLElement>("#app")!;

let state: StudioState = initialState();

const moneyReadout = el("p", "money-readout", "$0");
const moneyCaption = el("p", "money-caption", "Studio cash");

const vinylArt = el("img", "vinyl-art");
vinylArt.src = vinylUrl;
vinylArt.alt = "";

const recordButton = el("button", "vinyl-button", vinylArt);
recordButton.ariaLabel = "Record a track";
recordButton.addEventListener("click", () => {
  // One click = one take: state changes first, then the display follows it.
  state = recordTrack(state);
  render();
});

const incomeReadout = el("p", "income-readout", "$0.10/sec");

const tierName = el("p", "tier-name", "Bedroom Setup");
const tierBlurb = el("p", "tier-blurb", "");
const tierProgress = el("p", "tier-progress", "");

const equipmentList = createEquipmentList((equipmentId) => {
  // Rejected purchases change nothing; accepted ones pay for the gear.
  const attempt = purchaseEquipment(state, equipmentId);
  if (attempt.ok) state = attempt.state;
  render();
});

const studio = el(
  "section",
  "studio",
  el("h1", "studio-title", "Studio Clicker"),
  el("p", "studio-tagline", "Lay down tracks. Build the studio. Get signed."),
  recordButton,
  moneyReadout,
  moneyCaption,
  incomeReadout,
  tierName,
  tierBlurb,
  tierProgress,
  equipmentList.root,
);

app.append(studio);

function render(): void {
  moneyReadout.textContent = `$${Math.floor(state.money)}`;
  incomeReadout.textContent = `$${royaltiesPerSecond(state).toFixed(2)}/sec`;
  recordButton.ariaLabel = `Record a track ($${payoutPerTrack(state)})`;

  const { tier, next } = currentTier(state.lifetimeEarnings);
  tierName.textContent = tier.name;
  tierBlurb.textContent = tier.blurb;
  tierProgress.textContent = next
    ? `Next: ${next.name} at $${next.earningsRequired.toLocaleString()}`
    : "Top tier reached";

  equipmentList.update(state);
}

/**
 * The studio never sleeps: royalties accrue from elapsed wall-clock seconds,
 * not from the number of animation frames, so slow and fast displays earn at
 * the same rate.
 */
let lastTick = performance.now();

function tick(now: number): void {
  const elapsedSeconds = (now - lastTick) / 1000;
  lastTick = now;
  state = applyRoyalties(state, elapsedSeconds);
  render();
  requestAnimationFrame(tick);
}

requestAnimationFrame((firstTick) => {
  lastTick = firstTick;
  requestAnimationFrame(tick);
});
