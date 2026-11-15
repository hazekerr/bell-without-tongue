/* Остальные враги и боссы. Тела строятся генератором плаща, головы, лица и предметы нарисованы вручную. */
import { cloak, type Layer, type SpriteDef } from './pixel.ts';

const px = (x: number, y: number, ch: string): Layer => ({ x, y, rows: [ch] });
function line(x0: number, y0: number, x1: number, y1: number, ch: string): Layer[] {
  const out: Layer[] = [];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) out.push(px(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), ch));
  return out;
}
/** Растровая заготовка для организмов (пёс): рисуем эллипсы, получаем строки. */
function raster(w: number, h: number, draw: (s: (x: number, y: number, c: string) => void, e: (cx: number, cy: number, rx: number, ry: number, f: (x: number, y: number) => string) => void) => void): string[] {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const s = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
  const e = (cx: number, cy: number, rx: number, ry: number, f: (x: number, y: number) => string) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) s(x, y, f(x, y));
  };
  draw(s, e);
  return g.map((r) => r.join(''));
}

/* ───── Тинный пёс: тощая тварь из ила, ребра наружу ───── */
const houndRows = raster(48, 30, (s, e) => {
  const skin = (y: number, cy: number) => (y < cy - 2 ? 'G' : y < cy + 2 ? 'g' : 'd');
  e(27, 12, 14, 6, (_, y) => skin(y, 12));
  e(38, 13, 7, 6, (_, y) => skin(y, 13));
  e(16, 14, 7, 6, (_, y) => skin(y, 14));
  e(10, 10, 5, 5, (_, y) => skin(y, 10));
  e(5, 11, 5, 4, (_, y) => skin(y, 11));
  for (let y = 12; y <= 14; y++) for (let x = 0; x < 6; x++) s(x, y, y === 13 ? 'f' : 'g');
  for (const x of [1, 2, 3, 4]) { s(x, 12, x % 2 ? 'b' : 'B'); s(x, 14, x % 2 ? 'B' : 'b'); }
  for (const [x, y] of [[8, 3], [9, 2], [9, 3], [10, 3], [11, 4], [12, 3], [13, 4]]) s(x, y, 'g');
  s(6, 9, 'Y'); s(7, 9, 'Y');
  for (const lx of [10, 16, 33, 39]) for (let y = 17; y < 27; y++) { s(lx, y, y > 24 ? 'd' : 'g'); s(lx + 1, y, 'd'); s(lx + 2, y, y > 24 ? 'd' : 'g'); }
  for (const lx of [10, 16, 33, 39]) { s(lx - 1, 26, 'd'); s(lx + 3, 26, 'd'); }
  for (let i = 0; i < 8; i++) { s(44 + Math.floor(i * 0.5), 10 - i, 'g'); s(45 + Math.floor(i * 0.5), 10 - i, 'd'); }
  for (const rx of [19, 22, 25, 28, 31]) for (let y = 10; y <= 15; y++) s(rx, y, y === 10 ? 'B' : 'd');
  for (let x = 14; x < 44; x += 3) s(x, 5 + Math.round(Math.abs(Math.sin(x * 0.2)) * 0), 'n');
  for (const [x, y] of [[12, 21], [18, 22], [34, 20], [40, 22]]) { s(x, y + 7, 'W'); }
});
const hound: SpriteDef = { id: 'hound', rim: 'left', hem: 99, bob: 1, layers: [{ x: 0, y: 0, rows: houndRows }] };

/* ───── Каменный рыбак ───── */
const net: string[] = (() => {
  const r: string[] = [];
  for (let y = 0; y < 28; y++) { let s = ''; for (let x = 0; x < 18; x++) s += x % 5 === 0 && y % 5 === 0 ? 'S' : x % 5 === 0 || y % 5 === 0 ? 'm' : '.'; r.push(s); }
  return r;
})();
const fisher: SpriteDef = {
  id: 'fisher', rim: 'left', hem: 44, tatter: 3, seed: 18,
  layers: [
    { y: 0, half: ['ddd', 'dcccc', 'dccCCC', 'dcCCCCC', 'ddWWwWWWW', 'ccccccccccc', 'dddddddddddd', 'dgGGGGGG', 'dgGGHGG', 'dgnGGGG', 'dgGkkkk', 'dddGGGGG'] },
    { y: 12, half: cloak({ y0: 0, y1: 36, hw0: 8, hw1: 13, curve: 0.8, folds: 1.0, seed: 31, pal: 'dcuh' }) },
    { x: -9, y: 15, rows: net },
    ...line(24, 46, 38, 8, 'W'),
    ...line(38, 8, 38, 30, 's'),
    { x: 36, y: 30, rows: ['.SS.', 'SssS', '.SS.', '..s.'] },
    { x: 7, y: 11, rows: ['nn', '.n'] },
  ],
};

/* ───── Старший могильщик Альбан (элита) ───── */
const alban: SpriteDef = {
  id: 'alban', rim: 'left', hem: 56, tatter: 3, seed: 24,
  layers: [
    { y: 0, half: ['ddd', 'dcccc', 'dccCCC', 'dccCCCC', 'ddoooOOOO', 'ccccccccccc', 'ddddddddddddd', 'dBbbbbbb', 'dBbfYbbb', 'dBbfbbbb', 'dBbbbbbk', 'dBbBbBbB', 'dddBbBbb'] },
    { y: 13, half: cloak({ y0: 0, y1: 44, hw0: 10, hw1: 16, curve: 0.75, folds: 1.0, seed: 9, pal: 'dwWo' }) },
    { x: 8, y: 17, rows: ['OOOOOOO', 'O.O.O.O', '.O.O.O.'] },
    { x: 6, y: 34, rows: ['WWWWWWWWWWWWWWW', 'wwwwbbwwwwwwwww'] },
    ...Array.from({ length: 56 }, (_, i) => ({ x: 33, y: 8 + i, rows: [i % 7 === 0 ? 'w' : 'W'] })),
    { x: 30, y: 4, rows: ['WWWWWWW'] },
    { x: 29, y: 56, rows: ['.MMMMM.', 'MMsMMMM', 'MsMMMMm', 'MMMMMMm', '.MMMMm.'] },
    { x: -3, y: 28, rows: ['.OO.', 'OaAO', 'OAyO', 'OaAO', '.OO.'] },
    { x: -2, y: 22, rows: ['.', 'W', 'W', 'W', 'W', 'W'] },
    { x: 0, y: 32, rows: ['bb', 'bb'] },
  ],
};

/* ───── Пепельный монах: горит и не замечает ───── */
const flame = ['.y.', 'yAy', 'AaA', 'aaa'];
const monk: SpriteDef = {
  id: 'monk', rim: 'left', hem: 34, tatter: 4, seed: 50,
  layers: [
    { y: 0, half: ['dd', 'dccc', 'dcCCC', 'dcCCCCC', 'dccCffff', 'dcCfYbbb', 'dcCCbbbb', 'dcCCbBbB', 'dccCCCCC'] },
    { y: 9, half: cloak({ y0: 0, y1: 36, hw0: 7, hw1: 13, curve: 0.8, folds: 1.1, seed: 12, pal: 'dcCr' }) },
    ...line(22, 50, 22, 6, 'W'),
    { x: 20, y: 0, rows: flame },
    { x: 1, y: 14, rows: flame },
    { x: 18, y: 17, rows: flame },
    { x: 3, y: 30, rows: flame },
    { x: 7, y: 26, rows: ['bb', 'bb'] },
    { x: 19, y: 24, rows: ['bb', 'bb'] },
    { x: 4, y: 22, rows: ['a', '', 'A'] },
    { x: 14, y: 36, rows: ['a', '', 'a'] },
  ],
};

/* ───── Стеклянный серафим ───── */
const wing: string[] = (() => {
  const rows: string[] = [];
  const colors = ['U', 'V', 'R', 'a', 'G'];
  for (let r = 0; r < 40; r++) {
    // крыло взмывает вверх и в стороны, нижний край рваный, как перья
    const hw = Math.round(5 + 19 * Math.pow(1 - r / 40, 0.7)) - (r > 28 && r % 3 === 0 ? 4 : 0);
    let s = '';
    for (let j = 0; j < hw; j++) {
      const lead = j === 0 || (j + r) % 6 === 0 || r % 6 === 0;
      s += lead ? 'd' : colors[(Math.floor(j / 4) + Math.floor(r / 5)) % 5];
    }
    rows.push(s);
  }
  return rows;
})();
const seraph: SpriteDef = {
  id: 'seraph', rim: 'left', hem: 54, bob: 1,
  layers: [
    { y: 4, half: wing },
    { y: 0, half: ['..AAAAA', '.A.....', '.A.....', '..AAAAA'] },
    { y: 4, half: ['sSSS', 'sSSSS', 'sSSHS', 'sSSSS', 'dsSSS'] },
    { y: 9, half: cloak({ y0: 0, y1: 44, hw0: 4, hw1: 8, curve: 1.2, folds: 1.6, seed: 4, pal: 'dsSS' }) },
    { x: 15, y: 12, rows: ['.A.', 'AaA', '.A.'] },
  ],
};

/* ───── Хормейстер Оттон (босс) ───── */
const sheet = ['SSSSSS', 'SkkkkS', 'SSSSSS', 'SkkkkS', 'SSSSSS'];
const choirmaster: SpriteDef = {
  id: 'choirmaster', rim: 'left', hem: 62, tatter: 4, seed: 5,
  layers: [
    { y: 0, half: ['SS', 'sSSS', 'sSSSSS', 'ssSSSSSS', 'sSbbbbbb', 'sSbbHbbb', 'sSbbbbbb', 'sSbbbfff', 'sbbbffff', 'sbbbbbbb', 'dddbbbbb'] },
    { y: 11, half: cloak({ y0: 0, y1: 58, hw0: 9, hw1: 17, curve: 0.8, folds: 0.95, seed: 14, pal: 'drRR' }) },
    { y: 13, half: ['S', 'SS', 'SSS', 'SSSS', 'SSSSS', 'SSSSSS', 'sSSSS', 'sSSS'] },
    ...line(10, 14, -2, 2, 'r'), ...line(11, 14, -1, 2, 'R'),
    ...line(20, 14, 36, 0, 'r'), ...line(19, 14, 35, 0, 'R'),
    { x: -4, y: 0, rows: ['SS', 'SS'] },
    ...line(36, 0, 46, -10, 'W'),
    { x: 36, y: 1, rows: ['SS', 'SS'] },
    { x: 40, y: 20, rows: sheet },
    { x: -14, y: 24, rows: sheet },
    { x: 46, y: 40, rows: sheet },
    { x: 13, y: 22, rows: ['..a', '..a', 'aaa'] },
  ],
};

/* ───── Привратник Колодца (пролог) ───── */
const gatekeeper: SpriteDef = {
  id: 'gatekeeper', rim: 'left', hem: 64, tatter: 3, seed: 61,
  layers: [
    { y: 0, half: ['mmm', 'mMMMM', 'mMMsMMM', 'mMMMMMMM', 'mMMMMMMMM', 'mffffEfff', 'mMMMMMMMM', 'mmMMMMMMM'] },
    { y: 8, half: cloak({ y0: 0, y1: 60, hw0: 10, hw1: 17, curve: 0.8, folds: 0.8, seed: 22, pal: 'dmMs' }) },
    { y: 9, half: ['mmMMMMMMMMMMM', 'mMsMMMMMMMMMM', 'mMMMMMMMMMMMM'] },
    ...[18, 28, 38, 48].flatMap((y) => [{ x: 8, y, rows: ['kkkkkkkkkkkkkkkk'] } as Layer]),
    { x: 13, y: 22, rows: ['OOOO', 'O..O', 'OOOO'] },
    ...line(34, 14, 34, 62, 'o'),
    { x: 30, y: 8, rows: ['.OOO.', 'O...O', 'O...O', '.OOO.'] },
    { x: 34, y: 58, rows: ['OO', 'O.', 'OO', 'O.', 'OO'] },
    { x: -4, y: 30, rows: ['m', 'M', 'm', 'M', 'm', 'M'] },
  ],
};

/* ───── Мать Приливов (босс): тело из воды ───── */
const strands: Layer[] = (() => {
  const out: Layer[] = [];
  for (let k = 0; k < 9; k++) {
    const x0 = 4 + k * 4;
    for (let y = 10; y < 78; y++) out.push(px(x0 + Math.round(Math.sin(y * 0.2 + k) * 2), y, (y + k) % 9 === 0 ? 'S' : (y + k) % 5 === 0 ? 'i' : 's'));
  }
  return out;
})();
const tide: SpriteDef = {
  id: 'tide', rim: 'left', hem: 40, tatter: 5, seed: 77, bob: 2,
  layers: [
    { y: 0, half: ['uu', 'uUUU', 'uUiiii', 'uUiiiiii', 'uUifffff', 'uUifHfff', 'uUifffff', 'uUUiiiii'] },
    { y: 8, half: cloak({ y0: 0, y1: 70, hw0: 12, hw1: 25, curve: 0.9, folds: 0.7, seed: 8, pal: 'uUsi' }) },
    ...strands,
    { x: 14, y: -3, rows: ['G.G.G', 'gGgGg'] },
    ...[[3, 60], [40, 50], [10, 40], [44, 66], [24, 30]].flatMap(([x, y]) => [{ x, y, rows: ['.S.', 'S.S', '.S.'] } as Layer]),
    { x: 2, y: 34, rows: ['bb', 'bb'] },
    { x: 48, y: 34, rows: ['bb', 'bb'] },
  ],
};

export const CAST2: Record<string, SpriteDef> = { hound, fisher, alban, monk, seraph, choirmaster, gatekeeper, tide };
export const NAMES2: Record<string, string> = {
  hound: 'Тинный пёс', fisher: 'Каменный рыбак', alban: 'Альбан', monk: 'Пепельный монах', seraph: 'Стеклянный серафим', choirmaster: 'Хормейстер Оттон', gatekeeper: 'Привратник', tide: 'Мать Приливов',
};
