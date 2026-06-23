import type { Locale } from "@/types/platform";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
  ru: "Русский",
  ar: "العربية",
};

export const localeLabels: Record<Locale, string> = {
  en: "Build your strongest chess season yet.",
  es: "Construye tu temporada de ajedrez más fuerte.",
  fr: "Construisez votre meilleure saison d'échecs.",
  hi: "अपना सबसे मजबूत शतरंज सीज़न बनाइए।",
  ru: "Соберите свой самый сильный шахматный сезон.",
  ar: "ابنِ أقوى موسم شطرنج لديك.",
};

export function isLocale(value: string): value is Locale {
  return ["en", "es", "fr", "hi", "ru", "ar"].includes(value);
}

export function resolveLocaleFromPathname(pathname?: string | null) {
  const segment = pathname?.split("/")[1];
  return segment && isLocale(segment) ? segment : null;
}

export function withLocalePrefix(path: string, locale?: Locale | null) {
  if (!locale) {
    return path;
  }

  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
