import type { GameModel, GateRank, QuestKey } from './types';

export const QUEST_KEYS: QuestKey[] = ['pushups', 'running', 'studying', 'coding'];

export const GAME_MODEL: GameModel = {
  quests: [
    { key: 'pushups', label: 'Push-ups', stat: 'strength', target: 50, unit: 'reps', verb: 'Push', icon: 'Dumbbell' },
    { key: 'running', label: 'Running', stat: 'agility', target: 5, unit: 'km', verb: 'Run', icon: 'Footprints' },
    { key: 'studying', label: 'Studying', stat: 'intelligence', target: 60, unit: 'min', verb: 'Study', icon: 'BookOpen' },
    { key: 'coding', label: 'Coding', stat: 'dexterity', target: 90, unit: 'min', verb: 'Code', icon: 'Code2' },
  ],
  shadows: [
    {
      id: 'igris',
      name: 'Igris',
      epithet: 'Knight of the Shadow Throne',
      rank: 'A',
      cost: 600,
      boost: { strength: 8, agility: 4 },
      blurb: 'A loyal knight who strengthens your body and reflexes. Sworn to the Monarch.',
      icon: 'Sword',
    },
    {
      id: 'beru',
      name: 'Beru',
      epithet: 'Ant King',
      rank: 'S',
      cost: 1200,
      boost: { agility: 10, strength: 4, dexterity: 2 },
      blurb: 'The Ant King. His ferocity accelerates your every movement.',
      icon: 'Bug',
    },
    {
      id: 'iron',
      name: 'Iron',
      epithet: 'Shadow Shield',
      rank: 'C',
      cost: 250,
      boost: { strength: 3 },
      blurb: 'A steadfast shield-bearer. Slow, but he will never yield.',
      icon: 'ShieldHalf',
    },
    {
      id: 'tusk',
      name: 'Tusk',
      epithet: 'Shadow Mage',
      rank: 'B',
      cost: 450,
      boost: { intelligence: 6 },
      blurb: 'A high-mage of the shadow army. His counsel sharpens your mind.',
      icon: 'Wand2',
    },
    {
      id: 'kaise',
      name: 'Kaise',
      epithet: 'Shadow Rogue',
      rank: 'D',
      cost: 120,
      boost: { dexterity: 3, agility: 1 },
      blurb: 'A nimble rogue. Quick hands, quicker feet.',
      icon: 'Daggers',
    },
    {
      id: 'greed',
      name: 'Greed',
      epithet: 'Shadow Reaver',
      rank: 'A',
      cost: 800,
      boost: { dexterity: 6, intelligence: 3 },
      blurb: 'A reaver who devours patterns. Perfect for the one who codes.',
      icon: 'Skull',
    },
  ],
  gates: [
    {
      rank: 'E',
      label: 'E-Rank Gate',
      minLevel: 1,
      goldReward: 40,
      xpReward: 60,
      successRateBase: 0.85,
      statUsed: 'strength',
      encounters: [
        'Goblins spill from the rift. You cut them down with practiced ease.',
        'A pack of dire wolves tests your guard. You hold the line.',
        'Slimes. Endless slimes. Tedious, but harmless to a Hunter.',
      ],
    },
    {
      rank: 'D',
      label: 'D-Rank Gate',
      minLevel: 4,
      goldReward: 90,
      xpReward: 120,
      successRateBase: 0.7,
      statUsed: 'agility',
      encounters: [
        'Orcs charge in a ragged line. You outflank them and strike from the side.',
        'A corrupted knight blocks the gate\'s core. You dodge his swing and counter.',
        'Swarm of venom-wasps. You weave between them untouched.',
      ],
    },
    {
      rank: 'C',
      label: 'C-Rank Gate',
      minLevel: 8,
      goldReward: 180,
      xpReward: 220,
      successRateBase: 0.6,
      statUsed: 'intelligence',
      encounters: [
        'A labyrinth that shifts as you walk. You read the pattern and find the core.',
        'An illusionist masks the exit. You disbelieve and the walls unravel.',
        'Runes flare across the floor. You decode them before they detonate.',
      ],
    },
    {
      rank: 'B',
      label: 'B-Rank Gate',
      minLevel: 14,
      goldReward: 320,
      xpReward: 380,
      successRateBase: 0.5,
      statUsed: 'dexterity',
      encounters: [
        'A High Ogre. You exploit every opening in its stance.',
        'Twin serpent mages weave a binding spell. You sever the threads mid-cast.',
        'A guardian automaton. You find the seam in its plating and pry it open.',
      ],
    },
    {
      rank: 'A',
      label: 'A-Rank Gate',
      minLevel: 22,
      goldReward: 600,
      xpReward: 640,
      successRateBase: 0.4,
      statUsed: 'strength',
      encounters: [
        'A S-rank Beast stirs. You meet its roar with your own and hold.',
        'A field of corrupted mana. You endure, step by step, to the core.',
        'The Gate\'s master, a fallen Hunter. A duel decided in a single exchange.',
      ],
    },
    {
      rank: 'S',
      label: 'S-Rank Gate',
      minLevel: 32,
      goldReward: 1200,
      xpReward: 1200,
      successRateBase: 0.3,
      statUsed: 'intelligence',
      encounters: [
        'A Monarch\'s shadow tests you. The arena bends to its will. You bend back.',
        'Reality fractures inside the rift. You hold yourself together by will alone.',
        'The Dragon of the Rift. Its eyes track you across dimensions. You strike first.',
      ],
    },
  ],
  rankTitles: [
    { rank: 'E', level: 1, title: 'E-Rank Hunter' },
    { rank: 'D', level: 6, title: 'D-Rank Hunter' },
    { rank: 'C', level: 12, title: 'C-Rank Hunter' },
    { rank: 'B', level: 20, title: 'B-Rank Hunter' },
    { rank: 'A', level: 28, title: 'A-Rank Hunter' },
    { rank: 'S', level: 36, title: 'S-Rank Hunter' },
    { rank: 'S', level: 45, title: 'Shadow Monarch' },
  ],
};

export function titleForLevel(level: number): string {
  const list = GAME_MODEL.rankTitles;
  let result = list[0].title;
  for (const t of list) {
    if (level >= t.level) result = t.title;
  }
  return result;
}

export function rankForLevel(level: number): GateRank {
  const list = GAME_MODEL.rankTitles;
  let result: GateRank = 'E';
  for (const t of list) {
    if (level >= t.level) result = t.rank;
  }
  return result;
}

// XP needed to advance FROM a given level.
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}
