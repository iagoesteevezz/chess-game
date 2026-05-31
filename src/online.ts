// Modo online 2 jugadores mediante WebRTC (PeerJS), sin servidor propio:
// usa el broker público de PeerJS solo para el "apretón de manos" inicial.
// El anfitrión juega con blancas; el invitado, con negras.

import Peer, { type DataConnection } from "peerjs";

export interface MovePayload {
  type: "move";
  from: string;
  to: string;
  promotion?: string;
}
export interface ControlPayload {
  type: "reset" | "hello";
}
type Payload = MovePayload | ControlPayload;

export interface OnlineHandlers {
  onStatus: (msg: string) => void;
  onColor: (color: "w" | "b") => void;
  onMove: (m: MovePayload) => void;
  onReset: () => void;
}

const PREFIX = "ajedrez-"; // espacio de nombres en el broker de PeerJS

export class Online {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private handlers: OnlineHandlers;
  color: "w" | "b" = "w";
  connected = false;

  constructor(handlers: OnlineHandlers) {
    this.handlers = handlers;
  }

  /** Crea una sala y devuelve el código que debe compartir el anfitrión. */
  host(): string {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.color = "w";
    this.handlers.onColor("w");
    this.peer = new Peer(PREFIX + code);
    this.handlers.onStatus(`Sala ${code} — esperando rival…`);
    this.peer.on("connection", (c) => this.bind(c));
    this.peer.on("error", (e) => this.handlers.onStatus(`Error: ${e.type}`));
    return code;
  }

  /** Se une a una sala existente con su código. */
  join(code: string): void {
    this.color = "b";
    this.handlers.onColor("b");
    this.peer = new Peer();
    this.handlers.onStatus(`Conectando a ${code}…`);
    this.peer.on("open", () => {
      const c = this.peer!.connect(PREFIX + code.trim().toUpperCase());
      this.bind(c);
    });
    this.peer.on("error", (e) => this.handlers.onStatus(`Error: ${e.type}`));
  }

  private bind(c: DataConnection): void {
    this.conn = c;
    c.on("open", () => {
      this.connected = true;
      this.handlers.onStatus(
        `Conectado · juegas con ${this.color === "w" ? "blancas" : "negras"}`
      );
      this.send({ type: "hello" });
    });
    c.on("data", (data) => {
      const p = data as Payload;
      if (p.type === "move") this.handlers.onMove(p);
      else if (p.type === "reset") this.handlers.onReset();
    });
    c.on("close", () => {
      this.connected = false;
      this.handlers.onStatus("Rival desconectado");
    });
  }

  send(p: Payload): void {
    if (this.conn && this.connected) this.conn.send(p);
  }

  sendMove(from: string, to: string, promotion?: string): void {
    this.send({ type: "move", from, to, promotion });
  }

  close(): void {
    this.conn?.close();
    this.peer?.destroy();
    this.connected = false;
  }
}
