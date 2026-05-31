import "./style.css";
import { Game, type GameOptions } from "./game";
import { Sound } from "./sound";
import { applyTheme } from "./themes";
import { Online } from "./online";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id}`);
  return el as T;
};

const panel = {
  turn: $("turn"),
  state: $("game-state"),
  moves: $("moves"),
  capturedTop: $("captured-top"),
  capturedBottom: $("captured-bottom"),
  clockTop: $("clock-top"),
  clockBottom: $("clock-bottom"),
  evalFill: $("eval-fill"),
  evalLabel: $("eval-label"),
  opening: $("opening"),
};

const readOptions = (): GameOptions => ({
  vsAI: $<HTMLInputElement>("vs-ai").checked,
  aiDepth: Number($<HTMLSelectElement>("depth").value),
  clockMinutes: Number($<HTMLSelectElement>("clock").value),
  clockIncrement: 2,
});

const game = new Game($("board"), panel, $("promo"), readOptions());

$("new-game").addEventListener("click", () => game.newGame(readOptions()));
$("undo").addEventListener("click", () => game.undo());
$("redo").addEventListener("click", () => game.redo());
$("flip").addEventListener("click", () => game.flip());

const soundBtn = $("sound");
soundBtn.addEventListener("click", () => {
  Sound.enabled = !Sound.enabled;
  soundBtn.textContent = Sound.enabled ? "🔊" : "🔇";
});

const flash = (btn: HTMLElement, text: string) => {
  const prev = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = prev), 1200);
};

$("copy-fen").addEventListener("click", (e) => {
  navigator.clipboard?.writeText(game.exportFen());
  flash(e.currentTarget as HTMLElement, "¡Copiado!");
});
$("copy-pgn").addEventListener("click", (e) => {
  navigator.clipboard?.writeText(game.exportPgn());
  flash(e.currentTarget as HTMLElement, "¡Copiado!");
});

$("save-game").addEventListener("click", (e) => {
  const name = prompt("Nombre de la partida:", `Partida ${new Date().toLocaleString()}`);
  if (name) {
    game.save(name);
    flash(e.currentTarget as HTMLElement, "¡Guardada!");
  }
});

$("load-game").addEventListener("click", () => {
  const games = game.savedGames();
  if (games.length === 0) {
    alert("No hay partidas guardadas.");
    return;
  }
  const list = games.map((g, i) => `${i + 1}. ${g.name}`).join("\n");
  const choice = prompt(`Elige una partida (número):\n${list}`, "1");
  const idx = Number(choice) - 1;
  if (games[idx] && !game.load(games[idx].pgn)) alert("No se pudo cargar la partida.");
});

$("import-game").addEventListener("click", () => {
  const text = prompt("Pega un FEN o un PGN:");
  if (text && !game.load(text)) alert("FEN/PGN no válido.");
});

// Flechas de última jugada (desactivadas por defecto).
$<HTMLInputElement>("arrows").addEventListener("change", (e) => {
  game.setShowArrows((e.target as HTMLInputElement).checked);
});

// Temas de color del tablero.
const themeSel = $<HTMLSelectElement>("theme");
applyTheme(themeSel.value);
themeSel.addEventListener("change", () => applyTheme(themeSel.value));

// Pantalla completa / modo enfoque.
const fsBtn = $("fullscreen");
const enterFocus = () => {
  document.body.classList.add("focus-mode");
  document.documentElement.requestFullscreen?.().catch(() => {});
};
const exitFocus = () => {
  document.body.classList.remove("focus-mode");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
};
fsBtn.addEventListener("click", () =>
  document.body.classList.contains("focus-mode") ? exitFocus() : enterFocus()
);
$("exit-fs").addEventListener("click", exitFocus);
// Si el usuario sale del fullscreen con Esc, quitamos también el modo enfoque.
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("focus-mode");
});

// Flecha de mejor jugada (pista del motor).
$("hint").addEventListener("click", (e) => {
  const btn = e.currentTarget as HTMLElement;
  btn.textContent = "Pensando…";
  setTimeout(() => {
    game.showBestMove();
    btn.textContent = "💡 Mejor jugada";
  }, 30);
});

// Análisis post-partida.
$("analyze").addEventListener("click", () => {
  const out = $("analysis");
  out.textContent = "Analizando…";
  setTimeout(() => {
    const t = game.analyze();
    const fmt = (s: Record<string, number>) =>
      `${s["??"]} graves · ${s["?"]} errores · ${s["?!"]} imprecisiones`;
    out.innerHTML = `<b>Blancas:</b> ${fmt(t.w)}<br><b>Negras:</b> ${fmt(t.b)}`;
  }, 30);
});

// --- Modo online (P2P con PeerJS) ---
const onlineStatus = $("online-status");
let online: Online | null = null;

const makeOnline = () =>
  new Online({
    onStatus: (msg) => (onlineStatus.textContent = msg),
    onColor: () => {},
    onMove: (m) =>
      game.applyRemoteMove(m.from as never, m.to as never, m.promotion as never),
    onReset: () => game.newGame(),
  });

$("host").addEventListener("click", () => {
  online = makeOnline();
  const code = online.host();
  game.enableOnline("w", (f, t, p) => online?.sendMove(f, t, p));
  onlineStatus.textContent = `Sala ${code} — comparte el código y espera al rival.`;
});

$("join").addEventListener("click", () => {
  const code = prompt("Código de la sala:");
  if (!code) return;
  online = makeOnline();
  online.join(code);
  game.enableOnline("b", (f, t, p) => online?.sendMove(f, t, p));
});

// Atajos de teclado: U deshacer, R rehacer, F girar.
document.addEventListener("keydown", (e) => {
  if (e.key === "u") game.undo();
  else if (e.key === "r") game.redo();
  else if (e.key === "f") game.flip();
});
