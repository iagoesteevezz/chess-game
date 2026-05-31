// Temas de color del tablero. Se aplican cambiando variables CSS en :root.

export interface Theme {
  light: string;
  dark: string;
  accent: string;
}

export const THEMES: Record<string, Theme> = {
  Verde: { light: "#ebecd0", dark: "#739552", accent: "#b9d77e" },
  Madera: { light: "#f0d9b5", dark: "#b58863", accent: "#e8c08a" },
  Azul: { light: "#dee3e6", dark: "#5b7a99", accent: "#9bb8d3" },
  Mármol: { light: "#e8e6e1", dark: "#8a8d91", accent: "#c4c8cc" },
  Coral: { light: "#fbe8d3", dark: "#c9706b", accent: "#f0a78f" },
  Noche: { light: "#6f7785", dark: "#3a3f4b", accent: "#8ea1bf" },
};

export function applyTheme(name: string): void {
  const t = THEMES[name];
  if (!t) return;
  const root = document.documentElement.style;
  root.setProperty("--light", t.light);
  root.setProperty("--dark", t.dark);
  root.setProperty("--accent", t.accent);
}
