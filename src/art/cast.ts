/* Герои и враги: каждый нарисован вручную. Силуэт, лицо, детали и характерный предмет у каждого свои. */
import { cloak, makeSprite, type SpriteDef } from './pixel.ts';

const rep = (ch: string, n: number) => ch.repeat(n);
const col = (ch: string, n: number) => Array.from({ length: n }, () => ch);

/* ───── Могильщик (герой) ───── */
const gravedigger: SpriteDef = {
  id: 'gravedigger', rim: 'right', hem: 38, tatter: 3, seed: 4,
  layers: [
    {
      y: 0,
      half: [
        'ddd', 'dcccc', 'dccCCC', 'dccCCCC', 'ddooOOOOO', 'cccccccccc', 'ddddddddddd',
        '.dffFffff', '.dfggggg', '.dgGGGGg', '.drrRRRR',
      ],
    },
    { y: 11, half: cloak({ y0: 0, y1: 37, hw0: 8, hw1: 12, curve: 0.8, folds: 1.1, seed: 5, pal: 'wWoO' }) },
    // шрам-колокол светится сквозь пальто
    { x: 9, y: 18, rows: ['.a.', 'aAa', 'aaa', 'a.a'] },
    // ремень и пряжка
    { x: 6, y: 30, rows: ['WWWWWWWWWWW', 'wwwwOOwwwww'] },
    // лопата на плече, лезвие кверху
    { x: 0, y: 3, rows: ['.MMMM.', 'MMsMMM', 'MsMMMm', 'MMMMMm', '.MMMm.', '..WW..'] },
    ...Array.from({ length: 30 }, (_, i) => ({ x: 2, y: 9 + i, rows: ['WW'] })),
    // рука и фонарь
    { x: 22, y: 25, rows: ['.W.', '.W.'] },
    { x: 20, y: 27, rows: ['.OOO.', 'OaAaO', 'OAyAO', 'OaAaO', '.OOO.'] },
    { x: 19, y: 25, rows: ['bb'] },
  ],
};

/* ───── Свечница (герой) ───── */
const wickkeeper: SpriteDef = {
  id: 'wickkeeper', rim: 'right', hem: 36, tatter: 3, seed: 9,
  layers: [
    { y: 0, half: ['y..y..y', 'A..A..A', 'b..b..b', 'B..B..B', '..ddddddd', '.dcccccCC', 'dccCCCCCh', 'dcCffffff', 'dcCffYfff', 'dcCCfffff', 'dccCCfffff'] },
    { y: 11, half: cloak({ y0: 0, y1: 35, hw0: 7, hw1: 11, curve: 0.9, folds: 1.0, seed: 8, pal: 'dcvV' }) },
    // воск на плечах
    { x: 4, y: 12, rows: ['b.', 'bB', '.b'] },
    { x: 16, y: 13, rows: ['.b', 'Bb', 'b.'] },
    { x: 7, y: 22, rows: ['aa', 'aA'] },
    // посох с горящей свечой
    ...Array.from({ length: 30 }, (_, i) => ({ x: 23, y: 16 + i, rows: ['W'] })),
    { x: 22, y: 8, rows: ['.y.', 'yAy', '.A.', 'bbb', 'bBb', 'bbB'] },
    { x: 21, y: 14, rows: ['bWb'] },
    { x: 21, y: 22, rows: ['bb'] },
  ],
};

/* ───── Утопленница-прачка ───── */
const sheetRows: string[] = (() => {
  const rows: string[] = [];
  for (let y = 0; y < 20; y++) {
    const w = 8 + (y % 3 === 0 ? 0 : 1);
    let s = '';
    for (let x = 0; x < w; x++) s += (x + y) % 5 === 0 ? 's' : (x * 3 + y) % 7 === 0 ? 'i' : 'S';
    rows.push(s);
  }
  rows.push('.i...i..', '.i.......');
  return rows;
})();
const laundress: SpriteDef = {
  id: 'laundress', rim: 'left', hem: 30, tatter: 4, seed: 12,
  layers: [
    { y: 0, half: ['..dddddd', '.dccccCCC', 'dccCCcGGG', 'dcCcGGqqq', 'dcCcGqqqq', 'dcCcGqqqq', 'dcCcGGqqq', 'dccCcGGqq', 'dccCccGGq', 'dccCCccGG'] },
    { y: 10, half: cloak({ y0: 0, y1: 33, hw0: 8, hw1: 12, curve: 0.8, folds: 0.9, seed: 21, pal: 'dcgG' }) },
    // длинные мокрые волосы по бокам
    ...[0, 1].flatMap((k) => Array.from({ length: 28 }, (_, i) => ({ x: k === 0 ? 1 : 20, y: 10 + i, rows: [i % 4 === 0 ? 'cc' : 'dd'] }))),
    // один глаз виден, второй пустая глазница
    { x: 8, y: 5, rows: ['H'] },
    { x: 14, y: 5, rows: ['f'] },
    { x: 10, y: 8, rows: ['ffff'] },
    // отжатая простыня в руках
    { x: 0, y: 17, rows: sheetRows },
    { x: 5, y: 17, rows: ['qq', 'qq'] },
    { x: 6, y: 20, rows: ['qq'] },
    { x: 15, y: 19, rows: ['qq', 'qq'] },
    // капли
    { x: 3, y: 38, rows: ['i', '', 'i'] },
  ],
};

/* ───── Свечник ───── */
const candleBearer: SpriteDef = {
  id: 'candle', rim: 'left', hem: 20, tatter: 2, seed: 15,
  layers: [
    { y: 0, half: ['y', 'A', 'aA', 'a', 'k', 'bb', 'bBb', 'bbBb', 'bFbb', 'bBbb', 'bbbbb', 'bBbbb', 'bbbb'] },
    { y: 13, half: cloak({ y0: 0, y1: 16, hw0: 6, hw1: 9, curve: 0.9, folds: 1.3, seed: 2, pal: 'dcvV' }) },
    { x: 1, y: 14, rows: ['bb', 'bb'] },
    { x: 15, y: 15, rows: ['bb', 'bb'] },
    { x: 15, y: 13, rows: ['W', 'W', 'W'] },
    { x: 14, y: 11, rows: ['.y.', 'yAy'] },
    { x: 3, y: 12, rows: ['b'] },
    { x: 14, y: 9, rows: ['b'] },
  ],
};

/* ───── Утонувший звонарь: вместо головы колокол без языка ───── */
const bellman: SpriteDef = {
  id: 'bellman', rim: 'left', hem: 38, tatter: 3, seed: 33,
  layers: [
    {
      y: 0,
      half: [
        '........OO', '.......oOA', '.....ooOAA', '....oOOAAA', '...ooOAAyA', '...oOOAAAA', '..ooOOAAAA', '..oOOAAAAA',
        '.ooOOAAAAA', '.oOOAAAAAA', 'ooOOAAAAAA', 'oOOOAAAAAA', 'oooooooooo', '.fffffffff', '.fffffHfff', '..ffffffff',
      ],
    },
    { y: 16, half: cloak({ y0: 0, y1: 27, hw0: 7, hw1: 11, curve: 0.85, folds: 1.2, seed: 6, pal: 'dcuh' }) },
    // верёвка спускается по груди
    ...Array.from({ length: 18 }, (_, i) => ({ x: 9, y: 17 + i, rows: [i % 3 === 0 ? 'w' : 'W'] })),
    { x: 8, y: 31, rows: ['WWW', 'wWw'] },
    { x: 7, y: 20, rows: ['bbbb', 'bbbb'] },
    { x: 11, y: 24, rows: ['bbbb', 'bbbb'] },
    // обрывки цепи на поясе
    { x: 3, y: 36, rows: ['M.M.M', '.m.m.'] },
  ],
};

/* ───── Певчая ракушка ───── */
const mussel: SpriteDef = {
  id: 'mussel', rim: 'left', hem: 99, bob: 1,
  layers: [
    {
      y: 0,
      half: [
        '.......dddddd', '....dddgggGGG', '..ddgGGgGGqGG', '.dgGGgGGFGGqG', '.dgGGgGGgGGGG', 'dgGGgGGgGGGGG', 'dggGgGGgGGGGG',
        'dbBbBbBbBbBbB', 'dfffffffffff', 'dfrrrrrrrrrry', 'dfrRRRRRRRRRR', 'dBbBbBbBbBbBb', 'dgGGgGGgGGGGG', '.dgGGgGGgGGGG', '..ddgggGGGGGG', '....dddddddd',
      ],
    },
    { x: 20, y: 2, rows: ['.i', 'ii'] },
  ],
};

/* ───── Жнец Хора ───── */
const scythe = [
  '..........sSSSSw', '.......ssSSMMMmw', '....ssSSMMmm...w', '..ssSMMmm......w', '.sSMmm.........w', '.sMm...........w', 'sMm............w', 'sm.............w', 'm..............w',
];
const reaper: SpriteDef = {
  id: 'reaper', rim: 'left', hem: 34, tatter: 6, seed: 41,
  layers: [
    { y: 0, half: ['d', 'd', 'dc', 'dcc', 'dccC', 'dcccC', 'dcCCCC', 'dccCCCC', 'dcCCffff', 'dcCfEfff', 'dcCCffff', 'dcCCfbfb', 'dccCCCfff', 'dccCCCCCC'] },
    { y: 14, half: cloak({ y0: 0, y1: 37, hw0: 8, hw1: 15, curve: 0.8, folds: 1.2, seed: 17, pal: 'dcCr' }) },
    { x: 14, y: 0, rows: scythe },
    ...Array.from({ length: 44 }, (_, i) => ({ x: 29, y: 9 + i, rows: [i % 6 === 0 ? 'w' : 'W'] })),
    { x: 28, y: 24, rows: ['bBb', 'bbb'] },
    // нотный знак хориста на груди
    { x: 13, y: 19, rows: ['..aa', '..a.', 'aaa.', 'aa..'] },
    // обрывки нотных листов
    { x: 3, y: 46, rows: ['S', '.S'] },
  ],
};

export const CAST: Record<string, SpriteDef> = { gravedigger, wickkeeper, laundress, candle: candleBearer, bellman, mussel, reaper };
export const NAMES: Record<string, string> = {
  gravedigger: 'Могильщик', wickkeeper: 'Свечница', laundress: 'Утопленница-прачка', candle: 'Свечник', bellman: 'Утонувший звонарь', mussel: 'Певчая ракушка', reaper: 'Жнец Хора',
};
export const buildCast = () => Object.fromEntries(Object.entries(CAST).map(([k, d]) => [k, makeSprite(d)]));
void rep; void col;
