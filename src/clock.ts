// Reloj de ajedrez con incremento (estilo Fischer). Cuenta atrás por bando.

export class Clock {
  private timeMs: { w: number; b: number };
  private incrementMs: number;
  private active: "w" | "b" | null = null;
  private lastTick = 0;
  private raf = 0;
  private onUpdate: (w: number, b: number) => void;
  private onFlag: (loser: "w" | "b") => void;

  constructor(
    minutes: number,
    incrementSec: number,
    onUpdate: (w: number, b: number) => void,
    onFlag: (loser: "w" | "b") => void
  ) {
    this.timeMs = { w: minutes * 60_000, b: minutes * 60_000 };
    this.incrementMs = incrementSec * 1000;
    this.onUpdate = onUpdate;
    this.onFlag = onFlag;
    this.onUpdate(this.timeMs.w, this.timeMs.b);
  }

  /** Cambia el reloj activo al bando indicado, aplicando incremento al que acaba de mover. */
  switchTo(side: "w" | "b"): void {
    const justMoved = side === "w" ? "b" : "w";
    if (this.active === justMoved) this.timeMs[justMoved] += this.incrementMs;
    this.active = side;
    this.lastTick = performance.now();
    this.loop();
  }

  pause(): void {
    cancelAnimationFrame(this.raf);
    this.active = null;
  }

  stop(): void {
    this.pause();
  }

  private loop = (): void => {
    if (!this.active) return;
    const now = performance.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;
    this.timeMs[this.active] -= elapsed;

    if (this.timeMs[this.active] <= 0) {
      this.timeMs[this.active] = 0;
      const loser = this.active;
      this.pause();
      this.onUpdate(this.timeMs.w, this.timeMs.b);
      this.onFlag(loser);
      return;
    }
    this.onUpdate(this.timeMs.w, this.timeMs.b);
    this.raf = requestAnimationFrame(this.loop);
  };

  static format(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
