import { useEffect, useState } from 'react';

export function Panel({
  title,
  code,
  children,
  className = '',
  actions,
}: {
  title: string;
  code?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={`hud-panel p-5 ${className}`}>
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />
      <header className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse-glow bg-violet-glow shadow-violet-sm" />
          <h2 className="font-display text-base font-bold uppercase tracking-[0.22em] text-white text-glow">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {code && (
            <span className="chip border-violet-glow/30 bg-ink-700/60 text-violet-neon/80">{code}</span>
          )}
        </div>
      </header>
      <div className="divider-glow mb-4 h-px w-full" />
      <div className="relative">{children}</div>
    </section>
  );
}

export function StatBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`stat-bar ${className}`}>
      <div className="stat-bar-fill transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Tag({
  children,
  tone = 'violet',
}: {
  children: React.ReactNode;
  tone?: 'violet' | 'cyan' | 'fuchsia' | 'muted' | 'danger' | 'success';
}) {
  const tones: Record<string, string> = {
    violet: 'border-violet-glow/40 bg-violet-deep/15 text-violet-neon',
    cyan: 'border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow',
    fuchsia: 'border-fuchsia-glow/40 bg-fuchsia-glow/10 text-fuchsia-glow',
    muted: 'border-white/15 bg-white/5 text-white/70',
    danger: 'border-red-500/50 bg-red-500/10 text-red-300',
    success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

// Hook: time until next local midnight, updating every second.
export function useMidnightCountdown() {
  const [remaining, setRemaining] = useState(() => msUntilMidnight());
  useEffect(() => {
    const t = setInterval(() => setRemaining(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  return remaining;
}

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
