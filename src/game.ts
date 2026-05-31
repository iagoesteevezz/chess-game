// Orquestación de la partida: chess.js (lógica) + BoardView (vista) + panel + extras.

import { Chess, type Square, type PieceSymbol, type Move } from "chess.js";
import { BoardView, type Cell } from "./board";
import { Sound } from "./sound";
import { Clock } from "./clock";
import { bestMove, evaluateFen } from "./ai";
import { detectOpening, bookMove } from "./openings";

interface PanelEls {
  turn: HTMLElement;
  state: HTMLElement;
  moves: HTMLElement;
  capturedTop: HTMLElement;
  capturedBottom: HTMLElement;
  clockTop: HTMLElement;
  clockBottom: HTMLElement;
  evalFill: HTMLElement;
  evalLabel: HTMLElement;
  opening: HTMLElement;
}

const SAVE_KEY = "ajedrez_saves";

export interface GameOptions {
  vsAI: boolean;
  aiDepth: number;
  clockMinutes: number; // 0 = sin reloj
  clockIncrement: number;
}

const PIECE_GLYPHS: Record<string, string> = {
  wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};
const FULL_SET: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

export class Game {
  private chess = new Chess();
  private view: BoardView;
  private panel: PanelEls;
  private promo: HTMLElement;
  private opts: GameOptions;

  private selected: Square | null = null;
  private lastMove: { from: Square; to: Square } | null = null;
  private orientation: "w" | "b" = "w";
  private redoStack: Move[] = [];
  private clock: Clock | null = null;
  private thinking = false;
  private locked = false; // partida terminada por tiempo
  private showArrows = false;
  private hintMove: { from: Square; to: Square } | null = null;
  private onlineColor: "w" | "b" | null = null; // null = no estamos online
  private applyingRemote = false;
  private sendMove: ((from: string, to: string, promo?: string) => void) | null = null;
  private annotations: string[] = []; // símbolos de análisis por jugada

  constructor(boardEl: HTMLElement, panel: PanelEls, promoEl: HTMLElement, opts: GameOptions) {
    this.panel = panel;
    this.promo = promoEl;
    this.opts = opts;
    this.view = new BoardView(boardEl, {
      legalTargets: (from) => this.legalTargets(from),
      tryMove: (from, to) => this.tryMove(from, to),
      isOwnPiece: (sq) => this.isHumanPiece(sq),
    });
    this.view.setOnSelect((sq) => {
      this.selected = sq;
      this.draw();
    });
    this.setupClock();
    this.draw();
  }

  // ---- Configuración / control ----

  newGame(opts?: Partial<GameOptions>): void {
    this.opts = { ...this.opts, ...opts };
    this.chess.reset();
    this.selected = null;
    this.lastMove = null;
    this.redoStack = [];
    this.thinking = false;
    this.locked = false;
    this.annotations = [];
    this.setupClock();
    this.draw();
  }

  flip(): void {
    this.orientation = this.orientation === "w" ? "b" : "w";
    this.draw();
  }

  setShowArrows(v: boolean): void {
    this.showArrows = v;
    this.draw();
  }

  /** Calcula la mejor jugada para la posición actual y la dibuja como flecha verde. */
  showBestMove(depth = 3): void {
    if (this.chess.isGameOver()) return;
    const mv = bestMove(this.chess.fen(), depth);
    this.hintMove = mv ? { from: mv.from as Square, to: mv.to as Square } : null;
    this.draw();
  }

  clearHint(): void {
    if (!this.hintMove) return;
    this.hintMove = null;
    this.draw();
  }

  // ---- Modo online ----

  /** Activa el modo online: fija tu color y el canal para enviar tus jugadas. */
  enableOnline(color: "w" | "b", send: (f: string, t: string, p?: string) => void): void {
    this.onlineColor = color;
    this.sendMove = send;
    this.opts.vsAI = false; // no hay IA en partidas online
    this.orientation = color; // te ves a ti mismo abajo
    this.newGame();
  }

  /** Aplica una jugada recibida del rival (sin reenviarla). */
  applyRemoteMove(from: Square, to: Square, promotion?: PieceSymbol): void {
    this.applyingRemote = true;
    this.commit(from, to, promotion);
    this.applyingRemote = false;
  }

  undo(): void {
    if (this.thinking) return;
    // En modo IA deshacemos dos medias jugadas para volver al turno humano.
    const times = this.opts.vsAI && this.chess.history().length >= 2 ? 2 : 1;
    for (let i = 0; i < times; i++) {
      const m = this.chess.undo();
      if (m) this.redoStack.push(m);
    }
    this.selected = null;
    this.lastMove = null;
    this.draw();
  }

  redo(): void {
    if (this.thinking) return;
    const times = this.opts.vsAI && this.redoStack.length >= 2 ? 2 : 1;
    for (let i = 0; i < times; i++) {
      const m = this.redoStack.pop();
      if (!m) break;
      this.chess.move(m);
      this.lastMove = { from: m.from as Square, to: m.to as Square };
    }
    this.selected = null;
    this.draw();
  }

  exportFen(): string {
    return this.chess.fen();
  }

  exportPgn(): string {
    return this.chess.pgn();
  }

  /** Carga texto que puede ser FEN o PGN. Devuelve true si tuvo éxito. */
  load(text: string): boolean {
    const trimmed = text.trim();
    try {
      if (/^[rnbqkpRNBQKP1-8/]+\s+[wb]\s/.test(trimmed)) {
        this.chess.load(trimmed);
      } else {
        this.chess.loadPgn(trimmed);
      }
    } catch {
      return false;
    }
    this.selected = null;
    this.redoStack = [];
    this.locked = false;
    this.annotations = [];
    const hist = this.chess.history({ verbose: true });
    const last = hist[hist.length - 1];
    this.lastMove = last ? { from: last.from as Square, to: last.to as Square } : null;
    this.setupClock();
    this.draw();
    return true;
  }

  /** Guarda la partida actual en localStorage. */
  save(name: string): void {
    const list = this.savedGames();
    list.unshift({ name, pgn: this.chess.pgn(), date: new Date().toISOString() });
    localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(0, 30)));
  }

  savedGames(): { name: string; pgn: string; date: string }[] {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  private setupClock(): void {
    this.clock?.stop();
    this.clock = null;
    if (this.opts.clockMinutes > 0) {
      this.clock = new Clock(
        this.opts.clockMinutes,
        this.opts.clockIncrement,
        (w, b) => this.renderClocks(w, b),
        (loser) => this.onFlag(loser)
      );
      this.clock.switchTo("w"); // arranca el reloj de las blancas
    } else {
      this.panel.clockTop.textContent = "";
      this.panel.clockBottom.textContent = "";
    }
  }

  // ---- Lógica de movimientos ----

  private isHumanPiece(sq: Square): boolean {
    const p = this.chess.get(sq);
    if (!p || p.color !== this.chess.turn()) return false;
    if (this.opts.vsAI && this.chess.turn() === "b") return false; // la IA juega negras
    if (this.onlineColor && this.chess.turn() !== this.onlineColor) return false; // no es tu turno
    return !this.thinking && !this.locked;
  }

  private legalTargets(from: Square): Square[] {
    return this.chess.moves({ square: from, verbose: true }).map((m) => m.to as Square);
  }

  private tryMove(from: Square, to: Square): boolean {
    const match = this.chess.moves({ square: from, verbose: true }).find((m) => m.to === to);
    if (!match) return false;
    if (match.promotion) {
      this.askPromotion(from, to);
      return true;
    }
    this.commit(from, to);
    return true;
  }

  private commit(from: Square, to: Square, promotion?: PieceSymbol): void {
    // Si la jugada la hace el jugador local en una partida online, la enviamos.
    if (this.onlineColor && !this.applyingRemote) this.sendMove?.(from, to, promotion);
    const move = this.chess.move({ from, to, promotion });
    this.redoStack = [];
    this.annotations = []; // las anotaciones de análisis dejan de ser válidas
    this.hintMove = null;
    this.lastMove = { from, to };
    this.selected = null;
    this.feedback(move);
    this.draw();
    this.afterMove();
  }

  private afterMove(): void {
    if (this.clock && !this.chess.isGameOver()) this.clock.switchTo(this.chess.turn());
    if (this.chess.isGameOver()) {
      this.clock?.pause();
      Sound.play("end");
      return;
    }
    if (this.opts.vsAI && this.chess.turn() === "b") this.runAI();
  }

  private runAI(): void {
    this.thinking = true;
    this.draw();

    // Niveles Media/Difícil consultan primero el libro de aperturas propio.
    if (this.opts.aiDepth >= 2) {
      const san = bookMove(this.chess.history());
      if (san) {
        setTimeout(() => {
          this.thinking = false;
          const mv = this.chess.moves({ verbose: true }).find((m) => m.san === san);
          if (mv) this.commit(mv.from as Square, mv.to as Square, mv.promotion as PieceSymbol);
        }, 200);
        return;
      }
    }

    // setTimeout para no congelar la UI mientras calcula.
    setTimeout(() => {
      const move = bestMove(this.chess.fen(), this.opts.aiDepth);
      this.thinking = false;
      if (move) this.commit(move.from as Square, move.to as Square, move.promotion as PieceSymbol);
    }, 120);
  }

  /**
   * Análisis post-partida: reproduce la partida y clasifica cada jugada
   * comparando la evaluación antes y después con búsqueda alfa-beta.
   * Devuelve un resumen con el recuento por bando.
   */
  analyze(depth = 2): { w: Record<string, number>; b: Record<string, number> } {
    const replay = new Chess();
    const verbose = this.chess.history({ verbose: true });
    this.annotations = [];
    const tally = {
      w: { "??": 0, "?": 0, "?!": 0 },
      b: { "??": 0, "?": 0, "?!": 0 },
    } as { w: Record<string, number>; b: Record<string, number> };

    for (const mv of verbose) {
      const mover = replay.turn(); // 'w' | 'b'
      const sign = mover === "w" ? 1 : -1;
      const before = evaluateFen(replay.fen(), depth); // mejor jugada disponible
      replay.move(mv);
      const after = evaluateFen(replay.fen(), depth); // resultado real
      // Pérdida en centipeones desde la óptica del que movió (positivo = empeoró).
      const loss = sign * (before - after);

      let sym = "";
      if (loss >= 300) sym = "??";
      else if (loss >= 150) sym = "?";
      else if (loss >= 70) sym = "?!";

      if (sym) tally[mover][sym]++;
      this.annotations.push(sym);
    }

    this.draw();
    return tally;
  }

  private feedback(move: Move): void {
    if (this.chess.isCheckmate() || this.chess.isDraw()) return; // el "end" suena en afterMove
    if (this.chess.isCheck()) Sound.play("check");
    else if (move.flags.includes("k") || move.flags.includes("q")) Sound.play("castle");
    else if (move.captured) Sound.play("capture");
    else Sound.play("move");
  }

  private askPromotion(from: Square, to: Square): void {
    const color = this.chess.turn();
    const set = color === "w"
      ? { q: "♕", r: "♖", b: "♗", n: "♘" }
      : { q: "♛", r: "♜", b: "♝", n: "♞" };
    this.promo.innerHTML = "";
    this.promo.classList.add("open");
    (["q", "r", "b", "n"] as PieceSymbol[]).forEach((p) => {
      const btn = document.createElement("button");
      btn.textContent = set[p];
      btn.addEventListener("click", () => {
        this.promo.classList.remove("open");
        this.commit(from, to, p);
      });
      this.promo.appendChild(btn);
    });
  }

  private checkSquare(): Square | null {
    if (!this.chess.isCheck()) return null;
    const turn = this.chess.turn();
    for (const row of this.chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === "k" && cell.color === turn) return cell.square as Square;
      }
    }
    return null;
  }

  // ---- Render ----

  private draw(): void {
    this.view.render({
      board: this.chess.board() as Cell[][],
      selected: this.selected,
      legal: this.selected ? this.legalTargets(this.selected) : [],
      lastMove: this.lastMove,
      checkSquare: this.checkSquare(),
      orientation: this.orientation,
      showArrows: this.showArrows,
      hintMove: this.hintMove,
    });
    this.updatePanel();
    this.updateCaptured();
    this.updateEval();
    this.updateOpening();
  }

  /** Barra de evaluación: proporción blanco/negro según la ventaja estimada. */
  private updateEval(): void {
    const cp = evaluateFen(this.chess.fen());
    let whitePct: number;
    let label: string;
    if (Math.abs(cp) >= 100000) {
      whitePct = cp > 0 ? 100 : 0;
      label = cp > 0 ? "Mate" : "Mate";
    } else {
      // Sigmoide para convertir centipeones en porcentaje (≈ probabilidad).
      whitePct = 100 / (1 + Math.pow(10, -cp / 400));
      const pawns = (cp / 100).toFixed(1);
      label = cp >= 0 ? `+${pawns}` : pawns;
    }
    this.panel.evalFill.style.width = `${whitePct}%`;
    this.panel.evalLabel.textContent = label;
    // El número se muestra en el lado de quien va ganando.
    this.panel.evalLabel.classList.toggle("black-lead", cp < 0);
  }

  private updateOpening(): void {
    const op = detectOpening(this.chess.history());
    this.panel.opening.textContent = op ? `${op.eco} · ${op.name}` : "";
  }

  private updatePanel(): void {
    const whiteToMove = this.chess.turn() === "w";
    this.panel.turn.textContent = this.thinking
      ? "IA pensando…"
      : whiteToMove ? "Blancas" : "Negras";

    let state = "En juego";
    if (this.chess.isCheckmate()) state = `Jaque mate — ganan ${whiteToMove ? "Negras" : "Blancas"}`;
    else if (this.chess.isStalemate()) state = "Tablas (ahogado)";
    else if (this.chess.isInsufficientMaterial()) state = "Tablas (material insuficiente)";
    else if (this.chess.isThreefoldRepetition()) state = "Tablas (triple repetición)";
    else if (this.chess.isDraw()) state = "Tablas (regla de 50)";
    else if (this.chess.isCheck()) state = "¡Jaque!";
    this.panel.state.textContent = state;

    const history = this.chess.history();
    this.panel.moves.innerHTML = "";
    const cls = (sym: string) =>
      sym === "??" ? "blunder" : sym === "?" ? "mistake" : sym === "?!" ? "inaccuracy" : "";
    const cell = (san: string | undefined, i: number) => {
      if (!san) return `<span class="san"></span>`;
      const sym = this.annotations[i] ?? "";
      return `<span class="san ${cls(sym)}">${san}<sup>${sym}</sup></span>`;
    };
    for (let i = 0; i < history.length; i += 2) {
      const li = document.createElement("li");
      li.innerHTML = cell(history[i], i) + cell(history[i + 1], i + 1);
      this.panel.moves.appendChild(li);
    }
    this.panel.moves.scrollTop = this.panel.moves.scrollHeight;
  }

  /** Piezas capturadas + ventaja material, mostradas según orientación. */
  private updateCaptured(): void {
    const remaining: Record<"w" | "b", Record<string, number>> = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };
    for (const row of this.chess.board()) {
      for (const cell of row) {
        if (cell) remaining[cell.color][cell.type]++;
      }
    }

    const valW: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const captured = (color: "w" | "b") => {
      // Piezas del color 'color' que faltan = capturadas por el rival.
      const items: string[] = [];
      let points = 0;
      (Object.keys(FULL_SET) as PieceSymbol[]).forEach((t) => {
        if (t === "k") return;
        const lost = FULL_SET[t] - remaining[color][t];
        for (let i = 0; i < lost; i++) {
          items.push(PIECE_GLYPHS[color + t.toUpperCase()]);
          points += valW[t];
        }
      });
      return { html: items.join(""), points };
    };

    const w = captured("w"); // negras se comieron estas blancas
    const b = captured("b"); // blancas se comieron estas negras
    const diff = b.points - w.points; // >0 ventaja blancas

    // El bando "de abajo" depende de la orientación.
    const bottomColor = this.orientation; // w abajo por defecto
    const topColor = bottomColor === "w" ? "b" : "w";
    const data = { w, b } as const;

    const adv = (forColor: "w" | "b") => {
      const value = forColor === "w" ? diff : -diff;
      return value > 0 ? ` <em>+${value}</em>` : "";
    };
    // Capturas mostradas junto a cada bando: las piezas que ESE bando ha capturado.
    this.panel.capturedTop.innerHTML = data[topColor === "w" ? "b" : "w"].html + adv(topColor);
    this.panel.capturedBottom.innerHTML = data[bottomColor === "w" ? "b" : "w"].html + adv(bottomColor);
  }

  private renderClocks(w: number, b: number): void {
    const bottomIsWhite = this.orientation === "w";
    const bottomMs = bottomIsWhite ? w : b;
    const topMs = bottomIsWhite ? b : w;
    this.panel.clockBottom.textContent = Clock.format(bottomMs);
    this.panel.clockTop.textContent = Clock.format(topMs);

    const turn = this.chess.turn();
    const running = !this.chess.isGameOver() && !this.locked;
    const bottomColor = this.orientation;
    const topColor = bottomColor === "w" ? "b" : "w";
    const set = (el: HTMLElement, ms: number, color: "w" | "b") => {
      el.classList.toggle("active", running && turn === color);
      el.classList.toggle("low", ms <= 10_000);
    };
    set(this.panel.clockBottom, bottomMs, bottomColor);
    set(this.panel.clockTop, topMs, topColor);
  }

  private onFlag(loser: "w" | "b"): void {
    this.panel.state.textContent = `Tiempo agotado — ganan ${loser === "w" ? "Negras" : "Blancas"}`;
    this.locked = true; // bloquea más jugadas
    Sound.play("end");
    this.draw();
  }
}
