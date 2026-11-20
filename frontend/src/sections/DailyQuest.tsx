import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Dumbbell,
  Footprints,
  Minus,
  Plus,
  Skull,
  TimerReset,
} from 'lucide-react';
import { Panel, StatBar, Tag, formatDuration, useMidnightCountdown } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';

const STEP: Record<string, number> = {
  pushups: 5,
  running: 1,
  studying: 15,
  coding: 15,
};

// Простая функция для подбора иконки по ключу квеста
function TaskIcon({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    pushups: <Dumbbell size={18} />,
    running: <Footprints size={18} />,
    studying: <BookOpen size={18} />,
    coding: <Code2 size={18} />,
  };
  return map[name] ?? <Dumbbell size={18} />;
}

export function DailyQuest() {
  const { state, advanceQuest } = useGame();
  const remaining = useMidnightCountdown();
  const isEn = state.language === 'en';

  // Безопасная проверка: если база данных еще не загрузилась
  if (!state.daily || !state.daily.quests) {
    return <div className="text-purple-400 font-mono text-xs">Loading directives...</div>;
  }

  const allDone = state.daily.quests.length > 0 && state.daily.quests.every((q) => q.completed);
  const completedCount = state.daily.quests.filter((q) => q.completed).length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Panel
        title={isEn ? "Daily Quest" : "Ежедневный Квест"}
        code="SYS-DQ"
        className="lg:col-span-2"
        actions={<Tag tone={allDone ? 'success' : 'violet'}>{completedCount}/{state.daily.quests.length}</Tag>}
      >
        {/* Системный баннер */}
        <div className="mb-4 border-l-2 border-violet-glow bg-ink-800/60 px-4 py-3">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-violet-neon text-glow">
            &gt; {isEn ? 'Daily Directives Received' : 'Получены Ежедневные Директивы'}
          </p>
          <p className="mt-1 font-mono text-xs text-white/50">
            {isEn 
              ? 'The System has issued your mandatory training. Complete all before midnight — or face the Penalty Quest.' 
              : 'Система выдала обязательную тренировку. Выполните все до полуночи, иначе активируется Штрафной Квест.'}
          </p>
        </div>

        {/* Список динамических квестов */}
        <div className="flex flex-col gap-3">
          {state.daily.quests.map((q) => {
            const step = STEP[q.key] ?? 5;
            const isOver = q.progress > q.target;
            return (
              <div
                key={q.key}
                className={`relative border bg-ink-800/50 p-4 transition-all ${
                  q.completed
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-white/10 hover:border-violet-glow/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center border ${
                        q.completed
                          ? 'border-emerald-500/50 text-emerald-300'
                          : 'border-violet-glow/40 bg-violet-deep/15 text-violet-neon'
                      }`}
                    >
                      {q.completed ? <CheckCircle2 size={18} /> : <TaskIcon name={q.key} />}
                    </span>
                    <div>
                      <p className="font-display text-sm uppercase tracking-widest text-white">
                        {isEn ? q.label_en : q.label_ru}
                      </p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                        {isEn ? 'Target' : 'Цель'}: {q.target} {isEn ? q.unit_en : q.unit_ru}
                        {/* ДОБАВЛЕНО: бейдж OVER при прогрессе сверх нормы (пункт 4) */}
                        {isOver && (
                          <span className="ml-2 text-emerald-300">+{Math.round(q.progress - q.target)} OVER</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Кнопки управления прогрессом */}
                  <div className="flex items-center gap-2">
                    {/* ИЗМЕНЕНО (пункт 1): «−» доступна всегда при progress > 0.
                        Раньше: disabled={q.progress <= 0 || q.progress <= q.target}
                        Теперь: disabled={q.progress <= 0} */}
                    <button
                      onClick={() => advanceQuest(q.key as any, -step)}
                      disabled={q.progress <= 0}
                      className="btn-hud !px-2 !py-2"
                      aria-label="Decrease"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[90px] text-right font-mono text-sm tabular-nums text-white">
                      {Math.round(q.progress)}<span className="text-white/40">/{q.target}</span> {isEn ? q.unit_en : q.unit_ru}
                    </span>
                    {/* ИЗМЕНЕНО (пункт 4): «+» всегда доступен */}
                    <button
                      onClick={() => advanceQuest(q.key as any, step)}
                      className="btn-hud !px-2 !py-2"
                      aria-label="Increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <StatBar value={q.progress} max={q.target} />
                </div>
                {q.completed && (
                  <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                    {isEn ? 'CLEARED' : 'ВЫПОЛНЕНО'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="mt-5 animate-pop border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center">
            <p className="font-display text-sm uppercase tracking-[0.2em] text-emerald-200">
              {isEn ? 'All Directives Cleared — The System is Satisfied' : 'Все директивы выполнены — Система удовлетворена'}
            </p>
          </div>
        )}
      </Panel>

      {/* Правая колонка: Таймер и Штраф */}
      <div className="flex flex-col gap-5">
        <Panel title={isEn ? "Time Remaining" : "Времени осталось"} code="T-MIN">
          <div className="flex flex-col items-center py-2">
            <TimerReset size={28} className="mb-2 text-violet-neon animate-pulse-glow" />
            <p className="font-display text-4xl font-black tabular-nums text-white text-glow">
              {formatDuration(remaining)}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
              {isEn ? 'until reset at 00:00 local' : 'до сброса в 00:00'}
            </p>
            <div className="mt-4 flex w-full items-center gap-2 text-white/50">
              <Clock size={14} />
              <span className="font-mono text-xs">{isEn ? 'Quests refresh at midnight' : 'Квесты обновляются в полночь'}</span>
            </div>
          </div>
        </Panel>

        <Panel title={isEn ? "Penalty Quest" : "Штрафной Квест"} code="SYS-PN">
          {state.daily.penalty ? (
            <div className="border border-red-500/50 bg-red-500/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                <p className="font-display text-sm uppercase tracking-widest text-red-300">
                  {isEn ? 'PENALTY ACTIVE' : 'ШТРАФ АКТИВИРОВАН'}
                </p>
              </div>
              <p className="font-mono text-xs text-white/70">
                {isEn 
                  ? "You failed to complete the prior day's directives. The System demands restitution. Complete the penalty task to unlock your profile." 
                  : "Вы провалили вчерашние директивы. Система требует возмещения ущерба. Выполните штрафное задание, чтобы разблокировать профиль."}
              </p>
              {/* УДАЛЕНО (пункт 3): кнопка «Acknowledge & Clear».
                  Штраф снимается только выполнением penalty-квеста.
                  Для админ-сброса — используйте AdminPanel. */}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Skull size={32} className="mb-2 text-white/20" />
              <p className="font-display text-sm uppercase tracking-widest text-white/40">
                {isEn ? 'No Penalty' : 'Штрафов нет'}
              </p>
              <p className="mt-1 font-mono text-xs text-white/30">
                {isEn 
                  ? "Keep clearing your daily quests to avoid the System's wrath." 
                  : "Регулярно выполняйте квесты, чтобы не разгневать Систему."}
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}