import { AlertTriangle, Info, ShieldCheck, X, Zap } from 'lucide-react';
import { useGame } from '@/game/GameProvider';

const toneMap: Record<string, { ring: string; icon: React.ReactNode; bar: string }> = {
  info: { ring: 'border-cyan-glow/50', icon: <Info size={16} />, bar: 'bg-cyan-glow' },
  success: { ring: 'border-emerald-500/50', icon: <ShieldCheck size={16} />, bar: 'bg-emerald-400' },
  warn: { ring: 'border-amber-500/50', icon: <AlertTriangle size={16} />, bar: 'bg-amber-400' },
  danger: { ring: 'border-red-500/60', icon: <Zap size={16} />, bar: 'bg-red-500' },
};

export function Toasts() {
  const { toasts, dismissToast } = useGame();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const tone = toneMap[t.tone] ?? toneMap.info;
        return (
          <div
            key={t.id}
            className={`hud-panel animate-rise pointer-events-auto relative overflow-hidden border ${tone.ring} bg-ink-850/95 p-3 pr-8`}
          >
            <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-violet-neon">{tone.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs uppercase tracking-widest text-white">{t.title}</p>
                <p className="font-mono text-sm text-white/70">{t.body}</p>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="absolute right-2 top-2 text-white/40 transition hover:text-white"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
