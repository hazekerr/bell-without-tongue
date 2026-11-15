import { type Chronicle, loadChronicle, saveChronicle, store } from '../engine/chronicle.ts';
import type { RunState } from '../engine/run.ts';
import { audio } from './audio.ts';

const RUN_KEY = 'bwt.run.v1';

export const G: { chron: Chronicle; run: RunState | null } = { chron: loadChronicle(), run: null };

export function loadRun(): RunState | null {
  const raw = store.get(RUN_KEY);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as RunState;
    // Прерванный бой/событие: откатываем ГСЧ к входу в узел, игрок заново выберет тот же узел
    if (r.active && r.resume) {
      r.rng = r.resume.rng;
      r.seenEncounters = r.seenEncounters.slice(0, r.resume.enc);
      r.seenEvents = r.seenEvents.slice(0, r.resume.ev);
      r.active = null;
    }
    return r;
  } catch {
    return null;
  }
}
export function saveRun() {
  if (G.run) store.set(RUN_KEY, JSON.stringify(G.run));
}
export function clearRun() {
  G.run = null;
  store.del(RUN_KEY);
}
export function save() {
  saveChronicle(G.chron);
  saveRun();
}

export function applySettings() {
  const s = G.chron.settings;
  document.documentElement.style.setProperty('--ts', String(s.textScale));
  document.body.classList.toggle('reduce-motion', s.reduceMotion);
  audio.setVolumes(s.music, s.sfx);
}
