import { Coins, Zap, Languages, RotateCcw, Skull } from 'lucide-react';
import { useGame } from '@/game/GameProvider';
import { useMidnightCountdown, formatDuration } from '@/components/Panel';
import coreImage from '../assets/img/Level.jpg';

export function TopBar() {
  const { state, reset } = useGame();
  const remaining = useMidnightCountdown();
  const isEn = state.language === 'en';

  const toggleLanguage = async () => {
  // 1. Вычисляем следующий язык
  const nextLang = state.language === 'ru' ? 'en' : 'ru';
  
  // 2. Мгновенно меняем язык прямо в памяти интерфейса (без перезагрузки страницы!)
  state.language = nextLang; 

  try {
    // 3. Отправляем запрос на бэкенд фоном
    const res = await fetch('http://localhost:8000/api/hunter/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: nextLang })
    });
    
    if (res.ok) {
      // Жестко обновляем глобальное состояние, чтобы все вкладки перерисовались
      window.location.reload();
    }
  } catch (error) {
    console.error('Ошибка сохранения языка на бэкенде:', error);
  }
  };


  return (
    <header class="hud-panel relative flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      <span class="corner-tl" />
      <span class="corner-tr" />
      <span class="corner-bl" />
      <span class="corner-br" />

      {/* Бренд Системы */}
      <div class="flex items-center gap-3">
        <div className="mb-4 relative overflow-hidden border border-purple-900/30 rounded bg-black/40 p-1 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <img 
              src={coreImage}
              alt="Solo Leveling Core" 
              className="w-full h-20 object-cover opacity-80 hover:opacity-100 transition-opacity duration-300 border border-purple-950/40"
            />
            <span className="corner-tl" /><span className="corner-tr" />
            <span className="corner-bl" /><span className="corner-br" />
        </div>
        <div class="leading-none">
          <p class="font-display text-lg font-extrabold uppercase tracking-[0.3em] text-white text-glow">
            {isEn ? 'ARISE' : 'ВОССТАНЬ'}
          </p>
          <p class="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-neon/70">
            {isEn ? 'System Interface' : 'Интерфейс Системы'}
          </p>
        </div>
      </div>

      {/* Системное бегущее уведомление от FastAPI */}
      <div class="hidden flex-1 max-w-md bg-black/40 border border-purple-950/40 px-3 py-1.5 rounded truncate font-mono text-xs text-purple-300 md:block animate-pulse-glow">
        &gt; {state.system_message || (isEn ? 'System Stabilized.' : 'Система Стабилизирована.')}
      </div>

      {/* Уровень + Опыт */}
      <div class="flex min-w-[150px] items-center gap-3">
        <span class="font-display text-2xl font-black text-white text-glow">{state.level}</span>
        <div class="flex-1">
          <div class="mb-1 flex justify-between font-mono text-[9px] uppercase text-white/50">
            <span>XP</span>
            <span>{state.xp}/{state.xp_needed}</span>
          </div>
          <div class="stat-bar">
            <div class="stat-bar-fill" style={{ width: `${Math.min(100, (state.xp / state.xp_needed) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Валюта и Переключатель Языка */}
      <div class="flex items-center gap-3 ml-auto">
        <div class="flex items-center gap-2 border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs text-amber-200">
          <Coins size={14} class="text-amber-300" />
          <span>{state.gold.toLocaleString()} G</span>
        </div>

        <button onClick={toggleLanguage} class="btn-hud !px-2.5 !py-1.5 flex items-center gap-1.5 font-mono text-xs">
          <Languages size={14} />
          <span class="uppercase font-bold text-white">{state.language}</span>
        </button>

        <div class="hidden flex-col items-end sm:flex font-mono text-[9px]">
          <span class="text-white/40">{isEn ? 'RESET IN' : 'СБРОС ЧЕРЕЗ'}</span>
          <span class="text-sm text-violet-neon tabular-nums">{formatDuration(remaining)}</span>
        </div>
      </div>
    </header>
  );
}
