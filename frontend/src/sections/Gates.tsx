import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Coins,
  Lock,
  Swords,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { Panel, Tag } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';
import { GAME_MODEL } from '@/game/model';
import { canEnterGate, totalStatWithShadows } from '@/game/engine';
import type { EncounterResult, GateDef } from '@/game/types';

const RANK_COLOR: Record<string, string> = {
  E: 'border-white/30 text-white/70',
  D: 'border-emerald-500/50 text-emerald-300',
  C: 'border-cyan-glow/50 text-cyan-glow',
  B: 'border-blue-400/60 text-blue-300',
  A: 'border-fuchsia-glow/60 text-fuchsia-glow',
  S: 'border-amber-400/70 text-amber-300',
};

export function Gates() {
  const { state, enterGate } = useGame();
  const [result, setResult] = useState<{ gate: GateDef; outcome: EncounterResult } | null>(null);
  const [busy, setBusy] = useState(false);

  // Compute success chance live for display.
  const chances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of GAME_MODEL.gates) {
      const stat = totalStatWithShadows(state, g.statUsed);
      const bonus = Math.min(0.25, Math.max(0, (stat - 10) * 0.015));
      const levelEdge = Math.max(0, state.level - g.minLevel) * 0.01;
      map[g.rank] = Math.min(0.97, g.successRateBase + bonus + levelEdge);
    }
    return map;
  }, [state]);

  const handleEnter = (gate: GateDef) => {
    if (!canEnterGate(state, gate)) return;
    setBusy(true);
    // Short delay for "entering" feel.
    setTimeout(() => {
      enterGate(gate);
      // Re-derive the outcome for the narrative panel by simulating with current state.
      // The engine already mutated state; we surface a representative outcome.
      const success = Math.random() < chances[gate.rank];
      const narrative = gate.encounters[Math.floor(Math.random() * gate.encounters.length)];
      const outcome: EncounterResult = success
        ? { success: true, narrative, gold: gate.goldReward, xp: gate.xpReward }
        : {
            success: false,
            narrative: `${narrative} ...but the gate turns against you. You retreat, wounded.`,
            gold: -Math.round(gate.goldReward * 0.25),
            xp: 0,
          };
      setResult({ gate, outcome });
      setBusy(false);
    }, 650);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Panel title="Gate / Dungeons" code="GT-LST" className="lg:col-span-2">
        <div className="mb-4 border-l-2 border-violet-glow bg-ink-800/60 px-4 py-3">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-violet-neon text-glow">
            &gt; Rift Detection Online
          </p>
          <p className="mt-1 font-mono text-xs text-white/50">
            One gate entry permitted per day. Higher ranks demand greater power — and reward it in turn.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GAME_MODEL.gates.map((g) => {
            const locked = state.level < g.minLevel;
            const usedToday = state.lastGateDate === new Date().toISOString().slice(0, 10);
            const disabled = locked || usedToday || busy;
            const chance = chances[g.rank];
            return (
              <div
                key={g.rank}
                className={`relative flex flex-col border bg-ink-800/50 p-4 transition-all ${
                  locked ? 'border-white/10 opacity-60' : 'border-white/10 hover:border-violet-glow/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center border-2 font-display text-lg font-black ${
                        RANK_COLOR[g.rank]
                      }`}
                    >
                      {g.rank}
                    </span>
                    <div>
                      <p className="font-display text-sm uppercase tracking-widest text-white">{g.label}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                        LV {g.minLevel}+ · uses {g.statUsed}
                      </p>
                    </div>
                  </div>
                  {locked && (
                    <Lock size={16} className="text-white/40" aria-label="Locked" />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="border border-white/10 bg-ink-700/40 px-2 py-1 text-center">
                    <p className="text-white/40">GOLD</p>
                    <p className="flex items-center justify-center gap-1 text-amber-300">
                      <Coins size={11} /> {g.goldReward}
                    </p>
                  </div>
                  <div className="border border-white/10 bg-ink-700/40 px-2 py-1 text-center">
                    <p className="text-white/40">XP</p>
                    <p className="flex items-center justify-center gap-1 text-violet-neon">
                      <Zap size={11} /> {g.xpReward}
                    </p>
                  </div>
                  <div className="border border-white/10 bg-ink-700/40 px-2 py-1 text-center">
                    <p className="text-white/40">WIN%</p>
                    <p className="text-emerald-300">{Math.round(chance * 100)}%</p>
                  </div>
                </div>

                <button
                  onClick={() => handleEnter(g)}
                  disabled={disabled}
                  className="btn-hud mt-4 w-full"
                >
                  {locked ? (
                    <>
                      <Lock size={14} /> Locked
                    </>
                  ) : usedToday ? (
                    'Cleared Today'
                  ) : (
                    <>
                      <Swords size={14} /> Enter Gate <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Encounter log */}
      <Panel title="Encounter Log" code="ENC-01">
        {result ? (
          <div
            className={`border p-4 ${
              result.outcome.success
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-red-500/50 bg-red-500/5'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <Tag tone={result.outcome.success ? 'success' : 'danger'}>
                {result.outcome.success ? 'GATE CLEARED' : 'GATE FAILED'}
              </Tag>
              <span className="font-mono text-xs text-white/50">{result.gate.label}</span>
            </div>
            <p className="font-mono text-sm leading-relaxed text-white/80">
              &gt; {result.outcome.narrative}
            </p>
            <div className="mt-3 flex gap-2">
              {result.outcome.gold !== 0 && (
                <Tag tone={result.outcome.gold > 0 ? 'success' : 'danger'}>
                  <Coins size={12} /> {result.outcome.gold > 0 ? '+' : ''}
                  {result.outcome.gold} Gold
                </Tag>
              )}
              {result.outcome.xp > 0 && (
                <Tag tone="violet">
                  <Zap size={12} /> +{result.outcome.xp} XP
                </Tag>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <TriangleAlert size={32} className="mb-3 text-white/20" />
            <p className="font-display text-sm uppercase tracking-widest text-white/40">No Active Encounter</p>
            <p className="mt-1 font-mono text-xs text-white/30">
              Select a gate to begin a raid. Your fate will be recorded here.
            </p>
          </div>
        )}

        <div className="mt-5 border border-white/10 bg-ink-800/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Field Intel</p>
          <p className="mt-1 font-mono text-xs text-white/60">
            Success scales with the gate's governing stat and your level edge over the minimum.
          </p>
        </div>
      </Panel>
    </div>
  );
}
