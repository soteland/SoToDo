import { useEffect, useState } from 'react'
import { cn } from '../lib/utils'

interface SvgIconProps {
  name: string
  className?: string
  style?: React.CSSProperties
}

const cache: Record<string, string> = {}

export function SvgIcon({ name, className, style }: SvgIconProps) {
  const [svg, setSvg] = useState<string | null>(cache[name] ?? null)

  useEffect(() => {
    if (cache[name]) {
      setSvg(cache[name])
      return
    }
    fetch(`/icons/${name}.svg`)
      .then(r => r.text())
      .then(text => {
        // Ensure fill="currentColor" on the svg element so paths inherit it
        const cleaned = text
          .replace(/\sfill="[^"]*"/g, '')
          .replace(/<svg /, '<svg fill="currentColor" ')
        cache[name] = cleaned
        setSvg(cleaned)
      })
      .catch(() => setSvg(null))
  }, [name])

  if (!svg) return <span className={cn('inline-block bg-neutral-200 rounded', className)} style={style} />

  return (
    <span
      className={cn('inline-flex items-center justify-center', className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
