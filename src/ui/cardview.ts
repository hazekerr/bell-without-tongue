import { CARDS, cardCost } from '../engine/cards.ts';
import { cardArt } from '../art/index.ts';
import { h } from './dom.ts';
import { svgIcon, TYPE_ICON } from './icons.ts';

export const TYPE_NAME: Record<string, string> = { strike: 'УДАР', ward: 'ОБЕРЕГ', rite: 'ОБРЯД', debt: 'ДОЛГ' };
const GEMS: Record<string, number> = { basic: 0, common: 1, uncommon: 2, rare: 3, legend: 4 };
const BELL = '<svg viewBox="0 0 10 12"><path d="M5 0c-1 0-1.5.5-1.5 1.2C1.8 1.8 1 3.5 1 5.6v2L0 9.4h10L9 7.6v-2C9 3.5 8.2 1.8 6.5 1.2 6.5.5 6 0 5 0zM4 10h2c0 1-.5 1.8-1 1.8S4 11 4 10z"/></svg>';

export interface CardOpts {
  up?: boolean;
  scale?: number;
  costNow?: number;
  fresh?: boolean;
  returned?: boolean;
  locked?: boolean;
  noafford?: boolean;
  unplayable?: boolean;
  /** Показывать ли текст (в руке мелкие карты скрывают флейвор). */
  flavor?: boolean;
}

/** Карта: макет 120×168, масштабируется transform'ом. */
export function cardEl(id: string, o: CardOpts = {}): HTMLElement {
  const d = CARDS[id];
  const s = o.scale ?? 0.8;
  const up = !!o.up;
  const base = cardCost(id, up);
  const cost = o.costNow ?? base;
  const text = d.text(up);
  const art = document.createElement('canvas');
  art.width = 128; art.height = 80; art.className = 'art';
  art.getContext('2d')!.drawImage(cardArt(d.art, d.type), 0, 0);
  if (o.locked) art.style.filter = 'brightness(.3)';
  const cls = ['pc', d.type === 'strike' ? '' : d.type, d.rarity === 'legend' ? 'legend' : '', up ? 'up' : '', o.fresh ? 'fresh' : '', o.returned ? 'returned' : '', o.locked ? 'locked' : '', o.noafford ? 'noafford' : '', o.unplayable ? 'unplayable' : ''].filter(Boolean).join(' ');
  return h(
    'div',
    { class: 'cw', style: { width: `${120 * s}px`, height: `${168 * s}px` }, dataset: { card: id } },
    h(
      'div',
      { class: cls, style: { transform: `scale(${s})` } },
      d.type === 'debt' ? null : h('div', { class: `cst${cost < base ? ' less' : ''}`, html: `${BELL}<b>${cost}</b>` }),
      h('div', { class: 'nm' }, o.locked ? '???' : d.name + (up ? ' +' : '')),
      art,
      h('div', { class: 'ty' }, TYPE_NAME[d.type]),
      h('div', { class: 'tx' }, h('span', null, o.locked ? 'Откроется сюжетом.' : text), d.flavor && !o.locked && o.flavor ? h('em', null, d.flavor) : null),
      h('div', { class: 'gm' }, Array.from({ length: GEMS[d.rarity] }, () => h('i'))),
    ),
  );
}
export { svgIcon, TYPE_ICON };
