import { useState, useEffect } from 'react'
import { getPaletteColor } from '../lib/listDefaults'

export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    observer.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

/** Returns the display color for a stored hex — dark palette in dark mode, light otherwise. */
export function useListColor(hex: string): string {
  const isDark = useIsDark()
  return getPaletteColor(hex, isDark)
}

/** Sets the PWA theme-color meta tag. Pass null to reset to default. */
export function useThemeColor(color: string | null) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    const defaultColor = document.documentElement.classList.contains('dark') ? '#0a0a0a' : '#ffffff'
    meta.content = color ?? defaultColor
    return () => { meta.content = defaultColor }
  }, [color])
}
