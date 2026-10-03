interface ProgressBarProps {
  value: number
  max: number
  label: string
  complete?: boolean
}

export function ProgressBar({ value, max, label, complete = false }: ProgressBarProps) {
  const safeMax = Math.max(1, max)
  const percentage = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 overflow-hidden rounded-full bg-rs-inset ring-1 ring-inset ring-rs-border/40"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${
          complete ? 'bg-rs-success' : 'bg-rs-gold'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
