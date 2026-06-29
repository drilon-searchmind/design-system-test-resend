"use client";

import { useCallback } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme/constants";

/** @typedef {import('@/lib/theme/constants').ThemeId} ThemeId */

const LIGHT_THEME = "light";

function readThemeAttr() {
  return LIGHT_THEME;
}

function getThemeSnapshot() {
  return LIGHT_THEME;
}

function getServerSnapshot() {
  return LIGHT_THEME;
}

export function useTheme() {
  return LIGHT_THEME;
}

export function setStoredTheme(_theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, LIGHT_THEME);
  } catch {}
  document.documentElement.setAttribute("data-theme", LIGHT_THEME);
}

/** @returns {() => void} */
export function useThemeToggle() {
  return useCallback(() => {
    setStoredTheme(LIGHT_THEME);
  }, []);
}
