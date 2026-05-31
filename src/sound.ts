// Efectos de sonido sintetizados con la Web Audio API (sin archivos externos).

type SoundName = "move" | "capture" | "check" | "castle" | "end";

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.08): void {
  const ac = audio();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export const Sound = {
  enabled: true,
  play(name: SoundName): void {
    if (!this.enabled) return;
    try {
      switch (name) {
        case "move": beep(220, 0.08, "triangle"); break;
        case "capture": beep(150, 0.12, "sawtooth", 0.1); break;
        case "castle": beep(180, 0.1, "square", 0.07); setTimeout(() => beep(240, 0.1, "square", 0.07), 60); break;
        case "check": beep(660, 0.15, "square", 0.09); break;
        case "end":
          beep(523, 0.15); setTimeout(() => beep(392, 0.15), 130); setTimeout(() => beep(330, 0.3), 260);
          break;
      }
    } catch {
      /* el navegador puede bloquear audio sin interacción; lo ignoramos */
    }
  },
};
