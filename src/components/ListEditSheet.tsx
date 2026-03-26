import { useState } from 'react'
import { Check } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent } from './ui/sheet'
import { Input } from './ui/input'
import { SvgIcon } from './SvgIcon'
import { updateList, updateListType } from '../lib/queries'
import { PALETTE, ALL_ICONS } from '../lib/listDefaults'
import { useListColor } from '../hooks/useListColor'
import type { List } from '../types'

interface ListEditSheetProps {
  list: List
  open: boolean
  onClose: () => void
}

export function ListEditSheet({ list, open, onClose }: ListEditSheetProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(list.name)
  const [color, setColor] = useState(list.list_type?.color ?? PALETTE[0])
  const [iconName, setIconName] = useState(list.list_type?.icon_name ?? 'list')
  const displayColor = useListColor(color)

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        updateList(list.id, { name: name.trim() }),
        updateListType(list.list_type_id, { color, icon_name: iconName }),
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', list.id] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['list-types'] })
      onClose()
    },
  })

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-[env(safe-area-inset-bottom)] flex flex-col gap-5 max-h-[90dvh] overflow-y-auto"
      >
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 pt-1">
          Rediger liste
        </p>

        {/* Name */}
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Listenavn..."
          className="h-12 text-base"
        />

        {/* Color */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Farge</p>
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map(hex => (
              <ColorSwatch key={hex} hex={hex} selected={color === hex} onSelect={() => setColor(hex)} />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Ikon</p>
          <div className="grid grid-cols-6 gap-2">
            {ALL_ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => setIconName(icon)}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors active:opacity-70"
                style={{ backgroundColor: iconName === icon ? displayColor : undefined }}
              >
                <SvgIcon
                  name={icon}
                  className="w-6 h-6"
                  style={{ color: iconName === icon ? 'white' : undefined }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="h-12 rounded-xl text-white font-medium transition-opacity disabled:opacity-40 active:opacity-80 mb-2"
          style={{ backgroundColor: displayColor }}
        >
          {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
        </button>
      </SheetContent>
    </Sheet>
  )
}

function ColorSwatch({ hex, selected, onSelect }: { hex: string; selected: boolean; onSelect: () => void }) {
  const color = useListColor(hex)
  return (
    <button
      onClick={onSelect}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
      style={{ backgroundColor: color }}
    >
      {selected && <Check size={16} className="text-white" strokeWidth={2.5} />}
    </button>
  )
}
