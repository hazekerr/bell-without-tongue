import { CARDS, cardCost } from '../engine/cards.ts';
import { cardArt } from './art.ts';
import { h } from './dom.ts';
import { svgIcon, TYPE_ICON } from './icons.ts';

export const TYPE_NAME: Record<string, string> = { strike: 'Удар', ward: 'Оберег', rite: 'Обряд', debt: 'Долг' };
const GEMS: Record<string, number> = { basic: 0, common: 1, uncommon: 2, rare: 3, legend: 4 };

export interface CardOpts {
  up?: boolean;
  scale?: number;
  costNow?: number;
  fresh?: boolean;
  returned?: boolean;
  locked?: boolean;
  noafford?: boolean;
  unplayable?: boolean;
}

/** Карта: фиксированный макет 220×310, масштабируется transform'ом. */
export function cardEl(id: string, o: CardOpts = {}): HTMLElement {
  const d = CARDS[id];
  const s = o.scale ?? 0.5;
  const up = !!o.up;
  const base = cardCost(id, up);
  const cost = o.costNow ?? base;
  const text = d.text(up);
  const el = h(
    'div',
    { class: 'cw', style: { width: `${220 * s}px`, height: `${310 * s}px` }, dataset: { card: id } },
    h(
      'div',
      {
        class: [
          'card', d.type, d.rarity === 'legend' ? 'legend' : '', up ? 'up' : '', d.name.length > 17 ? 'long' : '', text.length > 78 ? 'dense' : '',
          o.fresh ? 'fresh' : '', o.returned ? 'returned' : '', o.locked ? 'locked' : '', o.noafford ? 'noafford' : '', o.unplayable ? 'unplayable' : '',
        ].filter(Boolean).join(' '),
        style: { transform: `scale(${s})` },
      },
      h(
        'div',
        { class: 'in' },
        d.type === 'debt' ? null : h('div', { class: `cost${cost < base ? ' less' : ''}` }, String(cost)),
        h('div', { class: 'nm' }, o.locked ? '???' : d.name + (up ? ' +' : '')),
        h('div', { class: 'art', html: cardArt(id, up) }),
        h('div', { class: 'ty' }, h('span', { html: svgIcon(TYPE_ICON[d.type], 'sig-big') }), TYPE_NAME[d.type]),
        h('div', { class: 'tx' }, o.locked ? 'Откроется сюжетом.' : text, d.flavor && !o.locked && s > 0.8 ? h('em', null, d.flavor) : null),
        h('div', { class: 'gems' }, Array.from({ length: GEMS[d.rarity] }, () => h('i'))),
      ),
    ),
  );
  return el;
}
