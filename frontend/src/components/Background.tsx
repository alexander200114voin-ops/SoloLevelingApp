export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      {/* Radial violet glow */}
      <div
        className="absolute left-1/2 top-0 h-[70vh] w-[120vw] -translate-x-1/2 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(124, 58, 237, 0.25) 0%, rgba(168, 85, 247, 0.08) 35%, transparent 70%)',
        }}
      />
      {/* Grid */}
      <div className="grid-bg absolute inset-0 opacity-60" />
      {/* Scanline sweep */}
      <div
        className="absolute left-0 h-32 w-full animate-scan opacity-30"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(168, 85, 247, 0.12), transparent)',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4, 2, 10, 0.85) 100%)',
        }}
      />
      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-violet-neon"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            opacity: p.o,
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.8)',
            animation: `flicker ${p.d}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

const PARTICLES = Array.from({ length: 26 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  s: 1 + Math.random() * 2.5,
  o: 0.2 + Math.random() * 0.5,
  d: 2 + Math.random() * 6,
}));
