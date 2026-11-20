import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { HunterState, QuestKey, StatKey } from '@/game/types';
import { freshHunter, enterGate as enterGateEngine, buyShadow as buyShadowEngine, setActiveShadow as setActiveShadowEngine } from '@/game/engine';
import type { GateDef } from '@/game/types';

const API_URL = 'http://127.0.0.1:8000/api';

export interface Toast {
  id: number;
  title: string;
  body: string;
  tone: 'info' | 'success' | 'warn' | 'danger';
}

interface GameApi {
  state: HunterState;
  ready: boolean;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  syncWithServer: () => Promise<void>;
  incrementStat: (key: StatKey) => void;
  advanceQuest: (key: QuestKey, amount: number) => void;
  clearPenalty: () => void;
  enterGate: (gate: GateDef) => void;
  buyShadow: (shadowId: string) => void;
  setActiveShadow: (shadowId: string | null) => void;
  reset: () => void;
}

const GameContext = createContext<GameApi | null>(null);

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HunterState>(freshHunter);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Синхронизация состояния с реляционной базой данных FastAPI
  const syncWithServer = async () => {
    try {
      const res = await fetch(`${API_URL}/hunter`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) { 
      console.error("Сбой синхронизации с ядром Системы", err); 
    }
  };

  useEffect(() => {
    syncWithServer().then(() => setReady(true));
  }, []);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const api: GameApi = {
    state,
    ready,
    toasts,
    dismissToast,
    pushToast,
    syncWithServer,
    incrementStat: async (key) => {
      try {
        const res = await fetch(`${API_URL}/hunter/train`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stat_key: key })
        });
        if (res.ok) {
          setState(await res.json());
          pushToast({ title: 'Attribute Upgraded', body: `Your ${key} has increased.`, tone: 'success' });
        }
      } catch (err) { console.error(err); }
    },
    
    advanceQuest: async (key, amount) => {
      try {
        const res = await fetch(`${API_URL}/quests/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quest_key: key, amount })
        });
        if (res.ok) {
          const data = await res.json();
          setState(data);
          pushToast({ title: 'Progress Logged', body: `Directive payload transmitted successfully.`, tone: 'info' });
        }
      } catch (err) { console.error(err); }
    },
    
    clearPenalty: async () => {
      try {
        const res = await fetch(`${API_URL}/system/clear-penalty`, { method: 'POST' });
        if (res.ok) {
          setState(await res.json());
          pushToast({ title: 'Penalty Lifted', body: 'The System acknowledges your discipline.', tone: 'info' });
        }
      } catch (err) { console.error(err); }
    },
    
    // ИСПРАВЛЕНО: Безопасный вызов серверного расчета рейда Врат данжа
    enterGate: async (gate) => {
      try {
        const res = await fetch(`${API_URL}/gates/raid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rank: gate.rank,
            label: gate.label,
            min_level: gate.minLevel,
            stat_used: gate.statUsed,
            gold_reward: gate.goldReward,
            xp_reward: gate.xpReward,
            success_rate_base: gate.successRateBase
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setState(data.state); // Синхронизируем состояние Охотника из БД
          
          // Выводим красивый тост-результат на основе серверного рандома!
          pushToast({
            title: data.outcome.success ? 'GATE CLEARED' : 'GATE FAILED',
            body: data.outcome.narrative,
            tone: data.outcome.success ? 'success' : 'danger'
          });
        }
      } catch (err) {
        console.error("Сбой штурма Врат данжа", err);
      }
    },

    // ИСПРАВЛЕНО: Покупка теней через FastAPI
    buyShadow: async (shadowId) => {
      try {
        const sDef = GAME_MODEL.shadows.find(s => s.id === shadowId);
        if (!sDef) return;

        const res = await fetch(`${API_URL}/shadows/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shadow_id: shadowId, cost: sDef.cost })
        });
        
        if (res.ok) {
          setState(await res.json());
          pushToast({ title: 'ARISE', body: 'The soul has been bound to your Shadow Army.', tone: 'success' });
        } else {
          pushToast({ title: 'Extraction Failed', body: 'Insufficient Gold treasury.', tone: 'warn' });
        }
      } catch (err) { console.error(err); }
    },

    // ИСПРАВЛЕНО: Смена активной тени через FastAPI
    setActiveShadow: async (shadowId) => {
      try {
        const res = await fetch(`${API_URL}/shadows/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shadow_id: shadowId })
        });
        if (res.ok) {
          setState(await res.json());
          if (shadowId) pushToast({ title: 'Shadow Deployed', body: 'Passive stat multipliers active.', tone: 'info' });
        }
      } catch (err) { console.error(err); }
    },

    reset: () => {}
  };

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

