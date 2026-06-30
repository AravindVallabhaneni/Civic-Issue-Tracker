export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-civic-bg flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center">
          <span className="text-white font-bold text-2xl">CP</span>
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-brand-600/30 animate-ping" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-white font-semibold text-lg">CivicPulse</p>
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
