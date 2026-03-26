import { useState } from 'react'
import { Minus, Plus, Star, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { updateListItem, deleteListItem } from '../lib/queries'
import { UnitPicker } from './UnitPicker'
import type { ListItem } from '../types'

interface ItemModalProps {
  item: ListItem
  listId: string
  open: boolean
  onClose: () => void
}

export function ItemModal({ item, listId, open, onClose }: ItemModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(item.name)
  const [comment, setComment] = useState(item.comment ?? '')
  const [quantity, setQuantity] = useState(item.quantity)
  const [unit, setUnit] = useState(item.unit)
  const [starred, setStarred] = useState(item.is_starred)

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<ListItem>) => updateListItem(item.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteListItem(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
      onClose()
    },
  })

  function save() {
    updateMutation.mutate({
      name: name.trim(),
      name_normalized: name.trim().toLowerCase(),
      comment: comment.trim() || null,
      quantity,
      unit,
      is_starred: starred,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="sr-only">Rediger vare</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Navn</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Kommentar</label>
            <Input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="f.eks. kjøp glutenfri variant"
            />
          </div>

          {/* Quantity + unit */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-500">Antall</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
              >
                <Minus size={16} />
              </button>
              <span className="text-xl font-medium w-10 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-11 h-11 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
              >
                <Plus size={16} />
              </button>
            </div>
            <UnitPicker value={unit} onChange={setUnit} />
          </div>

          {/* Star */}
          <button
            onClick={() => setStarred(s => !s)}
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
          >
            <Star
              size={18}
              className={starred ? 'fill-neutral-700 text-neutral-700 dark:fill-neutral-200 dark:text-neutral-200' : ''}
            />
            {starred ? 'Stjernemerket' : 'Stjernemerk vare'}
          </button>

          {/* Stats */}
          {item.purchase_count > 0 && (
            <div className="text-xs text-neutral-400 space-y-0.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <p>Kjøpt {item.purchase_count} ganger</p>
              {item.last_purchased_at && (
                <p>Sist: {new Date(item.last_purchased_at).toLocaleDateString('nb-NO')}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Slett
            </Button>
            <Button
              onClick={save}
              disabled={updateMutation.isPending || !name.trim()}
              className="flex-1"
            >
              Lagre
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
