export type StatKey = 'strength' | 'agility' | 'intelligence' | 'dexterity';
export type GateRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type TabKey = 'profile' | 'quests' | 'gates' | 'shadows' | 'system_chat' | 'admin';


export type QuestKey = 'pushups' | 'running' | 'studying' | 'coding';

export interface StatBlock {
  strength: number;
  agility: number;
  intelligence: number;
  dexterity: number;
}

export interface QuestState {
  key: string;
  label_ru: string;
  label_en: string;
  progress: number;
  target: number;
  unit_ru: string;
  unit_en: string;
  type: string;
  completed: boolean;
}

export interface EncounterResult {
  success: boolean;
  narrative: string;
  gold: number;
  xp: number;
}

export interface GateDef {
  rank: GateRank;
  label: string;
  minLevel: number;
  goldReward: number;
  xpReward: number;
  successRateBase: number;
  statUsed: StatKey;
  encounters: string[];
}

export interface GameModel {
  quests: { key: QuestKey; label: string; stat: StatKey; target: number; unit: string; verb: string; icon: string }[];
  shadows: { id: string; name: string; epithet: string; rank: GateRank; cost: number; boost: Partial<StatBlock>; blurb: string; icon: string }[];
  gates: GateDef[];
  rankTitles: { rank: GateRank; level: number; title: string }[];
}

export interface HunterState {
  name: string;
  level: number;
  xp: number;
  xp_needed: number;
  gold: number;
  title_ru: string;
  title_en: string;
  stats: StatBlock;
  statPoints: number;
  shadowsOwned: string[];
  activeShadow: string | null;
  lastGateDate: string | null;
  canRaidToday: boolean;
  penaltyQuestKey: string | null;
  penaltyProgress: number;
  penaltyTarget: number;
  language: 'ru' | 'en';
  system_message: string | null;
  daily: {
    date: string;
    quests: QuestState[];
    penalty: boolean;
  };
}