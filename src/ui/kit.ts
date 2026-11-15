import { CARDS } from '../engine/cards.ts';
import { RELICS } from '../engine/relics.ts';
import type { PageGrant } from '../engine/chronicle.ts';
import { PAGES } from '../content/pages.ts';
import type { CardInst } from '../engine/types.ts';
import { audio } from './audio.ts';
import { motifArt } from './art.ts';
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

export function sheet(content: HTMLElement | HTMLElement[], opts: { center?: boolean; onClose?: () => void; closable?: boolean } = {}) {
  const body = h('div', { class: 'body' }, ...(Array.isArray(content) ? content : [content]));
  const el = h('div', { class: `sheet${opts.center ? ' center' : ''}` }, body);
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
  const s = sheet([h('h2', { class: 'title' }, title), h('hr', { class: 'rule' }), ...text.split('\n\n').map((p) => h('p', { style: { fontSize: '18px', margin: '0 0 10px' } }, p)), btn('Понятно', 'ghost', () => s.close())], { center: true });
}

/** Крупная карта с действиями. */
export function inspectCard(c: { id: string; up?: boolean }, actions: HTMLElement[] = [], extra?: HTMLElement) {
  const big = cardEl(c.id, { up: c.up, scale: 1.2 });
  const wrap = h('div', { style: { display: 'grid', placeItems: 'center', padding: '8px 0 12px' } }, big);
  const s = sheet([wrap, extra ?? h('div'), h('div', { class: 'stack' }, ...actions, btn('Закрыть', 'ghost', () => s.close()))], { center: true });
  return s;
}

/** Выбор одной карты из списка. Возвращает индекс или null. */
export function chooseFromDeck(cards: CardInst[], title: string, confirmLabel = 'Выбрать', canCancel = true): Promise<CardInst | null> {
  return new Promise((resolve) => {
    let sel: CardInst | null = null;
    const grid = h('div', { class: 'grid-cards' });
    const ok = btn(confirmLabel, 'primary', () => { s.el.remove(); resolve(sel); });
    (ok as HTMLButtonElement).disabled = true;
    const cancel = canCancel ? btn('Назад', 'ghost', () => { s.el.remove(); resolve(null); }) : null;
    const els = new Map<number, HTMLElement>();
    const s = sheet([h('h2', { class: 'title' }, title), h('div', { style: { height: '8px' } }), grid, h('div', { style: { height: '14px' } }), h('div', { class: 'stack' }, ok, cancel)], { closable: false });
    s.body.style.maxHeight = '92%';
    for (const c of cards) {
      const el = cardEl(c.id, { up: c.up, scale: 0.46 });
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

/** Выбор одной карты из награды (id'шники). */
export function pickCard(ids: string[], title: string, skipLabel: string | null = 'Пропустить', fresh: Record<string, number> = {}): Promise<string | null> {
  return new Promise((resolve) => {
    const row = h('div', { class: 'pickrow' });
    const s = sheet([
      h('h2', { class: 'title' }, title),
      h('p', { class: 'sub' }, 'Нажми карту, чтобы рассмотреть.'),
      h('div', { style: { height: '12px' } }),
      row,
      h('div', { style: { height: '16px' } }),
      skipLabel ? btn(skipLabel, 'ghost', () => { s.el.remove(); resolve(null); }) : h('div'),
    ], { closable: false });
    for (const id of ids) {
      const el = cardEl(id, { scale: 0.56, fresh: !!fresh[id] });
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        audio.sfx('card_up');
        const ins = inspectCard({ id }, [btn('Взять', 'primary', () => { ins.el.remove(); s.el.remove(); audio.sfx('reward'); resolve(id); })]);
      });
      row.append(el);
    }
  });
}

/** Откровение страницы Хроники. */
export async function pageReveal(g: PageGrant) {
  const p = PAGES[g.page];
  if (!p) return;
  audio.sfx('page');
  await new Promise<void>((res) => {
    const kind = { spine: 'Страница истории', vision: 'Видение', body: 'Тело предшественника', event: 'Находка', chorister: 'Хорист' }[p.kind];
    const cards = g.newCards.map((id) => cardEl(id, { scale: 0.4, fresh: true }));
    const s = sheet([
      h('div', { class: 'kicker', style: { textAlign: 'center' } }, `${kind} · в Хронике`),
      h('h2', { class: 'title', style: { margin: '6px 0' } }, p.title),
      h('hr', { class: 'rule' }),
      h('div', { class: 'prose' }, ...p.text.map((t) => h('p', null, t))),
      g.newNames.length ? h('p', { class: 'newtag' }, `Имя записано: ${g.newNames.join(', ')}`) : null,
      cards.length ? h('div', null, h('p', { class: 'kicker', style: { textAlign: 'center' } }, 'Открыты карты'), h('div', { class: 'pickrow' }, ...cards)) : null,
      h('div', { style: { height: '14px' } }),
      btn('Запомнить', 'primary', () => { s.el.remove(); res(); }),
    ] as HTMLElement[], { center: true, closable: false });
  });
}

export async function pageReveals(gs: PageGrant[]) {
  for (const g of gs) await pageReveal(g);
}

/** Диалог по строчкам. */
export function dialogue(lines: HubLine[], bg?: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const who = h('div', { class: 'dlg-who' });
    const text = h('div', { class: 'dlg-text' });
    const hint = h('div', { class: 'dlg-hint' }, 'нажми');
    const box = h('div', { class: 'panel dlg-box' }, who, text, hint);
    const skip = h('button', { class: 'btn ghost dlg-skip', style: { width: 'auto', minHeight: '38px', padding: '6px 14px', fontSize: '15px' } }, 'Пропустить');
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
      if (typing) {
        tok++;
        text.textContent = lines[i].text;
        typing = false;
        return;
      }
      i++;
      if (i >= lines.length) { root.remove(); resolve(); return; }
      void show();
    };
    root.addEventListener('click', (e) => { if (e.target !== skip) next(); });
    skip.addEventListener('click', () => { tok++; root.remove(); resolve(); });
    void bg;
    void show();
  });
}

export function relicChip(id: string, big = false) {
  const r = RELICS[id];
  const el = h('button', { class: 'relic', title: `${r.name}: ${r.text}`, html: motifArt(r.art, 'rite', 80, 80), 'aria-label': r.name });
  el.addEventListener('click', () => relicSheet(id));
  void big;
  return el;
}

export function relicSheet(id: string) {
  const r = RELICS[id];
  const s = sheet([
    h('div', { class: 'relic-big' }, h('div', { class: 'relic', html: motifArt(r.art, 'rite', 120, 120) }), h('div', null, h('b', null, r.name), h('p', null, r.text))),
    h('p', { class: 'sub', style: { margin: '12px 0' } }, r.flavor),
    btn('Закрыть', 'ghost', () => s.close()),
  ], { center: true });
  return s;
}

export function cardsGrid(cards: { id: string; up?: boolean; fresh?: boolean; locked?: boolean }[], onTap?: (c: { id: string; up?: boolean }) => void, scale = 0.46) {
  const g = h('div', { class: 'grid-cards' });
  for (const c of cards) {
    const el = cardEl(c.id, { up: c.up, scale, fresh: c.fresh, locked: c.locked });
    if (onTap) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => onTap(c));
    }
    g.append(el);
  }
  return g;
}

export { clear };
export const CARD_TOTAL = Object.keys(CARDS).length;
