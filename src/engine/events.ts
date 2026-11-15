import { Rng } from './rng.ts';
import { CARDS } from './cards.ts';
import { RELICS } from './relics.ts';
import { type Chronicle, type PageGrant, tryGrantPage } from './chronicle.ts';
import { type RunState, addCard, addRelic, cardChoices, pickRelic, rngOf, saveRng } from './run.ts';

export interface EventOutcome {
  text: string;
  grants?: PageGrant[];
  /** Дальнейший выбор карты в UI. */
  then?: 'remove' | 'upgrade' | 'pick';
  pickIds?: string[];
  /** Если событие убило героя. */
  died?: boolean;
  /** Пометки для UI. */
  gains?: string[];
}

export interface EventOption {
  label: string;
  hint?: string;
  /** Причина недоступности. */
  disabled?: string;
  /** Выбор открыт только при знании. */
  name?: string;
  run: () => EventOutcome;
}

export interface EventView {
  id: string;
  title: string;
  art: string;
  text: string[];
  options: EventOption[];
}

interface Rt {
  run: RunState;
  chron: Chronicle;
  rng: Rng;
}

export interface EventDef {
  id: string;
  circles: number[];
  weight: number;
  build: (rt: Rt) => Omit<EventView, 'id'>;
}

const page = (rt: Rt, ids: string[]): PageGrant[] =>
  ids.map((i) => tryGrantPage(rt.chron, i)).filter((g): g is PageGrant => !!g && g.isNew).map((g) => {
    rt.run.pagesThisRun.push(g.page);
    return g;
  });

const hurt = (rt: Rt, n: number) => {
  rt.run.hp = Math.max(0, rt.run.hp - n);
  return rt.run.hp <= 0;
};
const heal = (rt: Rt, n: number) => {
  rt.run.hp = Math.min(rt.run.maxHp, rt.run.hp + n);
};

export const EVENTS: EventDef[] = [
  {
    id: 'tin_bell', circles: [1, 2], weight: 4,
    build: (rt) => {
      const knows = rt.chron.names.includes('Тин');
      return {
        title: 'Девочка у колокола',
        art: 'tin',
        text: [
          'В затопленном нефе стоит колокол без языка. Девочка по колено в воде тянет шнур. Ни звука. Но воздух вибрирует так, словно звонят.',
          '«Если я перестану, тебя не поднимут», — говорит она, не оборачиваясь.',
        ],
        options: [
          {
            label: 'Остановить её руку', hint: 'Потеряешь 8 ЗДР. Получишь реликвию.',
            run: () => {
              const died = hurt(rt, 8);
              const r = pickRelic(rt.run, 'common', rt.rng);
              if (r && !died) addRelic(rt.run, r);
              return { text: 'Её рука холодная и лёгкая, как бумага. Колокол дрожит ещё минуту. Потом кто-то шепчет за спиной: «Ты не должен был».' + (r ? ` В кармане оказывается: ${RELICS[r].name}.` : ''), grants: page(rt, ['e_tin_ring']), died, gains: r ? [`relic:${r}`] : [] };
            },
          },
          {
            label: 'Назвать имя: «Тин»', name: 'Тин', hint: 'Бесплатный выбор из трёх карт.',
            disabled: knows ? undefined : 'Ты не знаешь её имени.',
            run: () => {
              const ids = cardChoices(rt.run, rt.chron, 'elite', rt.rng, 3);
              return { text: 'Она замирает. Впервые за триста лет шнур остаётся неподвижным. «Ты помнишь», — тихо говорит она. В воздухе остаётся чужая нота.', grants: page(rt, ['e_tin_ring', 'e_tin_named']), then: 'pick', pickIds: ids };
            },
          },
          {
            label: 'Ударить в колокол самому', hint: 'Потеряешь почти всё здоровье. Звон слышат все.',
            run: () => {
              const dmg = Math.max(0, rt.run.hp - 1);
              rt.run.hp = 1;
              void dmg;
              const r = pickRelic(rt.run, 'elite', rt.rng);
              if (r) addRelic(rt.run, r);
              return { text: 'Колокол принимает удар, как ждал его триста лет. Звук идёт по костям. Тин оборачивается и смотрит так, словно впервые тебя видит. «Ты звонишь, — говорит она. — Не я».' + (r ? ` Звон оставляет в руках: ${RELICS[r].name}.` : ''), grants: page(rt, ['e_tin_ring']), gains: r ? [`relic:${r}`] : [] };
            },
          },
          { label: 'Пройти мимо', run: () => ({ text: 'Ты уходишь. За спиной колокол всё так же не звонит.' }) },
        ],
      };
    },
  },
  {
    id: 'moneylender', circles: [1, 2], weight: 3,
    build: (rt) => ({
      title: 'Гаспар Лом',
      art: 'lender',
      text: ['На перевёрнутой лодке сидит человек с гроссбухом. Не поднимая головы: «Возвращённый? Хороший клиент. Спускаешься — значит, платёжеспособный».', 'Он листает страницу. В графе напротив твоего номера пусто. «Пока».'],
      options: [
        {
          label: 'Взять расписку: +80 монет', hint: 'В колоду добавится «Расписка Ростовщика».',
          run: () => {
            rt.run.gold += 80;
            addCard(rt.run, 'iou');
            return { text: 'Ты ставишь подпись. Она выглядит странно знакомой. Гаспар закрывает книгу: «Долги не горят. Они возвращаются вместе с тобой».', grants: page(rt, ['e_gaspar']), gains: ['gold:80', 'card:iou'] };
          },
        },
        {
          label: 'Оплатить: убрать карту (50 монет)', disabled: rt.run.gold < 50 ? 'Не хватает монет.' : undefined, hint: 'Убери карту из колоды.',
          run: () => {
            rt.run.gold -= 50;
            return { text: '«Правильный выбор. Лишнее нужно уметь хоронить».', then: 'remove', grants: page(rt, ['e_gaspar']) };
          },
        },
        { label: 'Уйти', run: () => ({ text: 'Гаспар вычёркивает что-то в книге: «В следующий раз».', grants: page(rt, ['e_gaspar']) }) },
      ],
    }),
  },
  {
    id: 'shrine', circles: [1, 2], weight: 3,
    build: (rt) => ({
      title: 'Алтарь утопленников',
      art: 'shrine',
      text: ['Двенадцать свечей — одиннадцать горят. Двенадцатая оплыла до основания и всё равно не гаснет.', 'Воск на твоих пальцах. Ты не помнишь, зачем.'],
      options: [
        { label: 'Помолиться', hint: 'Потеряешь 6 ЗДР, улучшишь карту.', run: () => { const d = hurt(rt, 6); return { text: 'Огонь приближается к ладоням сам. Не жжёт. Просто смотрит.', then: d ? undefined : 'upgrade', died: d, grants: page(rt, ['e_shrine']) }; } },
        { label: 'Задуть двенадцатую', hint: 'Получишь 60 монет и Расписку.', run: () => { rt.run.gold += 60; addCard(rt.run, 'guilt'); return { text: 'Свеча гаснет. Звука нет. Но где-то выше что-то падает. В воске остаётся несколько монет. И ощущение, что ты теперь должен.', grants: page(rt, ['e_shrine']), gains: ['gold:60', 'card:guilt'] }; } },
        { label: 'Зажечь тринадцатую', hint: 'Исцелит 20 ЗДР. Потеряешь 20 монет.', disabled: rt.run.gold < 20 ? 'Не хватает монет.' : undefined, run: () => { rt.run.gold -= 20; heal(rt, 20); return { text: 'Ты зажигаешь свечу. Она горит чуть иначе, чем остальные. Тёплее.', grants: page(rt, ['e_shrine']) }; } },
      ],
    }),
  },
  {
    id: 'scroll', circles: [1, 2], weight: 3,
    build: (rt) => ({
      title: 'Свиток Хора',
      art: 'scroll',
      text: ['Нотный лист на размокшем пюпитре. Двенадцать строчек, одиннадцать заполнены. Двенадцатая продавлена, словно кто-то писал и стёр.'],
      options: [
        { label: 'Прочесть вслух', hint: '30% — Тяжесть вины в колоду. Иначе — случайная карта.', run: () => { if (rt.rng.chance(0.3)) { addCard(rt.run, 'guilt'); return { text: 'Нота выходит из горла сама. Правильная. Пустота вокруг становится громче. Что-то легло на плечи.', grants: page(rt, ['e_scroll']), gains: ['card:guilt'] }; } const ids = cardChoices(rt.run, rt.chron, 'normal', rt.rng, 3); return { text: 'Слова оживают. Одно из них остаётся с тобой.', then: 'pick', pickIds: ids, grants: page(rt, ['e_scroll']) }; } },
        { label: 'Забрать лист', hint: '+30 монет.', run: () => { rt.run.gold += 30; return { text: 'Лист ложится в карман. Он тёплый и очень лёгкий.', grants: page(rt, ['e_scroll']), gains: ['gold:30'] }; } },
        { label: 'Положить обратно', run: () => ({ text: 'Ты кладёшь лист там, где он лежал. Нота всё равно звучит.' }) },
      ],
    }),
  },
  {
    id: 'murk_grave', circles: [1, 2], weight: 2,
    build: (rt) => ({
      title: 'Могила № 1198',
      art: 'grave',
      text: ['Дощечка: «Корвин. Копал неглубоко». Земля свежая. Хотя Корвин, по записям, лежит здесь уже сорок забегов.', 'Рядом — лопата. Чужая, но удобная.'],
      options: [
        { label: 'Выкопать', hint: 'Получишь реликвию. Потеряешь 5 ЗДР.', run: () => { const d = hurt(rt, 5); const r = pickRelic(rt.run, 'common', rt.rng); if (r && !d) addRelic(rt.run, r); return { text: 'В земле — не тело. Мешок с пряностями и тёплая пуговица. Кто-то обустроил могилу для тех, кому нужно. ' + (r ? `Берёшь: ${RELICS[r].name}.` : ''), died: d, grants: page(rt, ['e_murk_grave']), gains: r ? [`relic:${r}`] : [] }; } },
        { label: 'Присыпать глубже', hint: 'Убери карту.', run: () => ({ text: 'Ты поправляешь холм и пару раз ударяешь лопатой. Что-то в голове тоже становится глубже.', then: 'remove', grants: page(rt, ['e_murk_grave']) }) },
        { label: 'Уйти', run: () => ({ text: 'Ты не оглядываешься. Дощечка тоже.', grants: page(rt, ['e_murk_grave']) }) },
      ],
    }),
  },
  {
    id: 'mirror_water', circles: [1, 2], weight: 2,
    build: (rt) => ({
      title: 'Зеркальная вода',
      art: 'mirror',
      text: ['Вода лежит так тихо, что в ней видно небо. Серое, как всегда. Но в воде оно чуть светлее.', 'В отражении ты стоишь без шрама.'],
      options: [
        { label: 'Войти', hint: 'Потеряешь 10 ЗДР. Улучшишь карту.', run: () => { const d = hurt(rt, 10); return { text: 'Холод пробирает до костей. Ты выходишь другим на одну карту.', then: d ? undefined : 'upgrade', died: d }; } },
        { label: 'Выпить', hint: 'Исцелит 12. Взамен случайная карта станет проклятой.', run: () => { heal(rt, 12); addCard(rt.run, 'guilt'); return { text: 'Вода сладкая. Слишком. Что-то неподвижное опускается в колоду.', gains: ['card:guilt'] }; } },
        { label: 'Пройти мимо', run: () => ({ text: 'Отражение остаётся без шрама. Идёт за тобой по воде.' }) },
      ],
    }),
  },
  {
    id: 'silt_cart', circles: [1, 2], weight: 2,
    build: (rt) => ({
      title: 'Телега с хламом',
      art: 'cart',
      text: ['Телега брошена посреди рынка. В ней — ржавые колокольчики, сломанные лопаты, чьи-то зубы. И запах свежего хлеба.'],
      options: [
        { label: 'Порыться', hint: '+25 монет, 40%: потеряешь 6 ЗДР.', run: () => { rt.run.gold += 25; const d = rt.rng.chance(0.4) ? hurt(rt, 6) : false; return { text: d ? 'Под хламом — капкан. Но монеты остаются в руке.' : 'Монеты и гвозди. Мелочь, но с нею уютнее.', died: d, gains: ['gold:25'] }; } },
        { label: 'Съесть хлеб', hint: 'Исцелит 8.', run: () => { heal(rt, 8); return { text: 'Хлеб тёплый и пустой на вкус. Но тело благодарно.' }; } },
        { label: 'Уйти', run: () => ({ text: 'Телега скрипит, пока ты не скрываешься за углом.' }) },
      ],
    }),
  },
];

export function pickEvent(run: RunState, chron: Chronicle): EventView {
  const rng = rngOf(run);
  const pool = EVENTS.filter((e) => e.circles.includes(run.circle) && !run.seenEvents.includes(e.id));
  const list = pool.length ? pool : EVENTS.filter((e) => e.circles.includes(run.circle));
  // события с именами чаще, если имя уже известно
  const e = rng.weighted(list, (x) => x.weight * (x.id === 'tin_bell' && chron.names.includes('Тин') ? 2.5 : 1));
  run.seenEvents.push(e.id);
  chron.seenEvents[e.id] = (chron.seenEvents[e.id] ?? 0) + 1;
  const built = e.build({ run, chron, rng });
  saveRng(run, rng);
  // Варианты используют тот же ГСЧ: после выбора сохраняем его состояние.
  for (const o of built.options) {
    const orig = o.run;
    o.run = () => {
      const out = orig();
      saveRng(run, rng);
      return out;
    };
  }
  return { id: e.id, ...built };
}

export { CARDS };
