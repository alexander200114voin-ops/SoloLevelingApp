export type StatKey = 'strength' | 'agility' | 'intelligence' | 'dexterity';
export type GateRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type TabKey = 'profile' | 'quests' | 'gates' | 'shadows' | 'system_chat' | 'admin';

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

export interface HunterState {
  name: string;
  level: int;
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
  language: 'ru' | 'en';
  system_message: string | null;
  daily: {
    date: string;
    quests: QuestState[];
    penalty: boolean;
  };
}
