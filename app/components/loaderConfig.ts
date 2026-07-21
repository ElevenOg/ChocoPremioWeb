// Tiempo mínimo (ms) que el loader permanece visible en TODAS las
// pantallas: Intro, Game, Result, Claim.
export const MIN_LOADING_MS = 900;

// markNavStart() se llama justo cuando el usuario dispara la
// navegación (click en "Jugar", "Volver a intentar", etc.).
// consumeNavStart() se llama en la pantalla destino y calcula el
// tiempo restante DESDE ESE CLICK, no desde que el componente montó.
// Así el loader no "reinicia" su cuenta al llegar - el total visible
// (clic -> contenido listo) es siempre MIN_LOADING_MS, sin importar
// cuánto tardó la descarga del chunk de la ruta.
const NAV_KEY = "nav_started_at";

export function markNavStart() {
  try {
    sessionStorage.setItem(NAV_KEY, String(Date.now()));
  } catch {
    // noop
  }
}

export function consumeNavStart(): number {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (raw) {
      sessionStorage.removeItem(NAV_KEY);
      return parseInt(raw, 10);
    }
  } catch {
    // noop
  }
  return Date.now();
}