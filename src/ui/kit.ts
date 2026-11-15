import { CARDS } from '../engine/cards.ts';
import { RELICS } from '../engine/relics.ts';
import type { PageGrant } from '../engine/chronicle.ts';
import { PAGES } from '../content/pages.ts';
import type { CardInst } from '../engine/types.ts';
import { audio } from './audio.ts';
import { iconArt } from '../art/index.ts';
import { cardEl } from './cardview.ts';
import { h, sleep, clear } from './dom.ts';
import type { HubLine } from '../content/hub.ts';

export const stage = () => document.getElementById('stage')!;

export function btn(label: string, cls: string, onClick: () => void, sub?: string) {
  const b = h('button', { class: `btn ${cls}` }, label, sub ? h('small', null, sub) : null);
  b.addEventListener('click', () => {
    audio.unlock();
    audio.sfx('tap');
    onClick();
  });
  return b;
}

export function sheet(content: HTMLElement | HTMLElement[], opts: { cls?: string; onClose?: () => void; closable?: boolean } = {}) {
  const body = h('div', { class: `body ${opts.cls ?? ''}` }, ...(Array.isArray(content) ? content : [content]));
  const el = h('div', { class: 'sheet' }, body);
  const close = () => {
    el.remove();
    opts.onClose?.();
  };
  if (opts.closable !== false) el.addEventListener('click', (e) => { if (e.target === el) close(); });
  stage().append(el);
  return { el, close, body };
}

export function toast(title: string, text: string) {
  const t = h('div', { class: 'toast' }, h('b', null, title), text);
  stage().append(t);
  setTimeout(() => t.remove(), 4200);
}

export function inspect(title: string, text: string) {
  const s = sheet([h('h2', { class: 'title-l' }, title), h('hr', { style: { borderColor: '#5a4a30' } }), ...text.split('\n\n').map((p) => h('p', { class: 'sub', style: { fontSize: '16px', margin: '0 0 8px', fontStyle: 'normal' } }, p)), btn('Понятно', 'ghost', () => s.close())], { cls: 'narrow' });
}

/** Крупная карта с действиями. */
export function inspectCard(c: { id: string; up?: boolean }, actions: HTMLElement[] = []) {
  const big = cardEl(c.id, { up: c.up, scale: 1.55, flavor: true });
  const s = sheet([h('div', { class: 'cols', style: { alignItems: 'center' } }, h('div', { style: { padding: '8px 14px 14px 8px' } }, big), h('div', { class: 'grow stack' }, h('p', { class: 'sub', style: { fontStyle: 'normal', fontSize: '15px' } }, CARDS[c.id].flavor ?? ''), ...actions, btn('Закрыть', 'ghost', () => s.close()))) ], { cls: 'narrow' });
  return s;
}

export function chooseFromDeck(cards: CardInst[], title: string, confirmLabel = 'Выбрать', canCancel = true): Promise<CardInst | null> {
  return new Promise((resolve) => {
    let sel: CardInst | null = null;
    const grid = h('div', { class: 'grid-cards' });
    const ok = btn(confirmLabel, 'primary', () => { s.el.remove(); resolve(sel); });
    (ok as HTMLButtonElement).disabled = true;
    const cancel = canCancel ? btn('Назад', 'ghost', () => { s.el.remove(); resolve(null); }) : null;
    const els = new Map<number, HTMLElement>();
    const s = sheet([h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 3 } }, title), ok, cancel ?? h('div')), grid], { cls: 'wide', closable: false });
    for (const c of cards) {
      const el = cardEl(c.id, { up: c.up, scale: 0.7 });
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        sel = c;
        els.forEach((e) => (e.style.outline = ''));
        el.style.outline = '2px solid #e8a94a';
        (ok as HTMLButtonElement).disabled = false;
        audio.sfx('card_up');
      });
      els.set(c.uid, el);
      grid.append(el);
    }
  });
}

/** Выбор карты из награды: три крупные карты в ряд. */
export function pickCard(ids: string[], title: string, skipLabel: string | null = 'Пропустить', fresh: Record<string, number> = {}): Promise<string | null> {
  return new Promise((resolve) => {
    let sel: string | null = null;
    const row = h('div', { class: 'pickrow' });
    const ok = btn('Взять', 'primary', () => { s.el.remove(); audio.sfx('reward'); resolve(sel); });
    (ok as HTMLButtonElement).disabled = true;
    const s = sheet([
      h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 2 } }, title), skipLabel ? btn(skipLabel, 'ghost', () => { s.el.remove(); resolve(null); }) : h('div'), ok),
      row,
    ], { cls: 'wide', closable: false });
    const els: HTMLElement[] = [];
    for (const id of ids) {
      const el = cardEl(id, { scale: 1.12, fresh: !!fresh[id], flavor: true });
      el.style.cursor = 'pointer';
      el.style.transition = 'transform .15s';
      el.addEventListener('click', () => {
        audio.sfx('card_up');
        sel = id;
        els.forEach((e) => { e.style.transform = ''; e.style.outline = ''; });
        el.style.transform = 'translateY(-8px)';
        el.style.outline = '2px solid #e8a94a';
        (ok as HTMLButtonElement).disabled = false;
      });
      els.push(el);
      row.append(el);
    }
  });
}

/** Откровение страницы Хроники: текст слева, открытые карты справа. */
export async function pageReveal(g: PageGrant) {
  const p = PAGES[g.page];
  if (!p) return;
  audio.sfx('page');
  await new Promise<void>((res) => {
    const kind = { spine: 'СТРАНИЦА ИСТОРИИ', vision: 'ВИДЕНИЕ', body: 'ТЕЛО ПРЕДШЕСТВЕННИКА', event: 'НАХОДКА', chorister: 'ХОРИСТ' }[p.kind];
    const cards = g.newCards.map((id) => cardEl(id, { scale: 0.8, fresh: true }));
    const s = sheet([
      h('div', { class: 'cols' },
        h('div', { class: 'grow' }, h('div', { class: 'kicker' }, `${kind} · В ХРОНИКЕ`), h('h2', { class: 'title-l', style: { margin: '2px 0 6px' } }, p.title), h('div', { class: 'prose' }, ...p.text.map((t) => h('p', null, t))), g.newNames.length ? h('p', { class: 'newtag' }, `Имя записано: ${g.newNames.join(', ')}`) : null),
        cards.length ? h('div', { style: { textAlign: 'center' } }, h('div', { class: 'kicker', style: { marginBottom: '4px' } }, 'ОТКРЫТЫ КАРТЫ'), h('div', { class: 'stack', style: { alignItems: 'center' } }, ...cards)) : h('div')),
      btn('Запомнить', 'primary', () => { s.el.remove(); res(); }),
    ] as HTMLElement[], { cls: 'wide', closable: false });
  });
}

export async function pageReveals(gs: PageGrant[]) {
  for (const g of gs) await pageReveal(g);
}

export function dialogue(lines: HubLine[]): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const who = h('div', { class: 'dlg-who' });
    const text = h('div', { class: 'dlg-text' });
    const hint = h('div', { class: 'dlg-hint' }, 'нажми');
    const box = h('div', { class: 'panel dlg-box' }, who, text, hint);
    const skip = h('button', { class: 'btn ghost dlg-skip', style: { minHeight: '26px', padding: '2px 12px' } }, 'Пропустить');
    const root = h('div', { class: 'dialog' }, skip, box);
    stage().append(root);
    let typing = false;
    let tok = 0;
    const show = async () => {
      const l = lines[i];
      const narr = l.who === 'Рассказчик';
      who.textContent = narr ? '' : l.who;
      who.className = `dlg-who${narr ? ' narr' : ''}`;
      text.className = `dlg-text${narr ? ' narr' : ''}`;
      text.textContent = '';
      typing = true;
      const my = ++tok;
      for (let k = 0; k <= l.text.length; k++) {
        if (my !== tok) return;
        text.textContent = l.text.slice(0, k);
        if (k % 3 === 0) audio.sfx('step');
        await sleep(l.text[k - 1] === '.' || l.text[k - 1] === ',' ? 70 : 16);
      }
      typing = false;
    };
    const next = () => {
      audio.unlock();
      if (typing) { tok++; text.textContent = lines[i].text; typing = false; return; }
      i++;
      if (i >= lines.length) { root.remove(); resolve(); return; }
      void show();
    };
    root.addEventListener('click', (e) => { if (e.target !== skip) next(); });
    skip.addEventListener('click', () => { tok++; root.remove(); resolve(); });
    void show();
  });
}

export function relicChip(id: string) {
  const r = RELICS[id];
  const cv = iconArt(r.art);
  const el = h('button', { class: 'relic', title: `${r.name}: ${r.text}`, 'aria-label': r.name }, cloneCanvas(cv));
  el.addEventListener('click', () => relicSheet(id));
  return el;
}

export function cloneCanvas(src: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

export function relicSheet(id: string) {
  const r = RELICS[id];
  const s = sheet([
    h('div', { class: 'relic-big' }, h('div', { class: 'relic' }, cloneCanvas(iconArt(r.art))), h('div', null, h('b', null, r.name), h('p', null, r.text))),
    h('p', { class: 'sub', style: { margin: '8px 0' } }, r.flavor),
    btn('Закрыть', 'ghost', () => s.close()),
  ], { cls: 'narrow' });
  return s;
}

export function cardsGrid(cards: { id: string; up?: boolean; fresh?: boolean; locked?: boolean }[], onTap?: (c: { id: string; up?: boolean }) => void, scale = 0.7) {
  const g = h('div', { class: 'grid-cards' });
  for (const c of cards) {
    const el = cardEl(c.id, { up: c.up, scale, fresh: c.fresh, locked: c.locked });
    if (onTap) { el.style.cursor = 'pointer'; el.addEventListener('click', () => onTap(c)); }
    g.append(el);
  }
  return g;
}

export { clear };
export const CARD_TOTAL = Object.keys(CARDS).length;
