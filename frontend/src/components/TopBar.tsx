import { Coins, Languages } from 'lucide-react';
import { useGame } from '@/game/GameProvider';
import { useMidnightCountdown, formatDuration } from '@/components/Panel';
import coreImage from '../assets/img/Level.jpg';

export function TopBar() {
  // ИЗМЕНЕНО: убран неиспользуемый `reset` (мёртвый код) и `RotateCcw` из импортов.
  // ДОБАВЛЕНО: `syncWithServer` для обновления состояния после смены языка.
  const { state, syncWithServer } = useGame();
  const remaining = useMidnightCountdown();
  const isEn = state.language === 'en';

  const toggleLanguage = async () => {
    const nextLang = state.language === 'ru' ? 'en' : 'ru';

    try {
      const res = await fetch('http://localhost:8000/api/hunter/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: nextLang })
      });

      if (res.ok) {
        // ИЗМЕНЕНО: вместо мутации state.language + window.location.reload()
        // — синхронизация с бэком. Все компоненты перерисуются через setState.
        await syncWithServer();
      }
    } catch (error) {
      console.error('Ошибка сохранения языка на бэкенде:', error);
    }
  };

  // ДОБАВЛЕНО: фильтр penalty-сообщения — не показываем сырую строку PENALTY_ACTIVE:...
  const displayMessage = state.system_message?.startsWith('PENALTY_ACTIVE:')
    ? (isEn ? 'PENALTY ACTIVE — complete the penalty task' : 'ШТРАФ АКТИВЕН — выполните штрафное задание')
    : (state.system_message || (isEn ? 'System Stabilized.' : 'Система Стабилизирована.'));

  // ДОБАВЛЕНО: защита от undefined (пока freshHunter не приведён к HunterState)
  const xp = state.xp ?? 0;
  const xpNeeded = state.xp_needed ?? 1;

  return (
    <header className="hud-panel relative flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />

      {/* Бренд Системы */}
      <div className="flex items-center gap-3">
        <div className="mb-4 relative overflow-hidden border border-purple-900/30 rounded bg-black/40 p-1 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <img 
              src={coreImage}
              alt="Solo Leveling Core" 
              className="w-full h-20 object-cover opacity-80 hover:opacity-100 transition-opacity duration-300 border border-purple-950/40"
            />
            <span className="corner-tl" /><span className="corner-tr" />
            <span className="corner-bl" /><span className="corner-br" />
        </div>
        <div className="leading-none">
          <p className="font-display text-lg font-extrabold uppercase tracking-[0.3em] text-white text-glow">
            {isEn ? 'ARISE' : 'ARISE'}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-neon/70">
            {isEn ? 'System Interface' : 'Интерфейс Системы'}
          </p>
        </div>
      </div>

      {/* Системное бегущее уведомление от FastAPI */}
      <div className="hidden flex-1 max-w-md bg-black/40 border border-purple-950/40 px-3 py-1.5 rounded truncate font-mono text-xs text-purple-300 md:block animate-pulse-glow">
        &gt; {displayMessage}
      </div>

      {/* Уровень + Опыт */}
      <div className="flex min-w-[150px] items-center gap-3">
        <span className="font-display text-2xl font-black text-white text-glow">{state.level}</span>
        <div className="flex-1">
          <div className="mb-1 flex justify-between font-mono text-[9px] uppercase text-white/50">
            <span>XP</span>
            <span>{xp}/{xpNeeded}</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${Math.min(100, (xp / xpNeeded) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Валюта и Переключатель Языка */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs text-amber-200">
          <Coins size={14} className="text-amber-300" />
          <span>{state.gold.toLocaleString()} G</span>
        </div>

        <button onClick={toggleLanguage} className="btn-hud !px-2.5 !py-1.5 flex items-center gap-1.5 font-mono text-xs">
          <Languages size={14} />
          <span className="uppercase font-bold text-white">{state.language}</span>
        </button>

        <div className="hidden flex-col items-end sm:flex font-mono text-[9px]">
          <span className="text-white/40">{isEn ? 'RESET IN' : 'СБРОС ЧЕРЕЗ'}</span>
          <span className="text-sm text-violet-neon tabular-nums">{formatDuration(remaining)}</span>
        </div>
      </div>
    </header>
  );
}