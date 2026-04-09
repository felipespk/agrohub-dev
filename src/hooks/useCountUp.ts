import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from 0 (or its previous value) to `end`.
 * Triggers whenever `end` changes from 0 → non-zero (data load).
 */
export function useCountUp(end: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (end === 0) {
      setValue(0)
      return
    }

    let startTime: number | null = null
    const startValue = 0  // always count up from zero for the "load" feel

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startValue + (end - startValue) * eased))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setValue(end)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [end, duration])

  return value
}
