import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { getTheme, ThemeMode } from "../theme/theme";
import { GlassColors } from "../theme/tokens";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: GlassColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem("sa_theme");
      if (stored === "dark" || stored === "light") {
        setMode(stored);
      } else {
        const system = Appearance.getColorScheme();
        setMode(system === "dark" ? "dark" : "light");
      }
    };
    init();
  }, []);

  const update = (value: ThemeMode) => {
    setMode(value);
    AsyncStorage.setItem("sa_theme", value).catch(() => undefined);
  };

  const toggle = () => update(mode === "dark" ? "light" : "dark");

  const value = useMemo(() => ({
    mode,
    colors: getTheme(mode),
    setMode: update,
    toggle,
    isDark: mode === "dark",
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
