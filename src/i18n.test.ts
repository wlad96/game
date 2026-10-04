import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RU } from './i18n.ru';
import { dataKeys } from './i18n.keys';
import { plural, setLang, tr } from './i18n';

/** Static scan for strings that reach tr(): tr('…') calls and UI-ish object/JSX props. */
function sourceKeys() {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !/test|i18n/.test(f)) files.push(p);
    }
  };
  walk(path.join(__dirname));
  const lit = `'((?:[^'\\\\]|\\\\.)*)'`;
  const pats = [new RegExp(`\\btr\\(${lit}`, 'g'), new RegExp(`\\b(?:label|title|text|sub|freeLabel|premium|toast):\\s*${lit}`, 'g'), /\b(?:text|title|status|sub|label)="([^"]+)"/g];
  const keys = new Set<string>();
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    for (const re of pats) for (const m of s.matchAll(re)) keys.add(m[1].replace(/\\'/g, "'"));
  }
  return [...keys].filter((k) => /[A-Za-z]{2}/.test(k) && k !== 'sai-universe-save-v1');
}

describe('i18n', () => {
  it('has a Russian translation for every UI string', () => {
    const missing = [...new Set([...sourceKeys(), ...dataKeys()])].filter((k) => !(k in RU));
    expect(missing).toEqual([]);
  });

  it('keeps placeholders identical', () => {
    for (const [en, ru] of Object.entries(RU)) {
      expect((ru.match(/\{\w+\}/g) ?? []).sort(), en).toEqual((en.match(/\{\w+\}/g) ?? []).sort());
    }
  });

  it('switches language and fills placeholders', () => {
    setLang('ru');
    expect(tr('Level up! You are now level {n}', { n: 3 })).toBe('Новый уровень! Теперь у тебя уровень 3');
    setLang('en');
    expect(tr('Level up! You are now level {n}', { n: 3 })).toBe('Level up! You are now level 3');
    setLang('ru');
    expect(plural(21, 'a', 'b', 'c')).toBe('a');
    expect(plural(12, 'a', 'b', 'c')).toBe('c');
  });
});
