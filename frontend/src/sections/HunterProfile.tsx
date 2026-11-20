import {
  BookOpen,
  Code2,
  Dumbbell,
  Footprints,
  Plus,
  Sparkles,
  Swords,
  Shield,
  Brain,
  Hand,
} from 'lucide-react';
import { Panel, StatBar, Tag } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';
import { GAME_MODEL } from '@/game/model';
import { powerLevel, totalStats } from '@/game/engine';
import type { StatKey } from '@/game/types';

const STAT_ORDER: StatKey[] = ['strength', 'agility', 'intelligence', 'dexterity'];

export function HunterProfile() {
  const { state, incrementStat } = useGame();
  const totals = totalStats(state);
  const pl = powerLevel(state);
  
  const isEn = state.language === 'en';
  
  // Динамические метаданные характеристик в зависимости от языка
  const STAT_META: Record<StatKey, { label: string; desc: string; icon: React.ReactNode }> = {
    strength: { label: isEn ? 'Strength' : 'Сила', desc: isEn ? 'Trained via Push-ups' : 'Качается отжиманиями', icon: <Dumbbell size={16} /> },
    agility: { label: isEn ? 'Agility' : 'Ловкость', desc: isEn ? 'Trained via Running' : 'Качается бегом', icon: <Footprints size={16} /> },
    intelligence: { label: isEn ? 'Intelligence' : 'Интеллект', desc: isEn ? 'Trained via Studying' : 'Качается учебой', icon: <BookOpen size={16} /> },
    dexterity: { label: isEn ? 'Dexterity' : 'Выносливость', desc: isEn ? 'Trained via Coding' : 'Качается кодингом', icon: <Code2 size={16} /> },
  };

  const activeShadow = state.activeShadow
    ? GAME_MODEL.shadows.find((s) => s.id === state.activeShadow)
    : null;

  // Рассчитываем процент опыта прямо на лету из базы данных
  const xpPct = state.xp_needed > 0 ? (state.xp / state.xp_needed) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* ЛЕВАЯ КОЛОНКА: КАРТОЧКА ОХОТНИКА */}
      <Panel title={isEn ? "Hunter Profile" : "Профиль Охотника"} code="PRF-01" className="lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="flex h-32 w-32 items-center justify-center border border-violet-glow/50 bg-ink-700/60 shadow-violet">
              <span className="font-display text-5xl font-black text-white text-glow">
                {state.level}
              </span>
            </div>
            <div className="absolute -inset-1 -z-10 animate-pulse-glow rounded-full bg-violet-glow/20 blur-xl" />
            <span className="corner-tl" />
            <span className="corner-tr" />
            <span className="corner-bl" />
            <span className="corner-br" />
          </div>

          <h3 className="font-display text-xl font-bold text-white text-glow">{state.name}</h3>
          <p className="mt-1 font-mono text-sm uppercase tracking-widest text-violet-neon">
            {isEn ? state.title_en : state.title_ru}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Tag tone="violet">
              <Sparkles size={12} /> LV {state.level}
            </Tag>
            <Tag tone="cyan">{isEn ? 'PWR' : 'МОЩЬ'} {pl.toLocaleString()}</Tag>
            <Tag tone="muted">{state.shadowsOwned ? state.shadowsOwned.length : 0} {isEn ? 'Shadows' : 'Теней'}</Tag>
          </div>

          {/* СЕКЦИЯ ОПЫТА (XP) */}
          <div className="mt-5 w-full">
            <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-white/60">
              <span>{isEn ? 'Experience' : 'Опыт Охотника'}</span>
              <span className="text-violet-neon">
                {state.xp} / {state.xp_needed}
              </span>
            </div>
            <StatBar value={state.xp} max={state.xp_needed} />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
              {Math.round(xpPct)}% {isEn ? `to Level ${state.level + 1}` : `до уровня ${state.level + 1}`}
            </p>
          </div>

          {activeShadow && (
            <div className="mt-5 w-full border border-violet-glow/30 bg-violet-deep/10 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-violet-neon/70">
                {isEn ? 'Active Shadow' : 'Active Shadow'}
              </p>
              <p className="font-display text-sm text-white">{activeShadow.name}</p>
              <p className="font-mono text-xs text-white/60">{activeShadow.epithet}</p>
            </div>
          )}
        </div>
      </Panel>

      {/* ПРАВАЯ КОЛОНКА: ХАРАКТЕРИСТИКИ */}
      <Panel
        title={isEn ? "Core Attributes" : "Основные Характеристики"}
        code="STAT"
        className="lg:col-span-2"
        actions={
          <span className="chip border-violet-glow/40 bg-violet-deep/20 text-violet-neon">
            {state.statPoints} PTS
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STAT_ORDER.map((key) => {
            const meta = STAT_META[key];
            const base = state.stats ? state.stats[key] : 10;
            const total = totals[key];
            const boost = total - base;
            return (
              <div
                key={key}
                className="group relative border border-white/10 bg-ink-800/60 p-4 transition-colors hover:border-violet-glow/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center border border-violet-glow/40 bg-violet-deep/15 text-violet-neon">
                      {meta.icon}
                    </span>
                    <div>
                      <p className="font-display text-sm uppercase tracking-widest text-white">{meta.label}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{meta.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => incrementStat(key)}
                    disabled={state.statPoints <= 0}
                    className="btn-plus"
                    aria-label="Add Point"
                    title={`Add 1 point (${state.statPoints} left)`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-black text-white text-glow">{total}</span>
                    {boost > 0 && (
                      <span className="font-mono text-sm text-emerald-300">+{boost}</span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {isEn ? 'base' : 'база'} {base}
                  </span>
                </div>
                <StatBar value={total} max={100} className="mt-2" />
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: isEn ? 'Melee' : 'Ближний бой', icon: <Swords size={14} />, val: totals.strength + totals.agility },
            { label: isEn ? 'Defense' : 'Защита', icon: <Shield size={14} />, val: totals.strength + totals.dexterity },
            { label: isEn ? 'Focus' : 'Концентрация', icon: <Brain size={14} />, val: totals.intelligence + totals.dexterity },
            { label: isEn ? 'Skill' : 'Навык', icon: <Hand size={14} />, val: totals.agility + totals.dexterity },
          ].map((d) => (
            <div key={d.label} className="border border-white/10 bg-ink-800/40 p-3 text-center">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center text-violet-neon">
                {d.icon}
              </div>
              <p className="font-display text-xl font-bold text-white">{d.val}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{d.label}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
