import { useEffect, useRef, useState } from "react";

/**
 * MawizTech's form mascot — a rounded, gradient-shaded floating character
 * (not a robot): a soft navy head, a glossy gold body, a small graduation
 * cap with a swinging tassel. Same identity every time it appears; only
 * pose, expression and chest badge change with the form's mood.
 *
 * mood: "idle" | "watching" | "hiding" | "peeking" | "error" | "loading" | "success"
 * transitionKey: change this (e.g. a wizard step number) to make the
 *   character bow out and hop back in between sections.
 */
const CREAM = "#FCEBC0";
const HAND = "#F6C673";
const NAVY_DARK = "#060E1C";

const ARM_POSES = {
  default: {
    left: "M74 176 C54 186 46 208 50 230",
    leftHand: [50, 232],
    right: "M148 176 C168 164 182 138 178 116",
    rightHand: [178, 112],
    rightWaves: true,
  },
  hiding: {
    left: "M74 176 C60 154 70 126 92 113",
    leftHand: [92, 112],
    right: "M148 176 C162 154 152 126 128 113",
    rightHand: [128, 112],
    handRadius: 12,
  },
  peeking: {
    left: "M74 176 C60 154 70 126 92 113",
    leftHand: [92, 112],
    right: "M148 176 C166 180 174 196 168 214",
    rightHand: [168, 214],
  },
  error: {
    left: "M74 176 C58 190 52 210 56 228",
    leftHand: [56, 228],
    right: "M148 176 C166 156 156 122 132 96",
    rightHand: [132, 94],
  },
  loading: {
    left: "M74 176 C58 190 52 210 56 228",
    leftHand: [56, 228],
    right: "M148 176 C164 162 154 138 130 126",
    rightHand: [130, 126],
  },
  success: {
    left: "M74 176 C58 148 62 114 86 90",
    leftHand: [86, 88],
    right: "M148 176 C166 148 162 114 138 90",
    rightHand: [138, 88],
  },
};

function poseFor(mood) {
  if (mood === "hiding") return ARM_POSES.hiding;
  if (mood === "peeking") return ARM_POSES.peeking;
  if (mood === "error") return ARM_POSES.error;
  if (mood === "loading") return ARM_POSES.loading;
  if (mood === "success") return ARM_POSES.success;
  return ARM_POSES.default;
}

function mouthFor(mood) {
  if (mood === "error") return <path d="M98 106 Q104 100 110 106 T122 106" stroke={NAVY_DARK} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (mood === "loading") return <rect x="100" y="103" width="18" height="3" rx="1.5" fill={NAVY_DARK} opacity="0.7" />;
  if (mood === "success") return <path d="M92 98 Q110 120 128 98" stroke={NAVY_DARK} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
  if (mood === "hiding" || mood === "peeking") return <rect x="101" y="102" width="16" height="4" rx="2" fill={NAVY_DARK} opacity="0.55" />;
  return <path d="M97 101 Q110 111 123 101" stroke={NAVY_DARK} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
}

function badgeIconFor(mood) {
  if (mood === "hiding") return <g><path d="M103 168 a7 7 0 0 1 14 0" stroke={CREAM} strokeWidth="3" fill="none" /><rect x="99" y="168" width="22" height="14" rx="4" fill={CREAM} /></g>;
  if (mood === "peeking") return <g><path d="M101 166 a7 7 0 0 1 12 -4.5" stroke={CREAM} strokeWidth="3" fill="none" /><rect x="99" y="168" width="22" height="14" rx="4" fill={CREAM} /></g>;
  if (mood === "error") return <g fill={CREAM}><rect x="107" y="163" width="6" height="13" rx="3" /><circle cx="110" cy="181" r="3.5" /></g>;
  if (mood === "loading") return (
    <g className="mascot-spinner" style={{ transformOrigin: "110px 174px" }}>
      <circle cx="110" cy="174" r="10" fill="none" stroke="#0d2a52" strokeWidth="3.5" />
      <circle cx="110" cy="174" r="10" fill="none" stroke={CREAM} strokeWidth="3.5" strokeDasharray="14 90" strokeLinecap="round" />
    </g>
  );
  if (mood === "success") return (
    <g className="mascot-pop" style={{ transformOrigin: "110px 174px" }}>
      <path d="M98 174 l8 9 l17 -19" stroke={CREAM} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  return <path d="M97 174 l8 8 l16 -17" stroke={CREAM} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

export default function AuthCharacter({ className = "", mood = "idle", transitionKey }) {
  const [phase, setPhase] = useState("enter");
  const [shake, setShake] = useState(false);
  const [jump, setJump] = useState(mood === "success");
  const prevMood = useRef(mood);
  const prevKey = useRef(transitionKey);

  useEffect(() => {
    const t = setTimeout(() => setPhase("settled"), 760);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mood === "error" && prevMood.current !== "error") {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      prevMood.current = mood;
      return () => clearTimeout(t);
    }
    if (mood === "success" && prevMood.current !== "success") {
      setJump(true);
      const t = setTimeout(() => setJump(false), 800);
      prevMood.current = mood;
      return () => clearTimeout(t);
    }
    prevMood.current = mood;
  }, [mood]);

  useEffect(() => {
    if (transitionKey === undefined || prevKey.current === transitionKey) {
      prevKey.current = transitionKey;
      return;
    }
    prevKey.current = transitionKey;
    setPhase("exit");
    const t1 = setTimeout(() => setPhase("enter"), 340);
    const t2 = setTimeout(() => setPhase("settled"), 1080);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [transitionKey]);

  const pose = poseFor(mood);
  const wrapClass = [
    "auth-character",
    phase === "settled" && "float-slow",
    phase === "enter" && "mascot-enter",
    phase === "exit" && "mascot-exit",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapClass} data-mood={mood} aria-hidden="true">
      <svg viewBox="0 0 220 260" width="160" height="188" overflow="visible">
        <defs>
          <radialGradient id="mascotBody" cx="32%" cy="26%" r="85%">
            <stop offset="0%" stopColor="#FFDD7A" />
            <stop offset="55%" stopColor="#F2A900" />
            <stop offset="100%" stopColor="#B97900" />
          </radialGradient>
          <radialGradient id="mascotHead" cx="34%" cy="28%" r="85%">
            <stop offset="0%" stopColor="#274A7E" />
            <stop offset="60%" stopColor="#0F2B52" />
            <stop offset="100%" stopColor="#060E1C" />
          </radialGradient>
          <radialGradient id="mascotHand" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#FFE9B0" />
            <stop offset="100%" stopColor={HAND} />
          </radialGradient>
          <linearGradient id="mascotCap" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCEBC0" />
            <stop offset="100%" stopColor="#E0930A" />
          </linearGradient>
        </defs>

        <ellipse cx="110" cy="246" rx="48" ry="9" fill="#000" opacity="0.16" className="auth-character__shadow" />

        <g className={`mascot-posture ${shake ? "mascot-shake" : ""} ${jump ? "mascot-jump" : ""}`} style={{ transformOrigin: "110px 246px" }}>
          <path d={pose.left} stroke="url(#mascotBody)" strokeWidth="17" fill="none" strokeLinecap="round" />
          <circle cx={pose.leftHand[0]} cy={pose.leftHand[1]} r={pose.handRadius || 11} fill="url(#mascotHand)" />

          {/* body: one soft rounded blob, no legs — it floats */}
          <rect x="56" y="126" width="108" height="112" rx="46" fill="url(#mascotBody)" />
          <ellipse cx="82" cy="150" rx="16" ry="10" fill="#fff" opacity="0.16" />

          <circle cx="110" cy="172" r="19" fill="#0d2a52" />
          {badgeIconFor(mood)}

          {/* head */}
          <circle cx="110" cy="82" r="46" fill="url(#mascotHead)" />
          <ellipse cx="94" cy="64" rx="15" ry="10" fill="#fff" opacity="0.14" />

          {/* graduation cap + swinging tassel, standing in for the old antenna — drawn after the head so it sits on top */}
          <g className="mascot-antenna" style={{ transformOrigin: "110px 50px" }}>
            <ellipse cx="110" cy="52" rx="16" ry="7" fill="#0d2a52" />
            <rect x="80" y="38" width="60" height="9" rx="3" fill="url(#mascotCap)" transform="rotate(-4 110 42)" />
            <circle cx="110" cy="41" r="4" fill="#0d2a52" />
            <path d="M110 44 q14 10 12 26" stroke="#E0930A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="122" cy="70" r="5" fill="url(#mascotCap)" className="auth-character__antenna" />
          </g>

          <g className="mascot-brow mascot-brow-left"><rect x="87" y="70" width="13" height="3.2" rx="1.6" fill={CREAM} /></g>
          <g className="mascot-brow mascot-brow-right"><rect x="120" y="70" width="13" height="3.2" rx="1.6" fill={CREAM} /></g>

          {mood === "success" ? (
            <g>
              <path d="M88 90 Q94 82 100 90" stroke={CREAM} strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M120 90 Q126 82 132 90" stroke={CREAM} strokeWidth="4" fill="none" strokeLinecap="round" />
            </g>
          ) : (
            <g className="mascot-eyes">
              <g className="mascot-eye mascot-eye-left">
                <ellipse cx="94" cy="84" rx="8" ry="10" fill={CREAM} />
                <circle cx="96" cy="86" r="3.4" fill="#0d2a52" />
              </g>
              <g className="mascot-eye mascot-eye-right">
                <ellipse cx="126" cy="84" rx="8" ry="10" fill={CREAM} />
                <circle cx="128" cy="86" r="3.4" fill="#0d2a52" />
              </g>
            </g>
          )}

          {mouthFor(mood)}

          <g className={pose.rightWaves ? "auth-character__wave" : ""} style={{ transformOrigin: "148px 176px" }}>
            <path d={pose.right} stroke="url(#mascotBody)" strokeWidth="17" fill="none" strokeLinecap="round" />
            <circle cx={pose.rightHand[0]} cy={pose.rightHand[1]} r={pose.handRadius || 11} fill="url(#mascotHand)" />
          </g>
        </g>
      </svg>

      {mood === "success" && (
        <div className="mascot-confetti" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
        </div>
      )}
    </div>
  );
}
