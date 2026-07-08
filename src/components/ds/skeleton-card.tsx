export function SkeletonCard() {
  return (
    <div className="ds-card overflow-hidden p-0">
      <div className="ds-skeleton aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="ds-skeleton h-4 w-3/4" />
        <div className="ds-skeleton h-3 w-1/2" />
        <div className="flex gap-2">
          <div className="ds-skeleton h-6 w-16" />
          <div className="ds-skeleton h-6 w-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLine({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`ds-skeleton ${className}`} />;
}
