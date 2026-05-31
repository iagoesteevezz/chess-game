// Renderizado e interacción del tablero.
// El estado del juego vive en chess.js (ver game.ts); esta capa es solo la "vista".

import type { Square } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

const PIECE_GLYPHS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

/** Celda tal y como la devuelve chess.js .board(). */
export type Cell = { square: Square; type: string; color: "w" | "b" } | null;

export interface BoardHandlers {
  /** Devuelve los destinos legales de una casilla (para resaltar). */
  legalTargets: (from: Square) => Square[];
  /** Intenta mover. Devuelve true si fue legal. */
  tryMove: (from: Square, to: Square) => boolean;
  /** ¿Hay una pieza del jugador en turno en esta casilla? */
  isOwnPiece: (sq: Square) => boolean;
}

export interface RenderState {
  board: Cell[][];
  selected: Square | null;
  legal: Square[];
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  orientation: "w" | "b";
  showArrows: boolean;
  hintMove: { from: Square; to: Square } | null;
}

export class BoardView {
  private container: HTMLElement;
  private handlers: BoardHandlers;
  private selected: Square | null = null;
  private dragFrom: Square | null = null;

  constructor(container: HTMLElement, handlers: BoardHandlers) {
    this.container = container;
    this.handlers = handlers;
  }

  /** Pinta el tablero a partir del estado actual. */
  render(state: RenderState): void {
    this.selected = state.selected;
    this.container.innerHTML = "";
    const legal = new Set(state.legal);
    const flip = state.orientation === "b";

    for (let rr = 0; rr < 8; rr++) {
      for (let ff = 0; ff < 8; ff++) {
        // Si el tablero está girado, invertimos índices de fila y columna.
        const r = flip ? 7 - rr : rr;
        const f = flip ? 7 - ff : ff;
        const sqName = `${FILES[f]}${RANKS[r]}` as Square;
        const square = document.createElement("div");
        const isLight = (r + f) % 2 === 0;
        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.square = sqName;

        if (state.selected === sqName) square.classList.add("selected");
        if (state.lastMove && (state.lastMove.from === sqName || state.lastMove.to === sqName))
          square.classList.add("last-move");
        if (state.checkSquare === sqName) square.classList.add("in-check");

        const cell = state.board[r][f];
        if (cell) {
          const span = document.createElement("span");
          span.className = `piece ${cell.color === "w" ? "white" : "black"}`;
          span.textContent = PIECE_GLYPHS[cell.color + cell.type.toUpperCase()];
          span.draggable = true;
          span.addEventListener("dragstart", (e) => this.onDragStart(e, sqName));
          span.addEventListener("dragend", (e) => this.onDragEnd(e));
          square.appendChild(span);
        }

        if (legal.has(sqName)) {
          const hint = document.createElement("span");
          hint.className = cell ? "hint capture" : "hint move";
          square.appendChild(hint);
        }

        // Coordenadas en el borde visual inferior/izquierdo (rr/ff son posición en pantalla).
        if (rr === 7) square.appendChild(this.coord("file", FILES[f]));
        if (ff === 0) square.appendChild(this.coord("rank", RANKS[r]));

        square.addEventListener("click", () => this.onClick(sqName));
        square.addEventListener("dragover", (e) => e.preventDefault());
        square.addEventListener("drop", (e) => this.onDrop(e, sqName));

        this.container.appendChild(square);
      }
    }

    const arrows: { from: Square; to: Square; color: string; id: string }[] = [];
    if (state.showArrows && state.lastMove)
      arrows.push({ ...state.lastMove, color: "rgba(255,170,40,0.85)", id: "last" });
    if (state.hintMove)
      arrows.push({ ...state.hintMove, color: "rgba(90,200,110,0.9)", id: "hint" });
    if (arrows.length) this.drawArrows(arrows, flip);
  }

  /** Dibuja una o varias flechas SVG sobre el tablero. */
  private drawArrows(
    arrows: { from: Square; to: Square; color: string; id: string }[],
    flip: boolean
  ): void {
    const center = (sq: Square): [number, number] => {
      const f = FILES.indexOf(sq[0] as (typeof FILES)[number]);
      const r = RANKS.indexOf(sq[1] as (typeof RANKS)[number]);
      const col = flip ? 7 - f : f;
      const row = flip ? 7 - r : r;
      return [col + 0.5, row + 0.5];
    };

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "arrow-layer");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.innerHTML = arrows
      .map(({ from, to, color, id }) => {
        const [x1, y1] = center(from);
        const [x2, y2] = center(to);
        return `
          <defs>
            <marker id="ah-${id}" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5"
                    orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L3,1.5 L0,3 z" fill="${color}" />
            </marker>
          </defs>
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                stroke="${color}" stroke-width="0.18"
                stroke-linecap="round" marker-end="url(#ah-${id})" />`;
      })
      .join("");
    this.container.appendChild(svg);
  }

  /** Animación de "rebote" para un movimiento ilegal. */
  bounce(sq: Square): void {
    const el = this.container.querySelector(`[data-square="${sq}"] .piece`);
    if (!el) return;
    el.classList.remove("bounce");
    void (el as HTMLElement).offsetWidth; // reinicia la animación
    el.classList.add("bounce");
  }

  private coord(kind: "file" | "rank", text: string): HTMLElement {
    const el = document.createElement("span");
    el.className = `coord ${kind}`;
    el.textContent = text;
    return el;
  }

  private onClick(sq: Square): void {
    if (this.selected) {
      if (sq === this.selected) {
        this.notifySelect(null);
        return;
      }
      const moved = this.handlers.tryMove(this.selected, sq);
      if (!moved) {
        // ¿Cambiar la selección a otra pieza propia?
        if (this.handlers.isOwnPiece(sq)) this.notifySelect(sq);
        else this.bounce(this.selected);
      }
      return;
    }
    if (this.handlers.isOwnPiece(sq)) this.notifySelect(sq);
  }

  private onDragStart(e: DragEvent, sq: Square): void {
    if (!this.handlers.isOwnPiece(sq)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer?.setData("text/plain", sq);
    e.dataTransfer!.effectAllowed = "move";
    const piece = e.target as HTMLElement;
    // Vista previa: clonamos la pieza para que el cursor lleve la imagen.
    // (No usamos el elemento original porque se oculta durante el arrastre.)
    if (e.dataTransfer && piece) {
      const ghost = piece.cloneNode(true) as HTMLElement;
      ghost.style.cssText =
        "position:absolute;top:-1000px;left:-1000px;font-size:" +
        getComputedStyle(piece).fontSize + ";";
      document.body.appendChild(ghost);
      const r = piece.getBoundingClientRect();
      e.dataTransfer.setDragImage(ghost, r.width / 2, r.height / 2);
      setTimeout(() => ghost.remove(), 0);
    }
    // Marcamos el origen SIN re-renderizar (eso cancelaría el arrastre).
    this.dragFrom = sq;
    piece.classList.add("dragging");
  }

  private onDragEnd(e: DragEvent): void {
    (e.target as HTMLElement).classList.remove("dragging");
    this.dragFrom = null;
  }

  private onDrop(e: DragEvent, to: Square): void {
    e.preventDefault();
    const from = (e.dataTransfer?.getData("text/plain") || this.dragFrom) as Square;
    if (!from || from === to) return;
    if (!this.handlers.tryMove(from, to)) this.bounce(from);
  }

  // Permite a game.ts re-renderizar con la nueva selección.
  private onSelect?: (sq: Square | null) => void;
  setOnSelect(cb: (sq: Square | null) => void): void {
    this.onSelect = cb;
  }
  private notifySelect(sq: Square | null): void {
    this.onSelect?.(sq);
  }
}
