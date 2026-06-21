import { useEffect, useState } from 'react'

// Shift押下中かどうか。リサイズ時のアスペクト固定の一時切替に使う。
export function useShiftKey(): boolean {
  const [shift, setShift] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (e.key === 'Shift') setShift(true)
    }
    const up = (e: KeyboardEvent): void => {
      if (e.key === 'Shift') setShift(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  return shift
}
