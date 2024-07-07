import { register, init, getLocaleFromNavigator } from "svelte-i18n";

register("en", () => import("./en.json"));
register("de", () => import("./de.json"));
register("fr", () => import("./fr.json"));
register("ru", () => import("./ru.json"));
register("es", () => import("./es.json"));
register("it", () => import("./it.json"));
register("zh", () => import("./zh.json"));
register("pt", () => import("./pt.json"));

init({
  fallbackLocale: "en",
  initialLocale: getLocaleFromNavigator(),
});
