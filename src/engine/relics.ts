export interface RelicDef {
  id: string;
  name: string;
  text: string;
  rarity: 'common' | 'elite' | 'boss';
  art: string;
  flavor: string;
}

export const RELICS: Record<string, RelicDef> = {
  bell_cord: { id: 'bell_cord', name: 'Колокольный шнурок', rarity: 'common', art: 'cord', text: 'Первый Аккорд за бой даёт +1 Дыхание.', flavor: 'Мокрый, но не рвётся.' },
  choir_robe: { id: 'choir_robe', name: 'Риза хориста', rarity: 'elite', art: 'robe', text: 'Аккорд даёт 5 Брони.', flavor: 'Пахнет воском и мышами.' },
  candle_stub: { id: 'candle_stub', name: 'Витой воск', rarity: 'common', art: 'candle', text: '+1 Дыхание в первом ходу боя.', flavor: 'Горит, пока на него смотрят.' },
  mourning_veil: { id: 'mourning_veil', name: 'Траурная вуаль', rarity: 'elite', art: 'veil', text: 'Каждый бой начинается с Страхом 1 на всех врагах.', flavor: 'Под ней все выглядят одинаково.' },
  ash_censer: { id: 'ash_censer', name: 'Кадило', rarity: 'common', art: 'censer', text: 'Накладывая Тлен, накладываешь на 1 больше.', flavor: 'Дым идёт вниз, а не вверх.' },
  rusted_key: { id: 'rusted_key', name: 'Ржавый ключ', rarity: 'common', art: 'key', text: 'В первом ходу боя возьми на 1 карту больше.', flavor: 'Ни от чего. Открывает всё.' },
  gravedigger_spade: { id: 'gravedigger_spade', name: 'Лопата Мёрка', rarity: 'common', art: 'spade', text: 'В начале боя погреби верхнюю карту колоды.', flavor: 'Мёрк просил вернуть. Не вернём.' },
  tallow: { id: 'tallow', name: 'Огарок', rarity: 'common', art: 'candle', text: 'После боя исцели 4.', flavor: 'Тёплый на ощупь, хотя давно потух.' },
  purse: { id: 'purse', name: 'Кошель утопленника', rarity: 'common', art: 'purse', text: 'Сразу получи 40 монет.', flavor: 'Монеты солёные.' },
  iron_lung: { id: 'iron_lung', name: 'Железные лёгкие', rarity: 'elite', art: 'lung', text: 'Макс. ЗДР +10.', flavor: 'Дышат сами.' },
  tide_pearl: { id: 'tide_pearl', name: 'Жемчужина прилива', rarity: 'boss', art: 'pearl', text: '+1 Дыхание каждый ход. Враги начинают бой с 3 Брони.', flavor: 'Мать Приливов отдала её, не вставая.' },
  conductors_baton: { id: 'conductors_baton', name: 'Палочка дирижёра', rarity: 'boss', art: 'baton', text: 'Каждый ход берёшь на 1 карту больше.', flavor: 'Тёплая. Недавно кто-то держал.' },
};

export const RELIC_POOL = (rarity: RelicDef['rarity']) => Object.values(RELICS).filter((r) => r.rarity === rarity);
