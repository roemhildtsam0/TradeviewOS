export function SkeletonCard({ height = 100 }) {
  return (
    <div
      className="skeleton glass-card"
      style={{ height, minWidth: 160, borderRadius: 14 }}
    />
  )
}

export function SkeletonText({ width = '100%', height = 14, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 6, ...style }}
    />
  )
}

export function SkeletonStockCard() {
  return (
    <div className="glass-card p-4 flex flex-col gap-3" style={{ minWidth: 200, borderRadius: 14 }}>
      <div className="flex items-center gap-2">
        <SkeletonText width={36} height={36} style={{ borderRadius: 10 }} />
        <div className="flex flex-col gap-1.5 flex-1">
          <SkeletonText width="60%" height={12} />
          <SkeletonText width="40%" height={10} />
        </div>
      </div>
      <SkeletonText width="50%" height={20} />
      <SkeletonText width="35%" height={10} />
    </div>
  )
}

export function SkeletonNewsCard() {
  return (
    <div className="glass-card p-4 flex gap-4" style={{ borderRadius: 14 }}>
      <SkeletonText width={80} height={80} style={{ borderRadius: 10, flexShrink: 0 }} />
      <div className="flex flex-col gap-2 flex-1">
        <SkeletonText width="80%" height={14} />
        <SkeletonText width="90%" height={14} />
        <SkeletonText width="40%" height={10} />
      </div>
    </div>
  )
}
