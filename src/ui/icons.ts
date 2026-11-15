import { MOTIFS } from './art.ts';

export const svgIcon = (motif: keyof typeof MOTIFS | string, cls = ''): string =>
  `<svg viewBox="0 0 100 100" class="${cls}" aria-hidden="true">${MOTIFS[motif] ?? MOTIFS.hood}</svg>`;

export const TYPE_ICON: Record<string, string> = { strike: 'sword', ward: 'shield', rite: 'note', debt: 'iou' };
export const NODE_ICON: Record<string, string> = { fight: 'sword', elite: 'axe', event: 'eye', shop: 'purse', rest: 'candle', body: 'tomb', boss: 'bell' };
export const NODE_LABEL: Record<string, string> = { fight: 'Бой', elite: 'Элита', event: 'Событие', shop: 'Лавка', rest: 'Свеча', body: 'Тело', boss: 'Страж' };
export const INTENT_ICON: Record<string, string> = { attack: 'sword', defend: 'shield', debuff: 'drop', buff: 'flame', heal: 'drop', summon: 'hood', unknown: 'eye' };
export const STATUS_NAME: Record<string, string> = { rot: 'Тлен', bleed: 'Кровь', dread: 'Страх', chains: 'Оковы', flame: 'Пламя', toll: 'Звон' };
export const STATUS_HINT: Record<string, string> = {
  rot: 'В начале хода носителя: урон = Тлен (игнорирует Броню), затем −1.',
  bleed: 'Когда носитель атакует: получает урон = Кровь. −1 в конце хода.',
  dread: 'Атаки носителя на 25% слабее.',
  chains: 'Носитель пропустит следующее действие.',
  flame: 'Каждая единица: +1 урон ваших Ударов. Тает на 1 в конце хода.',
  toll: 'Каждая сыгранная карта… на 6 Звона колокол бьёт по всем.',
};
