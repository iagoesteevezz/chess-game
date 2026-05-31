// Mini-libro de aperturas. Detecta el nombre por el prefijo más largo de la
// secuencia de jugadas (en notación SAN). No es exhaustivo, cubre lo habitual.

interface Opening {
  eco: string;
  name: string;
  moves: string[];
}

// Cada entrada: secuencia SAN que identifica la apertura/variante.
const BOOK: Opening[] = [
  { eco: "A00", name: "Apertura Polaca (Sokolsky)", moves: ["b4"] },
  { eco: "A04", name: "Apertura Reti", moves: ["Nf3"] },
  { eco: "A10", name: "Apertura Inglesa", moves: ["c4"] },
  { eco: "A40", name: "Defensa moderna (1.d4 g6)", moves: ["d4", "g6"] },
  { eco: "A45", name: "Apertura de peón dama", moves: ["d4", "Nf6"] },
  { eco: "A80", name: "Defensa Holandesa", moves: ["d4", "f5"] },
  { eco: "B00", name: "Defensa Owen / poco común", moves: ["e4", "b6"] },
  { eco: "B01", name: "Defensa Escandinava", moves: ["e4", "d5"] },
  { eco: "B02", name: "Defensa Alekhine", moves: ["e4", "Nf6"] },
  { eco: "B07", name: "Defensa Pirc", moves: ["e4", "d6"] },
  { eco: "B10", name: "Defensa Caro-Kann", moves: ["e4", "c6"] },
  { eco: "B20", name: "Defensa Siciliana", moves: ["e4", "c5"] },
  { eco: "B21", name: "Siciliana, Gambito Smith-Morra", moves: ["e4", "c5", "d4"] },
  { eco: "B23", name: "Siciliana Cerrada", moves: ["e4", "c5", "Nc3"] },
  { eco: "B27", name: "Siciliana (2.Cf3)", moves: ["e4", "c5", "Nf3"] },
  { eco: "B33", name: "Siciliana Najdorf/Abierta", moves: ["e4", "c5", "Nf3", "d6", "d4"] },
  { eco: "C00", name: "Defensa Francesa", moves: ["e4", "e6"] },
  { eco: "C02", name: "Francesa, Variante del Avance", moves: ["e4", "e6", "d4", "d5", "e5"] },
  { eco: "C20", name: "Apertura del peón rey", moves: ["e4", "e5"] },
  { eco: "C23", name: "Apertura del Alfil", moves: ["e4", "e5", "Bc4"] },
  { eco: "C25", name: "Apertura Vienesa", moves: ["e4", "e5", "Nc3"] },
  { eco: "C30", name: "Gambito de Rey", moves: ["e4", "e5", "f4"] },
  { eco: "C40", name: "Defensa Philidor / Letona", moves: ["e4", "e5", "Nf3"] },
  { eco: "C42", name: "Defensa Petrov (Rusa)", moves: ["e4", "e5", "Nf3", "Nf6"] },
  { eco: "C44", name: "Apertura del peón rey (3...)", moves: ["e4", "e5", "Nf3", "Nc6"] },
  { eco: "C45", name: "Apertura Escocesa", moves: ["e4", "e5", "Nf3", "Nc6", "d4"] },
  { eco: "C46", name: "Apertura de los tres caballos", moves: ["e4", "e5", "Nf3", "Nc6", "Nc3"] },
  { eco: "C50", name: "Apertura Italiana (Giuoco Piano)", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
  { eco: "C50", name: "Italiana, Giuoco Pianissimo", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"] },
  { eco: "C55", name: "Defensa de los dos caballos", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"] },
  { eco: "C60", name: "Apertura Española (Ruy López)", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
  { eco: "C68", name: "Española, Variante del Cambio", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6"] },
  { eco: "C84", name: "Española Cerrada", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O"] },
  { eco: "D00", name: "Peón dama, Ataque Stonewall/Veresov", moves: ["d4", "d5"] },
  { eco: "D02", name: "Sistema Londres", moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"] },
  { eco: "D06", name: "Gambito de Dama", moves: ["d4", "d5", "c4"] },
  { eco: "D20", name: "Gambito de Dama Aceptado", moves: ["d4", "d5", "c4", "dxc4"] },
  { eco: "D30", name: "Gambito de Dama Declinado", moves: ["d4", "d5", "c4", "e6"] },
  { eco: "D10", name: "Defensa Eslava", moves: ["d4", "d5", "c4", "c6"] },
  { eco: "E00", name: "Apertura Catalana / India de dama", moves: ["d4", "Nf6", "c4", "e6"] },
  { eco: "E20", name: "Defensa Nimzo-India", moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"] },
  { eco: "E60", name: "Defensa India de Rey", moves: ["d4", "Nf6", "c4", "g6"] },
  { eco: "E70", name: "India de Rey clásica", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4"] },
  { eco: "A57", name: "Gambito Benko", moves: ["d4", "Nf6", "c4", "c5", "d5", "b5"] },
  { eco: "A15", name: "India inglesa", moves: ["c4", "Nf6"] },
];

/**
 * Libro de aperturas para la IA: dado el historial, devuelve una jugada SAN
 * que continúe alguna línea conocida (elegida al azar entre las que encajan).
 * Devuelve null si no hay nada en el libro (se pasa al motor de búsqueda).
 */
export function bookMove(history: string[]): string | null {
  const candidates: string[] = [];
  for (const op of BOOK) {
    if (op.moves.length <= history.length) continue;
    const prefixMatches = history.every((m, i) => op.moves[i] === m);
    if (prefixMatches) candidates.push(op.moves[history.length]);
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Devuelve {eco, name} de la apertura que mejor encaja con el historial, o null. */
export function detectOpening(history: string[]): { eco: string; name: string } | null {
  let best: Opening | null = null;
  for (const op of BOOK) {
    if (op.moves.length > history.length) continue;
    const matches = op.moves.every((m, i) => history[i] === m);
    if (matches && (!best || op.moves.length > best.moves.length)) best = op;
  }
  return best ? { eco: best.eco, name: best.name } : null;
}
