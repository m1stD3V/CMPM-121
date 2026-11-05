/**
 * Studio Clicker — lay down tracks with a click, spend the royalties on
 * studio equipment, and grow a home setup into a record label.
 */
import vinylUrl from "./assets/vinyl.svg?no-inline";
import { initialState, recordTrack, type StudioState } from "./game/state.ts";
import { el } from "./ui/elements.ts";
import "./style.css";

const app = document.querySelector<HTMLElement>("#app")!;

const state: StudioState = initialState();

const moneyReadout = el("p", "money-readout", "$0");
const moneyCaption = el("p", "money-caption", "Studio cash");

const vinylArt = el("img", "vinyl-art");
vinylArt.src = vinylUrl;
vinylArt.alt = "";

const recordButton = el("button", "vinyl-button", vinylArt);
recordButton.ariaLabel = "Record a track";
recordButton.addEventListener("click", () => {
  // One click = one take: state changes first, then the display follows it.
  state.money = recordTrack(state).money;
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
);

app.append(studio);

function render(): void {
  moneyReadout.textContent = `$${state.money}`;
}
