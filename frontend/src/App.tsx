import { useState } from 'react';
import { Background } from '@/components/Background';
import { SideNav } from '@/components/SideNav';
import { TopBar } from '@/components/TopBar';
import { Toasts } from '@/components/Toasts';
import { GameProvider, useGame } from '@/game/GameProvider';

// ЖЕСТКИЙ ИМПОРТ ВСЕХ ПЯТИ РАЗДЕЛОВ ИНТЕРФЕЙСА
import { HunterProfile } from '@/sections/HunterProfile';
import { DailyQuest } from '@/sections/DailyQuest';
import { Gates } from '@/sections/Gates';
import { ShadowArmy } from '@/sections/ShadowArmy';
import { AdminPanel } from '@/sections/AdminPanel';
import { SystemChat } from '@/sections/SystemChat';

import { AlertTriangle, Plus } from 'lucide-react';

function Shell() {
  const [tab, setTab] = useState<any>('profile');
  const { state, advanceQuest } = useGame();
  const [penaltyInput, setPenaltyInput] = useState('5');

  if (!state) return null;

  // КРИТИЧЕСКИЙ ОВЕРЛЕЙ: ЕСЛИ АКТИВЕН ШТРАФ СИСТЕМЫ
  if (state.daily && state.daily.penalty) {
    const isEn = state.language === 'en';
    const msg = state.system_message || "";
    const parts = msg.split(":");
    // ИЗМЕНЕНО (пункт 2): защита от битого system_message
    const pKey = parts.length >= 2 ? parts[1] : undefined;
    const pCurr = parts.length >= 3 ? parseFloat(parts[2] || "0") : 0;
    const pTarget = parts.length >= 4 ? parseFloat(parts[3] || "100") : 100;
    const penaltyPct = pTarget > 0 ? (pCurr / pTarget) * 100 : 0;
    const isCorrupted = !pKey;  // ДОБАВЛЕНО: флаг «состояние штрафа повреждено»

    const handleLogPenalty = () => {
      if (!pKey) return;
      const amount = parseFloat(penaltyInput) || 0;
      if (amount <= 0) return;
      advanceQuest(pKey as any, amount);
    };

    return (
      <div className="fixed inset-0 bg-[#040105] z-50 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-red-950/20 to-black grid-bg">
        <div className="hud-panel p-8 max-w-md w-full border border-red-500/40 bg-black/90 shadow-[0_0_30px_rgba(220,38,38,0.2)] text-center relative">
          <span className="corner-tl !border-red-500" /><span className="corner-tr !border-red-500" />
          <span className="corner-bl !border-red-500" /><span className="corner-br !border-red-500" />
          
          <AlertTriangle size={44} className="text-red-500 mx-auto mb-3 animate-bounce" />
          <h1 className="font-display text-2xl md:text-3xl font-black uppercase tracking-[0.2em] text-red-500 text-glow animate-pulse">
            {isEn ? "PENALTY ZONE ACTIVE" : "ШТРАФНАЯ ЗОНА АКТИВНА"}
          </h1>
          <div className="divider-glow !background-gradient-to-r from-transparent via-red-500 to-transparent my-4 h-px w-full" />
          
          <p className="font-mono text-sm text-gray-400 mb-6 leading-relaxed">
            {isEn 
              ? "You failed to clear yesterday's directives. The System has locked your profile. Escape the instance by completing the tax task."
              : "Вы провалили вчерашние директивы. Система заблокировала ваш профиль. Покиньте зону наказания, выполнив норматив."}
          </p>
          
          <div className="border border-red-900/40 bg-red-950/10 p-4 rounded text-left font-mono mb-6">
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{isEn ? 'Penalty Task' : 'Штрафное Задание'}</p>
            <p className="text-base font-bold text-white mt-1 uppercase tracking-wide">{pKey ? pKey.toUpperCase() : 'TRAINING'}</p>
            
            <div className="flex justify-between items-baseline mt-4 mb-1 text-xs">
              <span className="text-gray-500">{isEn ? 'Progress' : 'Выполнено'}</span>
              <span className="text-red-400 font-bold font-display text-sm">{pCurr || 0} / {pTarget || 100}</span>
            </div>
            
            <div className="stat-bar !bg-red-950/40 border border-red-900/30 p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded transition-all duration-300 shadow-[0_0_8px_rgba(220,38,38,0.6)]" 
                style={{ width: `${Math.min(100, penaltyPct)}%` }} 
              />
            </div>
          </div>

          {/* ИЗМЕНЕНО (пункт 2): если состояние повреждено — показываем сообщение,
              а не disabled-кнопку. Пользователь не застрянет «молча». */}
          {isCorrupted ? (
            <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200 font-mono text-xs">
              {isEn
                ? "Penalty state corrupted. Open Admin Panel → Clear Penalty to reset."
                : "Состояние штрафа повреждено. Откройте Админ-панель → Снять штраф для сброса."}
            </div>
          ) : (
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={penaltyInput}
                onChange={(e) => setPenaltyInput(e.target.value)}
                min="0.1"
                step="0.1"
                className="w-24 bg-red-950/30 border border-red-900/40 px-2 py-2 text-white font-mono text-sm text-center focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleLogPenalty}
                disabled={(parseFloat(penaltyInput) || 0) <= 0}
                className="flex-1 btn-hud !border-red-500/40 hover:!border-red-500 hover:!bg-red-900/20 !text-red-400 hover:!text-white flex items-center justify-center gap-2 font-bold py-2 uppercase tracking-widest text-xs"
              >
                <Plus size={14} /> {isEn ? "Log progress" : "Зачесть прогресс"}
              </button>
            </div>
          )}
          {/* УДАЛЕНО (пункт 3): кнопка «[Admin] Clear Penalty».
              Админ-сброс — в AdminPanel. */}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="lg:w-60">
          <SideNav active={tab} onChange={setTab} />
        </div>
        <main className="flex-1">
          <div className="animate-rise">
            {tab === 'profile' && <HunterProfile />}
            {tab === 'quests' && <DailyQuest />}
            {tab === 'gates' && <Gates />}
            {tab === 'shadows' && <ShadowArmy />}
            {tab === 'admin' && <AdminPanel />}
            {tab === 'system_chat' && <SystemChat />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Background />
      <Shell />
      <Toasts />
    </GameProvider>
  );
}
