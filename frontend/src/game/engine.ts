import { GAME_MODEL, QUEST_KEYS, titleForLevel, xpForLevel } from './model';
import type {
  EncounterResult,
  GateDef,
  HunterState,
  QuestKey,
  StatBlock,
  StatKey,
} from './types';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function freshDaily(date = todayStr()): HunterState['daily'] {
  return {
    date,
    penalty: false,
    quests: QUEST_KEYS.map((k) => ({
      key: k,
      progress: 0,
      completed: false,
    })),
  };
}

export function freshHunter(): HunterState {
  return {
    name: 'Sung Jinwoo',
    level: 1,
    xp: 0,
    gold: 100,
    title: titleForLevel(1),
    stats: { strength: 10, agility: 10, intelligence: 10, dexterity: 10 },
    statPoints: 5,
    shadowsOwned: [],
    activeShadow: null,
    lastGateDate: null,
    daily: freshDaily(),
  };
}

// If the stored daily is from a previous day, roll it over.
// If yesterday's quests were not all completed, flag a penalty.
export function rolloverDaily(state: HunterState): HunterState {
  const today = todayStr();
  if (state.daily.date === today) return state;

  const allDone = state.daily.quests.every((q) => q.completed);
  const carriedPenalty = !allDone;

  return {
    ...state,
    daily: {
      ...freshDaily(today),
      penalty: carriedPenalty || state.daily.penalty,
    },
  };
}

export function totalStatWithShadows(state: HunterState, key: StatKey): number {
  let total = state.stats[key];
  if (state.activeShadow) {
    const shadow = GAME_MODEL.shadows.find((s) => s.id === state.activeShadow);
    if (shadow) total += shadow.boost[key] ?? 0;
  }
  return total;
}

export function totalStats(state: HunterState): StatBlock {
  return {
    strength: totalStatWithShadows(state, 'strength'),
    agility: totalStatWithShadows(state, 'agility'),
    intelligence: totalStatWithShadows(state, 'intelligence'),
    dexterity: totalStatWithShadows(state, 'dexterity'),
  };
}

export function powerLevel(state: HunterState): number {
  const t = totalStats(state);
  return state.level * 10 + t.strength + t.agility + t.intelligence + t.dexterity;
}

// Add XP, cascade level-ups, award stat points.
export function addXp(state: HunterState, amount: number): HunterState {
  let xp = state.xp + amount;
  let level = state.level;
  let statPoints = state.statPoints;
  let need = xpForLevel(level);
  while (xp >= need) {
    xp -= need;
    level += 1;
    statPoints += 3;
    need = xpForLevel(level);
  }
  return {
    ...state,
    xp,
    level,
    statPoints,
    title: titleForLevel(level),
  };
}

export function incrementStat(state: HunterState, key: StatKey): HunterState {
  if (state.statPoints <= 0) return state;
  return {
    ...state,
    statPoints: state.statPoints - 1,
    stats: { ...state.stats, [key]: state.stats[key] + 1 },
  };
}

export function advanceQuest(state: HunterState, key: QuestKey, amount: number): {
  state: HunterState;
  quest: HunterState['daily']['quests'][number] | undefined;
} {
  const def = GAME_MODEL.quests.find((q) => q.key === key);
  if (!def) return { state, quest: undefined };

  const quests = state.daily.quests.map((q) => {
    if (q.key !== key) return q;
    const progress = Math.min(def.target, q.progress + amount);
    return { ...q, progress, completed: progress >= def.target };
  });

  const quest = quests.find((q) => q.key === key);
  let next: HunterState = { ...state, daily: { ...state.daily, quests } };

  // Award XP + gold once, the moment a quest is newly completed.
  if (quest && quest.completed) {
    const wasCompleted = state.daily.quests.find((q) => q.key === key)?.completed;
    if (!wasCompleted) {
      next = addXp({ ...next, gold: next.gold + 30 }, 40);
    }
  }

  // If all quests done, bonus.
  if (quests.every((q) => q.completed)) {
    const allWereDone = state.daily.quests.every((q) => q.completed);
    if (!allWereDone) {
      next = addXp({ ...next, gold: next.gold + 80 }, 100);
      next = { ...next, daily: { ...next.daily, penalty: false } };
    }
  }

  return { state: next, quest };
}

export function clearPenalty(state: HunterState): HunterState {
  return { ...state, daily: { ...state.daily, penalty: false } };
}

function gateSuccessChance(state: HunterState, gate: GateDef): number {
  const stat = totalStatWithShadows(state, gate.statUsed);
  // Each point above 10 adds ~1.5% chance, capped at +25%.
  const bonus = Math.min(0.25, Math.max(0, (stat - 10) * 0.015));
  // Level difference beyond minimum adds a little safety.
  const levelEdge = Math.max(0, state.level - gate.minLevel) * 0.01;
  return Math.min(0.97, gate.successRateBase + bonus + levelEdge);
}

export function enterGate(state: HunterState, gate: GateDef): {
  state: HunterState;
  result: EncounterResult;
} {
  const chance = gateSuccessChance(state, gate);
  const roll = Math.random();
  const success = roll < chance;
  const narrative = gate.encounters[Math.floor(Math.random() * gate.encounters.length)];

  if (success) {
    const gained = addXp({ ...state, gold: state.gold + gate.goldReward }, gate.xpReward);
    return {
      state: { ...gained, lastGateDate: todayStr() },
      result: { success: true, narrative, gold: gate.goldReward, xp: gate.xpReward },
    };
  }

  // Failure: lose some gold, no XP. Slight wound to flavor.
  const lost = Math.min(state.gold, Math.round(gate.goldReward * 0.25));
  return {
    state: { ...state, gold: state.gold - lost, lastGateDate: todayStr() },
    result: {
      success: false,
      narrative: `${narrative} ...but the gate turns against you. You retreat, wounded, dropping ${lost} gold in the chaos.`,
      gold: -lost,
      xp: 0,
    },
  };
}

export function buyShadow(state: HunterState, shadowId: string): HunterState {
  const shadow = GAME_MODEL.shadows.find((s) => s.id === shadowId);
  if (!shadow) return state;
  if (state.shadowsOwned.includes(shadowId)) return state;
  if (state.gold < shadow.cost) return state;
  return {
    ...state,
    gold: state.gold - shadow.cost,
    shadowsOwned: [...state.shadowsOwned, shadowId],
    activeShadow: state.activeShadow ?? shadowId,
  };
}

export function setActiveShadow(state: HunterState, shadowId: string | null): HunterState {
  if (shadowId && !state.shadowsOwned.includes(shadowId)) return state;
  return { ...state, activeShadow: shadowId };
}

export function canEnterGate(state: HunterState, gate: GateDef): boolean {
  return state.level >= gate.minLevel;
}
