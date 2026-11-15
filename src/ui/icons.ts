/* Иконки интерфейса (SVG 100×100). */
export const MOTIFS: Record<string, string> = {
  sword: `<path d="M48 2h4l2.5 62h-9z"/><rect x="36" y="62" width="28" height="5" rx="2"/><rect x="47" y="67" width="6" height="22" rx="2"/><circle cx="50" cy="92" r="4"/>`,
  axe: `<rect x="47" y="8" width="5" height="88" rx="2"/><path d="M52 14c20-6 34 4 32 20-2 14-14 20-32 18 8-8 8-30 0-38z"/>`,
  spade: `<rect x="48" y="4" width="5" height="52" rx="2"/><rect x="40" y="2" width="21" height="6" rx="3"/><path d="M33 56c0-6 8-8 17-8s17 2 17 8c0 18-10 38-17 42-7-4-17-24-17-42z"/>`,
  cross: `<path d="M42 4h16v26h26v16H58v50H42V46H16V30h26z"/><path d="M24 36l6 4M70 38l8 3" stroke="#000" stroke-width="1.2" opacity=".6" fill="none"/>`,
  tomb: `<path d="M22 96V38c0-18 12-30 28-30s28 12 28 30v58z"/><path d="M50 30v26M40 40h20" stroke="#000" stroke-width="3" opacity=".55" fill="none"/>`,
  coffin: `<path d="M34 6h32l14 32-10 56H30L20 38z"/><path d="M50 22v50M36 40h28" stroke="#000" stroke-width="2.4" opacity=".5" fill="none"/>`,
  candle: `<rect x="40" y="38" width="20" height="58" rx="3"/><path d="M50 8c8 12 10 20 0 28-10-8-8-16 0-28z"/><path d="M42 54c-4 8-2 14 2 14 2-6 2-10-2-14z" opacity=".7"/>`,
  flame: `<path d="M50 4c20 22 32 40 24 62-4 14-16 24-24 24s-20-10-24-24C18 44 32 36 38 18c4 8 8 12 12-14z"/><path d="M50 44c10 14 12 28 0 40-12-12-10-26 0-40z" opacity=".55"/>`,
  torch: `<rect x="45" y="46" width="9" height="50" rx="3"/><path d="M50 2c18 18 24 32 14 46H36C28 34 38 24 50 2z"/>`,
  bell: `<path d="M50 4c-6 0-9 4-9 8-16 6-24 22-24 40v14L8 78h84l-9-12V52c0-18-8-34-24-40 0-4-3-8-9-8z"/><path d="M40 82h20c0 10-6 14-10 14s-10-4-10-14z"/>`,
  chain: `<g fill="none" stroke="#0a0b0f" stroke-width="7"><ellipse cx="30" cy="30" rx="16" ry="9" transform="rotate(-35 30 30)"/><ellipse cx="52" cy="52" rx="16" ry="9" transform="rotate(-35 52 52)"/><ellipse cx="74" cy="74" rx="16" ry="9" transform="rotate(-35 74 74)"/></g>`,
  eye: `<path d="M4 50C20 24 36 16 50 16s30 8 46 34C80 76 64 84 50 84S20 76 4 50z"/><circle cx="50" cy="50" r="14" fill="#e0b867" opacity=".85"/><circle cx="50" cy="50" r="6"/>`,
  ribs: `<g fill="none" stroke="#0a0b0f" stroke-width="7" stroke-linecap="round"><path d="M10 96C10 40 30 10 50 10s40 30 40 86"/><path d="M26 96C26 52 38 28 50 28s24 24 24 68"/><path d="M42 96c0-30 4-46 8-46s8 16 8 46"/></g>`,
  shield: `<path d="M50 4l40 12v34c0 24-16 38-40 46C26 88 10 74 10 50V16z"/><path d="M50 14v72M24 38h52" stroke="#000" stroke-width="2" opacity=".45" fill="none"/>`,
  hood: `<path d="M50 4c-14 0-24 12-24 28 0 8 2 12-4 20-8 12-12 26-12 44h80c0-18-4-32-12-44-6-8-4-12-4-20 0-16-10-28-24-28z"/><ellipse cx="50" cy="34" rx="11" ry="14" fill="#000"/>`,
  dust: `<g>${Array.from({ length: 26 }, (_, i) => `<circle cx="${14 + ((i * 37) % 72)}" cy="${12 + ((i * 53) % 76)}" r="${1.6 + ((i * 7) % 5)}"/>`).join('')}</g><path d="M20 90c10-14 20-8 30-18s20-4 30 8l-4 10z"/>`,
  mound: `<path d="M2 96c8-32 24-48 48-48s40 16 48 48z"/><path d="M52 50c-2-14-4-26 0-40 4 0 6 6 6 12l4-10c4 0 4 8 2 14l5-6c3 2 1 8-2 12l-3 8c-3 6-8 10-12 10z"/>`,
  lantern: `<path d="M36 18h28l6 14v46l-6 10H36l-6-10V32z"/><rect x="40" y="6" width="20" height="8" rx="3"/><rect x="42" y="38" width="16" height="30" rx="4" fill="#e8a94a" opacity=".9"/>`,
  purse: `<path d="M34 24l-8-18h48l-8 18c18 10 26 30 22 50-4 14-16 22-38 22S16 88 14 74C10 54 18 34 34 24z"/><rect x="36" y="22" width="28" height="7" rx="3" fill="#000" opacity=".4"/>`,
  scroll: `<path d="M18 14c0-6 8-6 12-6h46c6 0 6 8 6 12v66c0 6-6 8-12 8H24c-8 0-10-6-10-12V30c0-8 4-16 4-16z"/><path d="M28 30h44M28 42h44M28 54h30" stroke="#000" stroke-width="2" opacity=".5" fill="none"/>`,
  drop: `<path d="M50 4C70 34 82 50 82 68c0 18-14 28-32 28S18 86 18 68C18 50 30 34 50 4z"/>`,
  wind: `<g fill="none" stroke="#0a0b0f" stroke-width="6" stroke-linecap="round"><path d="M8 34c24-4 40 0 56-8 12-6 22 4 14 12"/><path d="M8 54c30-6 50 2 66-4 14-4 18 10 6 14"/><path d="M8 74c20-2 34 2 48-2 10-3 16 6 8 12"/></g>`,
  window: `<path d="M14 96V40c0-22 16-36 36-36s36 14 36 36v56z"/><path d="M50 4v92M14 56h72M30 20c4 12 4 22 0 30M70 20c-4 12-4 22 0 30" stroke="#e8a94a" stroke-width="2" opacity=".6" fill="none"/>`,
  note: `<ellipse cx="38" cy="78" rx="17" ry="12" transform="rotate(-20 38 78)"/><rect x="50" y="10" width="6" height="64"/><path d="M56 10c16 6 22 16 20 30-6-8-12-10-20-12z"/>`,
  worm: `<path d="M10 74c10-24 22-30 34-20 8 8 14 4 22-10 8-14 18-16 24-8-6 0-12 4-14 12-6 18-22 32-40 22-6-4-12-6-18 6z"/><circle cx="86" cy="38" r="4" fill="#d7b25e"/>`,
  march: `<g>${[0, 1, 2, 3].map((i) => `<rect x="${12 + i * 20}" y="${44 - (i % 2) * 8}" width="12" height="${48 + (i % 2) * 8}" rx="6"/><circle cx="${18 + i * 20}" cy="${40 - (i % 2) * 8}" r="9"/>`).join('')}</g>`,
  iou: `<path d="M14 18h72v64H14z"/><path d="M24 34h52M24 46h52M24 58h28" stroke="#000" stroke-width="2" opacity=".5" fill="none"/><path d="M60 72c6-6 12-6 18 0" stroke="#7a1f24" stroke-width="3" fill="none"/>`,
  guilt: `<path d="M50 6c20 0 30 16 30 34 0 12-6 20-6 30 0 16 10 24 10 26H16s10-10 10-26c0-10-6-18-6-30C20 22 30 6 50 6z" opacity=".95"/>`,
};

export const svgIcon = (motif: string, cls = ''): string =>
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
