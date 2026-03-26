import { useState } from 'react'
import { MoreHorizontal, Star } from 'lucide-react'
import { cn } from '../lib/utils'
import { formatQty } from './UnitPicker'
import { ItemModal } from './ItemModal'
import type { ListItem } from '../types'

interface ItemRowProps {
  item: ListItem
  listId: string
  onCheck: () => void
  checked?: boolean
}

export function ItemRow({ item, listId, onCheck, checked }: ItemRowProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          'flex items-center min-h-[52px] px-4 gap-3 border-b border-neutral-100 dark:border-neutral-900',
          checked && 'opacity-40'
        )}
      >
        {/* Tap area for check/uncheck */}
        <button
          className="flex-1 flex items-center gap-3 text-left min-h-[52px] py-2"
          onClick={onCheck}
        >
          {/* Colored dot for who added (placeholder for now) */}
          {item.added_by_profile && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.added_by_profile.color }}
            />
          )}

          <span className={cn(
            'flex-1 text-sm text-neutral-900 dark:text-neutral-100',
            checked && 'line-through'
          )}>
            {item.name}
          </span>

          {formatQty(item.quantity, item.unit) && (
            <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded px-1.5 py-0.5">
              {formatQty(item.quantity, item.unit)}
            </span>
          )}

          {item.is_starred && !checked && (
            <Star size={14} className="text-neutral-400 fill-neutral-400 flex-shrink-0" />
          )}
        </button>

        {/* Three-dot menu */}
        <button
          onClick={() => setModalOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 dark:text-neutral-600"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <ItemModal
        item={item}
        listId={listId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
