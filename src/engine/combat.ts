import { Rng } from './rng.ts';
import { CARDS, cardCost } from './cards.ts';
import { ENEMIES } from './enemies.ts';
import type {
  CardInst, EnemyInst, GameEvent, HeroState, Move, RoleId, StatusId, CardType,
} from './types.ts';

export const HAND_CAP = 8;
export const BASE_BREATH = 3;
export const BASE_DRAW = 5;

export interface CombatInit {
  rng: Rng;
  role: RoleId;
  deck: CardInst[];
  hp: number;
  maxHp: number;
  relics: string[];
  enemies: string[];
  circle: number;
  hpScale?: number;
}

export interface PendingChoice {
  kind: 'exhume';
  count: number;
  free: boolean;
  options: number[]; // uid карт в Могиле
}

export class Combat {
  rng: Rng;
  role: RoleId;
  relics: string[];
  hero: HeroState;
  enemies: EnemyInst[] = [];
  drawPile: CardInst[] = [];
  hand: CardInst[] = [];
  discard: CardInst[] = [];
  grave: CardInst[] = [];
  exhausted: CardInst[] = [];
  breath = 0;
  turn = 0;
  phase: 'hero' | 'enemy' | 'over' = 'hero';
  typesPlayed = new Set<CardType>();
  chordDone = false;
  chordsThisCombat = 0;
  playedThisTurn: CardInst[] = [];
  pending: PendingChoice | null = null;
  result: 'win' | 'lose' | null = null;
  killedBy: string | null = null;
  goldGain = 0;
  kills: string[] = [];
  nextDrawBonus = 0;
  events: GameEvent[] = [];
  listener: ((e: GameEvent) => void) | null = null;
  private uid = 100000;
  circle: number;
  hpScale = 1;

  constructor(init: CombatInit) {
    this.rng = init.rng;
    this.role = init.role;
    this.relics = init.relics;
    this.circle = init.circle;
    this.hpScale = init.hpScale ?? 1;
    this.hero = { hp: init.hp, maxHp: init.maxHp, block: 0, statuses: {}, flame: 0, toll: 0 };
    this.drawPile = this.rng.shuffle(init.deck.map((c) => ({ ...c, returned: false, free: false })));
    for (const id of init.enemies) this.spawn(id, false);
    this.begin();
  }

  /* ───────── утилиты ───────── */
  emit(e: GameEvent) {
    this.events.push(e);
    this.listener?.(e);
  }
  has(relic: string) {
    return this.relics.includes(relic);
  }
  get living(): EnemyInst[] {
    return this.enemies.filter((e) => e.alive);
  }
  enemy(uid: number) {
    return this.enemies.find((e) => e.uid === uid);
  }
  def(card: CardInst) {
    return CARDS[card.id];
  }
  cost(card: CardInst) {
    if (card.free) return 0;
    return cardCost(card.id, card.up);
  }

  spawn(defId: string, announce = true): EnemyInst {
    const d = ENEMIES[defId];
    const hp = Math.max(1, Math.round(this.rng.int(d.hp[0], d.hp[1]) * (d.tier === 'normal' || true ? this.hpScale : 1)));
    const e: EnemyInst = {
      uid: this.uid++, def: defId, hp, maxHp: hp, block: 0, statuses: {}, strength: 0,
      moveIdx: 0, intent: { id: 'x', name: '…', kind: 'unknown' }, alive: true, stunImmune: 0, phase: 0,
    };
    this.enemies.push(e);
    e.intent = this.choose(e);
    if (announce) this.emit({ t: 'summon', enemy: e.uid });
    return e;
  }

  private choose(e: EnemyInst): Move {
    const d = ENEMIES[e.def];
    const m = d.pick(e, this as never);
    return m;
  }

  /* ───────── начало боя / хода ───────── */
  private begin() {
    if (this.has('tide_pearl')) for (const e of this.living) e.block += 3;
    if (this.has('mourning_veil')) for (const e of this.living) this.addStatus(e, 'dread', 1, false);
    if (this.has('gravedigger_spade')) this.buryTop();
    this.startHeroTurn();
  }

  private startHeroTurn() {
    this.turn++;
    this.phase = 'hero';
    this.hero.block = 0;
    this.breath = BASE_BREATH + (this.has('tide_pearl') ? 1 : 0);
    if (this.turn === 1 && this.has('candle_stub')) this.breath += 1;
    if ((this.hero.statuses.chains ?? 0) > 0) {
      this.breath = Math.max(1, this.breath - 1);
      this.hero.statuses.chains = 0;
      this.emit({ t: 'log', text: 'Оковы: на 1 Дыхание меньше.' });
    }
    this.typesPlayed.clear();
    this.chordDone = false;
    this.playedThisTurn = [];
    this.emit({ t: 'turn', who: 'hero', n: this.turn });
    const rot = this.hero.statuses.rot ?? 0;
    if (rot > 0) {
      this.hurtHero(rot, undefined, true);
      this.hero.statuses.rot = rot - 1;
      if (this.checkEnd()) return;
    }
    let n = BASE_DRAW + this.nextDrawBonus + (this.has('conductors_baton') ? 1 : 0);
    if (this.turn === 1 && this.has('rusted_key')) n += 1;
    this.nextDrawBonus = 0;
    this.draw(n);
  }

  /* ───────── карты ───────── */
  draw(n: number) {
    for (let i = 0; i < n; i++) {
      if (this.drawPile.length === 0) {
        if (this.discard.length === 0) return;
        this.drawPile = this.rng.shuffle(this.discard.splice(0));
      }
      const c = this.drawPile.pop()!;
      if (this.hand.length >= HAND_CAP) {
        this.discard.push(c);
        continue;
      }
      this.hand.push(c);
      this.emit({ t: 'draw', card: c });
    }
  }

  buryTop(): CardInst | undefined {
    if (this.drawPile.length === 0 && this.discard.length > 0) this.drawPile = this.rng.shuffle(this.discard.splice(0));
    const c = this.drawPile.pop();
    if (!c) return undefined;
    this.grave.push(c);
    this.emit({ t: 'bury', card: c });
    return c;
  }

  buryRandomFromHand(exceptUid?: number): CardInst | undefined {
    const pool = this.hand.filter((c) => c.uid !== exceptUid);
    if (!pool.length) return undefined;
    const c = this.rng.pick(pool);
    this.hand.splice(this.hand.indexOf(c), 1);
    this.grave.push(c);
    this.emit({ t: 'bury', card: c });
    return c;
  }

  exhume(count: number, free: boolean) {
    if (this.grave.length === 0) return;
    if (this.grave.length <= count) {
      for (const c of [...this.grave]) this.returnFromGrave(c.uid, free);
      return;
    }
    this.pending = { kind: 'exhume', count, free, options: this.grave.map((c) => c.uid) };
  }

  /** Игрок выбирает карты для эксгумации. */
  choose_exhume(uids: number[]) {
    const p = this.pending;
    if (!p || p.kind !== 'exhume') throw new Error('Нет выбора');
    if (uids.length !== p.count) throw new Error('Неверное число карт');
    for (const u of uids) if (!p.options.includes(u)) throw new Error('Карта не в Могиле');
    this.pending = null;
    for (const u of uids) this.returnFromGrave(u, p.free);
  }

  private returnFromGrave(uid: number, free: boolean) {
    const i = this.grave.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const [c] = this.grave.splice(i, 1);
    c.returned = true;
    if (free) c.free = true;
    if (this.hand.length >= HAND_CAP) this.discard.push(c);
    else this.hand.push(c);
    this.emit({ t: 'exhume', card: c });
  }

  canPlay(uid: number): boolean {
    if (this.phase !== 'hero' || this.pending || this.result) return false;
    const c = this.hand.find((x) => x.uid === uid);
    if (!c) return false;
    const d = this.def(c);
    if (d.unplayable) return false;
    return this.cost(c) <= this.breath;
  }

  needsTarget(uid: number): boolean {
    const c = this.hand.find((x) => x.uid === uid);
    return !!c && this.def(c).target === 'enemy' && this.living.length > 1;
  }

  play(uid: number, targetUid?: number) {
    if (!this.canPlay(uid)) throw new Error('Нельзя сыграть');
    const idx = this.hand.findIndex((x) => x.uid === uid);
    const card = this.hand[idx];
    const d = this.def(card);
    let target: EnemyInst | undefined;
    if (d.target === 'enemy') {
      target = targetUid !== undefined ? this.enemy(targetUid) : this.living[0];
      if (!target || !target.alive) target = this.living[0];
      if (!target) throw new Error('Нет цели');
    }
    this.breath -= this.cost(card);
    this.hand.splice(idx, 1);
    this.emit({ t: 'play', card });
    if (d.type !== 'debt') this.typesPlayed.add(d.type);
    this.playedThisTurn.push(card);
    // Кровь героя: удар стоит крови
    if (d.type === 'strike' && (this.hero.statuses.bleed ?? 0) > 0) this.hurtHero(this.hero.statuses.bleed!, undefined, true);
    const ctx = new Ctx(this, card, d, card.up);
    if (!this.result) d.play(ctx, card.up, target);
    // Судьба карты
    if (d.exhaust && !(card.up && d.exhaustUnlessUp)) {
      this.exhausted.push(card);
      this.emit({ t: 'exhaust', card });
    } else if (d.selfBury) {
      this.grave.push(card);
      this.emit({ t: 'bury', card });
    } else this.discard.push(card);
    card.returned = false;
    card.free = false;
    if (this.checkEnd()) return;
    this.checkChord();
    this.checkEnd();
  }

  private checkChord() {
    if (this.chordDone || this.typesPlayed.size < 3) return;
    this.chordDone = true;
    this.chordsThisCombat++;
    this.emit({ t: 'chord', role: this.role });
    switch (this.role) {
      case 'gravedigger':
        this.exhume(1, true);
        break;
      case 'wickkeeper':
        this.hero.flame += 3;
        this.healHero(2);
        break;
      case 'bellringer':
        this.addToll(3);
        break;
      case 'penitent':
        break;
    }
    if (this.has('bell_cord') && this.chordsThisCombat === 1) this.breath += 1;
    if (this.has('choir_robe')) this.gainBlock(5);
  }

  addToll(n: number) {
    this.hero.toll += n;
    while (this.hero.toll >= 6) {
      this.hero.toll -= 6;
      this.emit({ t: 'toll' });
      for (const e of this.living) {
        this.hurtEnemy(e, 8);
        if (e.alive && ENEMIES[e.def].tier === 'normal') this.addStatus(e, 'chains', 1, false);
      }
    }
  }

  /* ───────── урон / статусы ───────── */
  heroDamage(base: number, strike: boolean): number {
    let n = base + (strike ? this.hero.flame : 0);
    if ((this.hero.statuses.dread ?? 0) > 0) n = Math.floor(n * 0.75);
    return Math.max(0, n);
  }

  /** Удар героя по врагу с учётом модификаторов. Возвращает true, если враг убит. */
  heroHit(target: EnemyInst, base: number, strike: boolean): boolean {
    if (!target.alive) return false;
    const n = this.heroDamage(base, strike);
    return this.hurtEnemy(target, n);
  }

  hurtEnemy(e: EnemyInst, n: number, ignoreBlock = false): boolean {
    if (!e.alive) return false;
    let blocked = 0;
    if (!ignoreBlock) {
      blocked = Math.min(e.block, n);
      e.block -= blocked;
    }
    const dealt = n - blocked;
    e.hp -= dealt;
    this.emit({ t: 'damage', target: e.uid, amount: dealt, blocked, src: 'hero' });
    if (e.hp <= 0) {
      e.hp = 0;
      e.alive = false;
      this.kills.push(e.def);
      this.emit({ t: 'death', enemy: e.uid });
      return true;
    }
    this.checkPhase(e);
    return false;
  }

  private checkPhase(e: EnemyInst) {
    const d = ENEMIES[e.def];
    if (d.tier === 'boss' && e.phase === 0 && e.hp <= e.maxHp / 2) {
      e.phase = 1;
      e.strength += 2;
      this.emit({ t: 'log', text: `${d.name} входит во вторую фазу.` });
    }
  }

  hurtHero(n: number, source?: EnemyInst, ignoreBlock = false) {
    let blocked = 0;
    if (!ignoreBlock) {
      blocked = Math.min(this.hero.block, n);
      this.hero.block -= blocked;
    }
    const dealt = n - blocked;
    this.hero.hp -= dealt;
    this.emit({ t: 'damage', target: 'hero', amount: dealt, blocked, src: source?.uid });
    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      if (source) this.killedBy = source.def;
      else if (!this.killedBy) this.killedBy = this.lastAttacker ?? null;
    }
  }
  private lastAttacker?: string;

  healHero(n: number) {
    const before = this.hero.hp;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + n);
    if (this.hero.hp > before) this.emit({ t: 'heal', target: 'hero', amount: this.hero.hp - before });
  }

  gainBlock(n: number) {
    this.hero.block += n;
    this.emit({ t: 'block', target: 'hero', amount: n });
  }

  addStatus(e: EnemyInst, s: StatusId, n: number, fromHero = true) {
    if (!e.alive) return;
    if (s === 'chains') {
      if (ENEMIES[e.def].tier !== 'normal' && e.stunImmune > 0) return;
    }
    if (s === 'rot' && fromHero && this.has('ash_censer')) n += 1;
    e.statuses[s] = (e.statuses[s] ?? 0) + n;
    this.emit({ t: 'status', target: e.uid, status: s, n });
  }

  addHeroStatus(s: StatusId, n: number) {
    this.hero.statuses[s] = (this.hero.statuses[s] ?? 0) + n;
    this.emit({ t: 'status', target: 'hero', status: s, n });
  }

  /* ───────── ход врагов ───────── */
  endTurn() {
    if (this.phase !== 'hero' || this.result) return;
    if (this.pending) throw new Error('Сначала сделайте выбор');
    // долги и «эфемерные» карты в руке
    for (const c of [...this.hand]) {
      const d = this.def(c);
      if (d.onTurnEnd) d.onTurnEnd(new Ctx(this, c, d, c.up));
      if (d.ethereal) {
        this.hand.splice(this.hand.indexOf(c), 1);
        this.exhausted.push(c);
      }
    }
    if (this.checkEnd()) return;
    for (const c of this.hand) {
      c.free = false;
      c.returned = false;
    }
    this.discard.push(...this.hand.splice(0));
    // распад статусов героя
    if ((this.hero.statuses.dread ?? 0) > 0) this.hero.statuses.dread! -= 1;
    if ((this.hero.statuses.bleed ?? 0) > 0) this.hero.statuses.bleed! -= 1;
    if (this.hero.flame > 0) this.hero.flame -= 1;
    this.phase = 'enemy';
    this.emit({ t: 'turn', who: 'enemy', n: this.turn });
    this.runEnemies();
    if (this.checkEnd()) return;
    this.startHeroTurn();
  }

  private runEnemies() {
    for (const e of [...this.enemies]) {
      if (!e.alive || this.result) continue;
      e.block = 0;
      const rot = e.statuses.rot ?? 0;
      if (rot > 0) {
        this.hurtEnemy(e, rot, true);
        if (e.alive) e.statuses.rot = rot - 1;
        if (!e.alive) continue;
      }
      if ((e.statuses.chains ?? 0) > 0) {
        e.statuses.chains = 0;
        if (ENEMIES[e.def].tier !== 'normal') e.stunImmune = 3;
        this.emit({ t: 'log', text: `${ENEMIES[e.def].name} скован и пропускает ход.` });
      } else {
        this.emit({ t: 'act', enemy: e.uid, name: e.intent.name });
        this.execute(e, e.intent);
        if (this.hero.hp <= 0) break;
      }
      if ((e.statuses.bleed ?? 0) > 0) e.statuses.bleed! -= 1;
      if ((e.statuses.dread ?? 0) > 0) e.statuses.dread! -= 1;
      if (e.stunImmune > 0) e.stunImmune -= 1;
      e.moveIdx++;
    }
    for (const e of this.living) e.intent = this.choose(e);
  }

  enemyDamage(e: EnemyInst, base: number): number {
    let n = base + e.strength;
    if ((e.statuses.dread ?? 0) > 0) n = Math.floor(n * 0.75);
    return Math.max(0, n);
  }

  private execute(e: EnemyInst, m: Move) {
    if (m.kind === 'attack' && m.dmg !== undefined) {
      const bleed = e.statuses.bleed ?? 0;
      if (bleed > 0) {
        this.hurtEnemy(e, bleed, true);
        if (!e.alive) return;
      }
      for (let i = 0; i < (m.hits ?? 1); i++) {
        this.lastAttacker = e.def;
        this.hurtHero(this.enemyDamage(e, m.dmg), e);
        if (this.hero.hp <= 0) return;
      }
    }
    if (m.block) {
      e.block += m.block;
      this.emit({ t: 'block', target: e.uid, amount: m.block });
    }
    if (m.blockAll) {
      for (const o of this.living) {
        o.block += m.blockAll;
        this.emit({ t: 'block', target: o.uid, amount: m.blockAll });
      }
    }
    if (m.heal) {
      e.hp = Math.min(e.maxHp, e.hp + m.heal);
      this.emit({ t: 'heal', target: e.uid, amount: m.heal });
    }
    if (m.strength) e.strength += m.strength;
    if (m.apply) this.addHeroStatus(m.apply.status, m.apply.n);
    if (m.junk) {
      for (let i = 0; i < m.junk.n; i++) {
        this.discard.push({ uid: this.uid++, id: m.junk.card, up: false });
      }
      this.emit({ t: 'log', text: 'В колоду подсунули расписку.' });
    }
    if (m.summon && this.living.length < 4) this.spawn(m.summon);
  }

  /* ───────── конец боя ───────── */
  private checkEnd(): boolean {
    if (this.result) return true;
    if (this.hero.hp <= 0) {
      this.result = 'lose';
      this.phase = 'over';
      this.emit({ t: 'end', result: 'lose' });
      return true;
    }
    if (this.living.length === 0) {
      this.result = 'win';
      this.phase = 'over';
      this.emit({ t: 'end', result: 'win' });
      return true;
    }
    return false;
  }
}

/* ───────── контекст розыгрыша карты ───────── */
export class Ctx {
  constructor(public c: Combat, public card: CardInst, public def: { type: CardType | 'debt' }, public up: boolean) {}
  get hero() {
    return this.c.hero;
  }
  get graveSize() {
    return this.c.grave.length;
  }
  get types() {
    return this.c.typesPlayed;
  }
  get played() {
    return this.c.playedThisTurn;
  }
  dmg(t: EnemyInst, n: number) {
    const killed = this.c.heroHit(t, n, this.def.type === 'strike');
    if (killed) this.onKill(t);
    return killed;
  }
  dmgAll(n: number) {
    for (const e of [...this.c.living]) this.dmg(e, n);
  }
  onKill(_t: EnemyInst) {
    /* хук для карт с наградой за убийство */
  }
  bounty(gold: number) {
    this.c.goldGain += gold;
  }
  block(n: number) {
    this.c.gainBlock(n);
  }
  apply(t: EnemyInst, s: StatusId, n: number) {
    this.c.addStatus(t, s, n, true);
  }
  applyAll(s: StatusId, n: number) {
    for (const e of this.c.living) this.c.addStatus(e, s, n, true);
  }
  draw(n: number) {
    this.c.draw(n);
  }
  buryTop() {
    return this.c.buryTop();
  }
  buryHand() {
    return this.c.buryRandomFromHand(this.card.uid);
  }
  exhume(count: number, free = true) {
    this.c.exhume(count, free);
  }
  loseHp(n: number) {
    this.c.hurtHero(n, undefined, true);
  }
  heal(n: number) {
    this.c.healHero(n);
  }
  flame(n: number) {
    this.c.hero.flame += n;
  }
  breath(n: number) {
    this.c.breath += n;
  }
  nextDraw(n: number) {
    this.c.nextDrawBonus += n;
  }
  toll(n: number) {
    this.c.addToll(n);
  }
  mute(t: EnemyInst) {
    t.intent = { id: 'muted', name: 'Умолк', kind: 'unknown', text: 'Голос Агнеты' };
  }
  get hpPct() {
    return this.c.hero.hp / this.c.hero.maxHp;
  }
}
