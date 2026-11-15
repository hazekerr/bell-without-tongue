import type { Chronicle } from '../engine/chronicle.ts';

export interface HubLine { who: 'Мёрк' | 'Ильзе' | 'Тин' | 'Ты' | 'Рассказчик'; text: string }
export interface HubTalk {
  id: string;
  title: string;
  /** Условие появления. */
  when: (c: Chronicle) => boolean;
  lines: HubLine[];
  /** Страницы, которые разговор даёт. */
  grants?: string[];
  /** Приоритет (больше — раньше). */
  priority: number;
}

const has = (c: Chronicle, id: string) => c.pages.includes(id);

export const HUB_TALKS: HubTalk[] = [
  {
    id: 'ht_first_return', title: 'Первое возвращение', priority: 100,
    when: (c) => c.tolls >= 1 && !c.seenTalks.includes('ht_first_return'),
    lines: [
      { who: 'Мёрк', text: 'Вот. Живой. Если это слово тут вообще подходит.' },
      { who: 'Мёрк', text: 'Первый раз всегда самый неприятный. Потом привыкаешь. Многие привыкали.' },
      { who: 'Ильзе', text: 'Тело читаемо. Хорошо. Спуск не закончен: возвращайся, пока не дойдёшь до дна.' },
      { who: 'Ты', text: 'А если не дойду?' },
      { who: 'Ильзе', text: 'Тогда ты вернёшься снова.' },
    ],
    grants: ['p_ilse', 'p_scar'],
  },
  {
    id: 'ht_epitaph', title: 'Эпитафии', priority: 80,
    when: (c) => c.tolls >= 2 && !c.seenTalks.includes('ht_epitaph'),
    lines: [
      { who: 'Мёрк', text: 'Я сочиняю надпись каждому. Смотрю, как ты умер, и пишу. Раньше писал красиво. Теперь честно.' },
      { who: 'Мёрк', text: 'Дощечек у меня больше, чем могил. Могил — больше, чем живых в Сальвене.' },
    ],
    grants: ['p_order'],
  },
  {
    id: 'ht_tin', title: 'Звук по ночам', priority: 70,
    when: (c) => c.tolls >= 3 && has(c, 'p_ilse') && !c.seenTalks.includes('ht_tin'),
    lines: [
      { who: 'Рассказчик', text: 'Ночью кто-то звонит. Тонко, высоко. Как будто мышь тянет шнур.' },
      { who: 'Мёрк', text: 'Не ходи на звук.' },
      { who: 'Ты', text: 'Почему?' },
      { who: 'Мёрк', text: 'Потому что ходят. А потом приходят к тому, у кого лопата.' },
    ],
    grants: ['p_tin_1'],
  },
  {
    id: 'ht_ilse_lie', title: 'Что Ильзе недоговаривает', priority: 60,
    when: (c) => has(c, 'p_reveal1') && !c.seenTalks.includes('ht_ilse_lie'),
    lines: [
      { who: 'Ты', text: 'Хор не предавал.' },
      { who: 'Ильзе', text: 'Где ты это услышал?' },
      { who: 'Ты', text: 'Прочёл. В кармане у мёртвого звонаря.' },
      { who: 'Ильзе', text: 'Орден хранит свет. Сомнения — тоже топливо. Не трать их.' },
      { who: 'Мёрк', text: '(тихо) Она знает. Давно.' },
    ],
  },
  {
    id: 'ht_murk_confess', title: 'Могильщик и Тин', priority: 50,
    when: (c) => c.names.includes('Тин') && c.tolls >= 6 && !c.seenTalks.includes('ht_murk_confess'),
    lines: [
      { who: 'Мёрк', text: 'Слышал её? Девочку?' },
      { who: 'Ты', text: 'Её зовут Тин.' },
      { who: 'Мёрк', text: 'Знаю. Я слышал её, когда ещё сам был в Хоре. Давным-давно. Иногда мне кажется, она единственная, кто осталась.' },
    ],
  },
  {
    id: 'ht_generic_1', title: 'Мёрк за работой', priority: 10,
    when: () => true,
    lines: [
      { who: 'Мёрк', text: 'Копаю. Утешает. Земля никогда не говорит «а что, если».' },
    ],
  },
  {
    id: 'ht_generic_2', title: 'Ильзе проверяет', priority: 9,
    when: () => true,
    lines: [
      { who: 'Ильзе', text: 'Твоё тело заживает быстро. Это нормально для Возвращённых. Для тебя — слишком.' },
    ],
  },
  {
    id: 'ht_generic_3', title: 'Колокол затих', priority: 8,
    when: () => true,
    lines: [
      { who: 'Рассказчик', text: 'Колокол над Сальвеном молчит. Но если прислушаться — внутри него что-то есть. Как будто он держит ноту, которую не может допеть.' },
    ],
  },
];
