interface CharCounterProps {
  current: number
  max: number
  className?: string
}

/**
 * Live character counter, e.g. "245/500". Turns amber near the limit and
 * red when exceeded, so the user gets visual feedback before submission
 * fails on a server-side length validator.
 */
export function CharCounter({ current, max, className = '' }: CharCounterProps) {
  const isOver = current > max
  const isNear = !isOver && current >= max * 0.9

  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        isOver ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-muted-foreground'
      } ${className}`}
    >
      {current}/{max}
    </span>
  )
}