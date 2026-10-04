import { RU } from './i18n.ru';

/**
 * Tiny i18n: English source strings are the keys, Russian lives in i18n.ru.ts.
 * `tr()` is plain (usable in the store and in scene code); components re-render
 * on a language switch because the HUD and scenes are keyed by language.
 */
export type Lang = 'ru' | 'en';

let lang: Lang = 'ru';
export const setLang = (l: Lang) => {
  lang = l;
};
export const getLang = () => lang;

export function tr(s: string, vars?: Record<string, string | number>): string {
  let out = lang === 'ru' ? (RU[s] ?? s) : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  return out;
}

/** Russian plural helper: plural(5, 'метр', 'метра', 'метров'). */
export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
