/**
 * Homepage hero — the same schematic circuit language as the login
 * screen's AuthHeroScene, scaled up, with the mark itself resting at the
 * network's central node. One orchestrated moment: nodes wake in sequence,
 * a signal travels the trace loop, and the mark drifts and glows softly.
 * No stock imagery — grounded in the same "training signal, tracked
 * end to end" idea the product is actually about.
 */
export default function HomeHeroScene() {
  const nodes = [
    { x: 90, y: 120 }, { x: 300, y: 70 }, { x: 520, y: 130 },
    { x: 640, y: 300 }, { x: 560, y: 470 }, { x: 340, y: 520 },
    { x: 150, y: 440 }, { x: 60, y: 280 }, { x: 400, y: 300 },
  ];
  const paths = [
    "M90 120 L300 70", "M300 70 L520 130", "M520 130 L640 300",
    "M640 300 L560 470", "M560 470 L340 520", "M340 520 L150 440",
    "M150 440 L60 280", "M60 280 L90 120",
    "M300 70 L400 300", "M400 300 L560 470",
    "M150 440 L400 300", "M400 300 L520 130",
  ];

  return (
    <div className="home-scene home-scene--overlay" aria-hidden="true">
      <svg viewBox="0 0 700 600" className="home-scene__svg" preserveAspectRatio="xMidYMid slice">
        {/* backdrop now supplied by PhotoSlideshow behind this layer */}

        <g className="hero-grid-fade" stroke="#16294A" strokeWidth="1">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="600" />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 100} x2="700" y2={i * 100} />
          ))}
        </g>

        <g fill="none" stroke="#223A63" strokeWidth="2">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {nodes.map((n, i) => (
          <g key={i} className="auth-scene__node" style={{ animationDelay: `${i * 0.7}s` }}>
            <circle cx={n.x} cy={n.y} r="14" fill="none" stroke="#F2A900" strokeWidth="1.5" opacity="0.3" />
            <circle cx={n.x} cy={n.y} r="4.5" fill="#F2A900" />
          </g>
        ))}

        <circle r="4" fill="#F9D372">
          <animateMotion
            dur="9s"
            repeatCount="indefinite"
            path="M90 120 L300 70 L520 130 L640 300 L560 470 L340 520 L150 440 L60 280 L90 120"
          />
        </circle>
      </svg>

      {/* The mark itself — resting inside the network, glowing, drifting */}
      <div className="home-scene__mark">
        <svg viewBox="0 0 200 200" className="hero-mark__ring absolute inset-0 w-full h-full">
          <circle cx="100" cy="100" r="92" fill="none" stroke="#F2A900" strokeWidth="1" />
        </svg>
        <img src="/brand/logo.png" alt="" className="hero-mark relative w-full h-full object-contain" />
      </div>
    </div>
  );
}
