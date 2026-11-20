import {
  Bug,
  Check,
  Coins,
  Lock,
  ShieldHalf,
  Skull,
  Sparkles,
  Sword,
  Wand2,
} from 'lucide-react';
import { Panel, Tag } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';
import { GAME_MODEL } from '@/game/model';

const ICONS: Record<string, React.ReactNode> = {
  Sword: <Sword size={20} />,
  Bug: <Bug size={20} />,
  ShieldHalf: <ShieldHalf size={20} />,
  Wand2: <Wand2 size={20} />,
  Daggers: <Sword size={20} />,
  Skull: <Skull size={20} />,
};

const RANK_COLOR: Record<string, string> = {
  E: 'border-white/30 text-white/70',
  D: 'border-emerald-500/50 text-emerald-300',
  C: 'border-cyan-glow/50 text-cyan-glow',
  B: 'border-blue-400/60 text-blue-300',
  A: 'border-fuchsia-glow/60 text-fuchsia-glow',
  S: 'border-amber-400/70 text-amber-300',
};

export function ShadowArmy() {
  const { state, buyShadow, setActiveShadow } = useGame();
  const owned = state.shadowsOwned;
  const active = state.activeShadow;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Collection */}
      <Panel
        title="Shadow Army"
        code="SHD-ARMY"
        className="lg:col-span-2"
        actions={<Tag tone="violet">{owned.length} / {GAME_MODEL.shadows.length} Extracted</Tag>}
      >
        <div className="mb-4 border-l-2 border-violet-glow bg-ink-800/60 px-4 py-3">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-violet-neon text-glow">
            &gt; Arise.
          </p>
          <p className="mt-1 font-mono text-xs text-white/50">
            Shadows you've extracted grant passive stat boosts. Deploy one as your active companion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GAME_MODEL.shadows.map((s) => {
            const isOwned = owned.includes(s.id);
            const isActive = active === s.id;
            const affordable = state.gold >= s.cost;
            return (
              <div
                key={s.id}
                className={`relative border bg-ink-800/50 p-4 transition-all ${
                  isActive
                    ? 'border-violet-glow/70 shadow-violet-sm'
                    : isOwned
                      ? 'border-violet-glow/30'
                      : 'border-white/10 hover:border-violet-glow/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center border-2 ${
                      isOwned ? 'border-violet-glow/60 text-violet-neon' : 'border-white/15 text-white/40'
                    }`}
                  >
                    {ICONS[s.icon] ?? <Skull size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-base font-bold text-white">{s.name}</p>
                      <span className={`chip border-2 ${RANK_COLOR[s.rank]}`}>{s.rank}</span>
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-violet-neon/70">
                      {s.epithet}
                    </p>
                    <p className="mt-1 font-mono text-xs text-white/50">{s.blurb}</p>
                  </div>
                </div>

                {/* Boosts */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(s.boost).map(([k, v]) => (
                    <span
                      key={k}
                      className="chip border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    >
                      +{v} {k.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-4">
                  {isOwned ? (
                    isActive ? (
                      <button
                        onClick={() => setActiveShadow(null)}
                        className="btn-hud w-full"
                      >
                        <Check size={14} /> Deployed — Tap to Recall
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveShadow(s.id)}
                        className="btn-hud w-full"
                      >
                        <Sparkles size={14} /> Deploy Shadow
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => buyShadow(s.id)}
                      disabled={!affordable}
                      className="btn-hud w-full"
                    >
                      {affordable ? (
                        <>
                          <Coins size={14} /> Extract · {s.cost} Gold
                        </>
                      ) : (
                        <>
                          <Lock size={14} /> Need {s.cost} Gold
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Shop / treasury */}
      <Panel title="Treasury" code="SHOP">
        <div className="flex flex-col items-center py-2">
          <div className="flex h-20 w-20 items-center justify-center border border-amber-400/50 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <Coins size={34} className="text-amber-300" />
          </div>
          <p className="mt-3 font-display text-3xl font-black text-amber-200 text-glow">
            {state.gold.toLocaleString()}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-200/60">GOLD ON HAND</p>
        </div>

        <div className="mt-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Earning Gold</p>
          <div className="border border-white/10 bg-ink-800/40 p-3">
            <p className="font-mono text-xs text-white/70">+30 per daily quest cleared</p>
          </div>
          <div className="border border-white/10 bg-ink-800/40 p-3">
            <p className="font-mono text-xs text-white/70">+80 bonus for a full daily clear</p>
          </div>
          <div className="border border-white/10 bg-ink-800/40 p-3">
            <p className="font-mono text-xs text-white/70">Gate raid rewards (E → S scaling)</p>
          </div>
        </div>

        <div className="mt-5 border-l-2 border-violet-glow bg-ink-800/60 px-3 py-2">
          <p className="font-mono text-xs text-white/60">
            &gt; Shadows are permanent. Deploying one merges its boosts into your total power.
          </p>
        </div>
      </Panel>
    </div>
  );
}
