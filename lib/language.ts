import { useSyncExternalStore } from "react";
import { messages } from "./messages";

export const languages = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["hinglish", "Hinglish"],
  ["as", "অসমীয়া · Assamese"],
  ["bn", "বাংলা · Bengali"],
  ["brx", "बड़ो · Bodo"],
  ["doi", "डोगरी · Dogri"],
  ["gu", "ગુજરાતી · Gujarati"],
  ["kn", "ಕನ್ನಡ · Kannada"],
  ["ks", "کٲشُر · Kashmiri"],
  ["kok", "कोंकणी · Konkani"],
  ["mai", "मैथिली · Maithili"],
  ["ml", "മലയാളം · Malayalam"],
  ["mni", "ꯃꯤꯇꯩꯂꯣꯟ · Manipuri"],
  ["mr", "मराठी · Marathi"],
  ["ne", "नेपाली · Nepali"],
  ["or", "ଓଡ଼ିଆ · Odia"],
  ["pa", "ਪੰਜਾਬੀ · Punjabi"],
  ["sa", "संस्कृतम् · Sanskrit"],
  ["sat", "ᱥᱟᱱᱛᱟᱲᱤ · Santali"],
  ["sd", "سنڌي · Sindhi"],
  ["ta", "தமிழ் · Tamil"],
  ["te", "తెలుగు · Telugu"],
  ["ur", "اردو · Urdu"],
] as const;

let language = "en";
let initialized = false;
const listeners = new Set<() => void>();
export const availableLanguages = new Set(["en", "hi", "hinglish"]);
function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const saved = localStorage.getItem("gb-language");
    if (saved && availableLanguages.has(saved)) language = saved;
  } catch {}
  document.documentElement.lang =
    language === "hinglish" ? "hi-Latn" : language;
}
function subscribe(listener: () => void) {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setLanguage(next: string) {
  if (!availableLanguages.has(next)) return;
  language = next;
  try {
    localStorage.setItem("gb-language", next);
  } catch {}
  document.documentElement.lang = next === "hinglish" ? "hi-Latn" : next;
  document.documentElement.dir = "ltr";
  listeners.forEach((listener) => listener());
}
export function useLanguage() {
  return useSyncExternalStore(
    subscribe,
    () => language,
    () => "en",
  );
}
export function t(key: string) {
  if (language === "hinglish") return key;
  return messages[key]?.[language === "hi" ? 1 : 0] ?? key;
}
