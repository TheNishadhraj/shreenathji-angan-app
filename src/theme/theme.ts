import { glass, GlassColors } from "./tokens";

export type ThemeMode = "light" | "dark";

export const getTheme = (mode: ThemeMode): GlassColors => {
  return mode === "dark" ? glass.dark : glass.light;
};
