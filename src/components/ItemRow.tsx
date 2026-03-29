import { useState } from 'react'
import { MoreHorizontal, Star, Plus, Minus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn, qtyStep } from '../lib/utils'
import { formatQty } from './UnitPicker'
import { ItemModal } from './ItemModal'
import { updateListItem } from '../lib/queries'
import type { ListItem } from '../types'

interface ItemRowProps {
  item: ListItem
  listId: string
  onCheck: () => void
  checked?: boolean
}

export function ItemRow({ item, listId, onCheck, checked }: ItemRowProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const updateQty = useMutation({
    mutationFn: (qty: number) => updateListItem(item.id, { quantity: qty }),
    onMutate: async (qty) => {
      await queryClient.cancelQueries({ queryKey: ['list-items', listId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list-items', listId])
      queryClient.setQueryData<ListItem[]>(['list-items', listId], old =>
        old?.map(i => i.id === item.id ? { ...i, quantity: qty } : i) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list-items', listId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list-items', listId] }),
  })

  return (
    <>
      <div
        className={cn(
          'flex items-center min-h-[52px] px-4 gap-2 border-b border-neutral-100 dark:border-neutral-900',
          checked && 'opacity-40'
        )}
      >
        {/* Tap area for check/uncheck */}
        <button
          className="flex-1 flex items-center gap-3 text-left min-h-[52px] py-2"
          onClick={onCheck}
        >
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
          {item.is_starred && !checked && (
            <Star size={14} className="text-neutral-400 fill-neutral-400 flex-shrink-0" />
          )}
        </button>

        {/* Inline qty +/- */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => updateQty.mutate(Math.max(1, item.quantity - qtyStep(item.quantity)))}
            className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
          >
            <Minus size={11} />
          </button>
          <span className="text-xs text-neutral-500 min-w-[2rem] text-center">
            {formatQty(item.quantity, item.unit) ?? item.quantity}
          </span>
          <button
            onClick={() => updateQty.mutate(item.quantity + qtyStep(item.quantity))}
            className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Three-dot menu for full edit */}
        <button
          onClick={() => setModalOpen(true)}
          className="min-w-[36px] min-h-[44px] flex items-center justify-center text-neutral-400 dark:text-neutral-600"
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
