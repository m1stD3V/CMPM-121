/**
 * Studio Clicker — lay down tracks with a click, spend the royalties on
 * studio equipment, and grow a home setup into a record label.
 */
import vinylUrl from "./assets/vinyl.svg?no-inline";
import {
  applyRoyalties,
  initialState,
  recordTrack,
  royaltiesPerSecond,
  type StudioState,
} from "./game/state.ts";
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

const studio = el(
  "section",
  "studio",
  el("h1", "studio-title", "Studio Clicker"),
  el("p", "studio-tagline", "Lay down tracks. Build the studio. Get signed."),
  recordButton,
  moneyReadout,
  moneyCaption,
  incomeReadout,
);

app.append(studio);

function render(): void {
  moneyReadout.textContent = `$${Math.floor(state.money)}`;
  incomeReadout.textContent = `$${royaltiesPerSecond(state).toFixed(2)}/sec`;
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
