import { CARDS } from './cards.ts';
import { PAGES } from '../content/pages.ts';
import type { RoleId } from './types.ts';

export interface Body {
  circle: number;
  floor: number;
  cause: string; // id врага
  role: RoleId;
  epitaph: string;
  at: number;
}

export interface Settings {
  mercy: number; // 0..3
  music: number; // 0..1
  sfx: number; // 0..1
  reduceMotion: boolean;
  leftHand: boolean;
  textScale: number;
}

/** Хроника — душа. Переживает любую смерть. Здесь только знание и открытые карты, никакой силы. */
export interface Chronicle {
  v: 1;
  pages: string[];
  names: string[];
  unlocked: string[];
  roles: RoleId[];
  tolls: number;
  runs: number;
  wins: number;
  bestCircle: number;
  killedBy: Record<string, number>;
  killed: Record<string, number>;
  bodies: Body[];
  seenTalks: string[];
  seenEvents: Record<string, number>;
  /** Карты, открытые недавно: осталось забегов с повышенным весом. */
  fresh: Record<string, number>;
  disabled: string[];
  flags: Record<string, boolean>;
  settings: Settings;
  prologueDone: boolean;
  bodyPageIdx: number;
}

export const DEFAULT_SETTINGS: Settings = { mercy: 0, music: 0.7, sfx: 0.8, reduceMotion: false, leftHand: false, textScale: 1 };

export function newChronicle(): Chronicle {
  return {
    v: 1, pages: [], names: [], unlocked: [], roles: ['gravedigger', 'wickkeeper'], tolls: 0, runs: 0, wins: 0, bestCircle: 0,
    killedBy: {}, killed: {}, bodies: [], seenTalks: [], seenEvents: {}, fresh: {}, disabled: [], flags: {},
    settings: { ...DEFAULT_SETTINGS }, prologueDone: false, bodyPageIdx: 0,
  };
}

const KEY = 'bwt.chronicle.v1';

export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
  del(k: string): void;
}
export class MemoryStore implements Store {
  m = new Map<string, string>();
  get(k: string) {
    return this.m.get(k) ?? null;
  }
  set(k: string, v: string) {
    this.m.set(k, v);
  }
  del(k: string) {
    this.m.delete(k);
  }
}
class LocalStore implements Store {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* квота */
    }
  }
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* */
    }
  }
}

export let store: Store = typeof localStorage !== 'undefined' ? new LocalStore() : new MemoryStore();
export function setStore(s: Store) {
  store = s;
}

export function loadChronicle(): Chronicle {
  const raw = store.get(KEY);
  if (!raw) return newChronicle();
  try {
    const c = JSON.parse(raw) as Chronicle;
    return { ...newChronicle(), ...c, settings: { ...DEFAULT_SETTINGS, ...(c.settings ?? {}) } };
  } catch {
    return newChronicle();
  }
}

export function saveChronicle(c: Chronicle) {
  store.set(KEY, JSON.stringify(c));
}

export function exportChronicle(c: Chronicle): string {
  return JSON.stringify(c);
}
export function importChronicle(json: string): Chronicle | null {
  try {
    const c = JSON.parse(json) as Chronicle;
    if (c.v !== 1 || !Array.isArray(c.pages)) return null;
    return { ...newChronicle(), ...c };
  } catch {
    return null;
  }
}

/* ───────── API ───────── */
export function isCardUnlocked(c: Chronicle, id: string): boolean {
  const d = CARDS[id];
  if (!d) return false;
  return !!d.startUnlocked || c.unlocked.includes(id);
}

export function cardEnabled(c: Chronicle, id: string): boolean {
  return isCardUnlocked(c, id) && !c.disabled.includes(id);
}

export interface PageGrant {
  page: string;
  newCards: string[];
  newNames: string[];
  isNew: boolean;
}

/** Банкует страницу: она остаётся навсегда, даже если герой умрёт через секунду. */
export function grantPage(c: Chronicle, id: string): PageGrant | null {
  const pg = PAGES[id];
  if (!pg) return null;
  if (c.pages.includes(id)) return { page: id, newCards: [], newNames: [], isNew: false };
  c.pages.push(id);
  const newCards: string[] = [];
  for (const k of pg.unlocks ?? []) {
    if (!isCardUnlocked(c, k)) {
      c.unlocked.push(k);
      c.fresh[k] = 3;
      newCards.push(k);
    }
  }
  const newNames: string[] = [];
  for (const n of pg.names ?? []) {
    if (!c.names.includes(n)) {
      c.names.push(n);
      newNames.push(n);
    }
  }
  return { page: id, newCards, newNames, isNew: true };
}

/** Можно ли показывать страницу: все её «требует» уже найдены. */
export function pageAvailable(c: Chronicle, id: string): boolean {
  const pg = PAGES[id];
  if (!pg) return false;
  return (pg.requires ?? []).every((r) => c.pages.includes(r));
}

/** Выдать страницу только если открыты предпосылки. */
export function tryGrantPage(c: Chronicle, id: string): PageGrant | null {
  if (!pageAvailable(c, id)) return null;
  return grantPage(c, id);
}

export function unlockRole(c: Chronicle, r: RoleId) {
  if (!c.roles.includes(r)) c.roles.push(r);
}

/** После забега: уменьшает «свежесть» карт. */
export function ageFresh(c: Chronicle) {
  for (const k of Object.keys(c.fresh)) {
    c.fresh[k]--;
    if (c.fresh[k] <= 0) delete c.fresh[k];
  }
}

export function pagesByKind(c: Chronicle, kind: string): number {
  return c.pages.filter((p) => PAGES[p]?.kind === kind).length;
}
