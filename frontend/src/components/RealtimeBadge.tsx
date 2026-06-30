interface Props {
  count: number;
  loading: boolean;
}

export default function RealtimeBadge({ count, loading }: Props) {
  return (
    <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 pointer-events-auto">
      <div className="relative flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <div className="absolute w-4 h-4 rounded-full bg-green-400/30 animate-ping" />
      </div>
      <div>
        <p className="text-white text-xs font-semibold">
          {loading ? (
            <span className="text-slate-400">Loading...</span>
          ) : (
            <>{count} clusters</>
          )}
        </p>
        <p className="text-slate-500 text-xs">Live updates</p>
      </div>
    </div>
  );
}
