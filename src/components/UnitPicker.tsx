import { cn } from '../lib/utils'

export const UNITS = ['stk', 'g', 'kg', 'dl', 'L']
export const UNITS_EXTENDED = ['stk', 'g', 'kg', 'ml', 'dl', 'L', 'ss', 'ts']

interface UnitPickerProps {
  value: string
  onChange: (unit: string) => void
  extended?: boolean
}

export function UnitPicker({ value, onChange, extended }: UnitPickerProps) {
  const units = extended ? UNITS_EXTENDED : UNITS
  return (
    <div className="flex gap-1.5 flex-wrap">
      {units.map(unit => (
        <button
          key={unit}
          type="button"
          onClick={() => onChange(unit)}
          className={cn(
            'px-3 h-8 rounded-full text-xs font-medium transition-colors',
            value === unit
              ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
          )}
        >
          {unit}
        </button>
      ))}
    </div>
  )
}

/** Format quantity + unit for display in a list row. */
export function formatQty(quantity: number, unit: string): string | null {
  if (unit === 'stk') {
    return quantity > 1 ? `×${quantity}` : null
  }
  return `${quantity} ${unit}`
}
