export default function FullScreenLoader({ label = "Loading..." }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-ink-950 gap-6 overflow-hidden">
      <div className="aurora" aria-hidden="true"><span className="orb orb-gold" /><span className="orb orb-blue" /></div>
      <div className="relative flex items-center justify-center">
        <div className="loader-ring absolute" aria-hidden="true" />
        <img src="/brand/logo.png" alt="" className="h-9 w-9 object-contain float-a drop-shadow-[0_0_14px_rgba(242,169,0,0.6)]" />
      </div>
      <p className="relative font-body text-sm text-ink-300">{label}</p>
    </div>
  );
}
