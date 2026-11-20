import { Crown, Dumbbell, Swords, Skull, User, MessageSquare } from 'lucide-react';
import type { TabKey } from '@/game/types';
import { useGame } from '@/game/GameProvider';
import { powerLevel } from '@/game/engine';

export function SideNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const { state } = useGame();
  const pl = powerLevel(state);
  const isEn = state.language === 'en';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; hint: string }[] = [
 { key: 'profile', label: isEn ? 'Hunter' : 'Охотник', icon: <User size={18} />, hint: isEn ? 'Profile & Stats' : 'Профиль и Статы' },
    { key: 'quests', label: isEn ? 'Quests' : 'Квесты', icon: <Dumbbell size={18} />, hint: isEn ? 'Daily Directives' : 'Директивы дня' },
    { key: 'gates', label: isEn ? 'Gates' : 'Врата', icon: <Swords size={18} />, hint: isEn ? 'Dungeon Raids' : 'Рейды в данжи' },
    { key: 'shadows', label: isEn ? 'Shadows' : 'Тени', icon: <Skull size={18} />, hint: isEn ? 'Army & Shop' : 'Армия и Магазин' },
    { key: 'system_chat', label: isEn ? 'System AI' : 'ИИ Системы', icon: <MessageSquare size={18} />, hint: isEn ? 'Monarch Link' : 'Связь с Монархом' },
    { key: 'admin', label: isEn ? 'System admin' : 'Система администратора', icon: <MessageSquare size={18} />, hint: isEn ? 'Quests control' : 'Власть над квестами' },
];

  return (
    <nav className="hud-panel flex h-full w-full flex-col gap-1 p-3 md:w-60">
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />

      {/* Identity */}
      <div className="mb-4 mt-1 px-2 pt-2">
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-violet-neon/70">Operator</p>
        <p className="mt-1 truncate font-display text-base font-bold text-white text-glow">{state.name}</p>
        <p className="font-mono text-xs text-white/50">PWR {pl.toLocaleString()}</p>
      </div>

      <div className="divider-glow mb-3 h-px w-full" />

      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`group relative flex items-center gap-3 border px-3 py-2.5 text-left transition-all duration-200 ${
              isActive
                ? 'border-violet-glow/60 bg-violet-deep/20 text-white shadow-violet-sm'
                : 'border-transparent text-white/55 hover:border-violet-glow/30 hover:bg-violet-deep/10 hover:text-white'
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center border ${
                isActive ? 'border-violet-glow/60 text-violet-neon' : 'border-white/10 text-white/60'
              }`}
            >
              {t.icon}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-display text-sm uppercase tracking-[0.18em]">{t.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{t.hint}</span>
            </span>
            {isActive && <span className="absolute left-0 top-0 h-full w-0.5 bg-violet-glow shadow-violet-sm" />}
          </button>
        );
      })}

      <div className="mt-auto px-2 pt-4">
        <div className="flex items-center gap-2 border border-amber-400/30 bg-amber-400/5 px-3 py-2">
          <Crown size={14} className="text-amber-300" />
          <span className="font-mono text-xs text-amber-200/80">MONARCH PROTOCOL</span>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/30">v1.0 · local sync</p>
      </div>
    </nav>
  );
}
