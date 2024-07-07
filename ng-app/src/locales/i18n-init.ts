import { register, init, getLocaleFromNavigator } from "svelte-i18n";

// Make sure that a file with `<lang>.json` exists 
//  in the same directory, when adding it here.
export const available_languages = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  ru: "Русский",
  es: "Español",
  it: "Italiano",
  zh: "中文",
  pt: "Português",
};

for (const lang of Object.keys(available_languages)) {
  register(lang, () => import(`./${lang}.json`))
}

init({
  fallbackLocale: "en",
  initialLocale: getLocaleFromNavigator(),
});
