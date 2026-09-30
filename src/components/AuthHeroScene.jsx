/**
 * Auth hero illustration — a schematic "circuit board" motif: traces
 * converging on nodes, one node pulsing awake at a time. Grounded in the
 * actual subject (a technical training program) rather than a generic
 * pastoral/lifestyle scene. Flat geometry, no third-party artwork.
 */
export default function AuthHeroScene() {
  const nodes = [
    { x: 120, y: 140 }, { x: 340, y: 90 }, { x: 560, y: 160 },
    { x: 680, y: 320 }, { x: 460, y: 380 }, { x: 220, y: 340 },
    { x: 90, y: 460 }, { x: 400, y: 520 },
  ];
  const paths = [
    "M120 140 L340 90", "M340 90 L560 160", "M560 160 L680 320",
    "M220 340 L120 140", "M220 340 L460 380", "M460 380 L680 320",
    "M90 460 L220 340", "M220 340 L400 520", "M400 520 L460 380",
  ];

  return (
    <div className="auth-scene auth-scene--overlay" aria-hidden="true">
      <svg viewBox="0 0 800 600" className="auth-scene__svg" preserveAspectRatio="xMidYMax slice">
        {/* backdrop now supplied by PhotoSlideshow behind this layer */}

        {/* Faint baseline grid — blueprint texture */}
        <g stroke="#16294A" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="600" />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 100} x2="800" y2={i * 100} />
          ))}
        </g>

        {/* Circuit traces */}
        <g fill="none" stroke="#223A63" strokeWidth="2">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Nodes — one after another pulses awake */}
        {nodes.map((n, i) => (
          <g key={i} className="auth-scene__node" style={{ animationDelay: `${i * 0.9}s` }}>
            <circle cx={n.x} cy={n.y} r="16" fill="none" stroke="#F2A900" strokeWidth="1.5" opacity="0.35" />
            <circle cx={n.x} cy={n.y} r="5" fill="#F2A900" />
          </g>
        ))}

        {/* A signal traveling one path, looping */}
        <circle r="4" fill="#F9D372">
          <animateMotion dur="7s" repeatCount="indefinite" path="M120 140 L340 90 L560 160 L680 320 L460 380 L220 340 L120 140" />
        </circle>

        <rect x="0" y="560" width="800" height="1" fill="#223A63" />
      </svg>
    </div>
  );
}
