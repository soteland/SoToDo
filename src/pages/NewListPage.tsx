import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Check } from 'lucide-react'
import { fetchListTypes, createListType, createList } from '../lib/queries'
import { SvgIcon } from '../components/SvgIcon'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { PALETTE, ALL_ICONS } from '../lib/listDefaults'
import { useListColor } from '../hooks/useListColor'
import type { ListType } from '../types'

export function NewListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: listTypes, isLoading } = useQuery({
    queryKey: ['list-types'],
    queryFn: fetchListTypes,
  })

  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('list')
  const [selectedColor, setSelectedColor] = useState(PALETTE[0])
  const displayColor = useListColor(selectedColor)

  const createMutation = useMutation({
    mutationFn: async ({ typeId, listName }: { typeId?: string; listName: string }) => {
      let finalTypeId = typeId
      if (!finalTypeId) {
        const newType = await createListType({
          name: listName,
          icon_name: selectedIcon,
          color: selectedColor,
        })
        finalTypeId = newType.id
      }
      return createList({ list_type_id: finalTypeId!, name: listName })
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['list-types'] })
      navigate(`/liste/${newList.id}`, { replace: true })
    },
  })

  function tapTemplate(type: ListType) {
    if (createMutation.isPending) return
    createMutation.mutate({ typeId: type.id, listName: type.name })
  }

  function submitCustom() {
    if (!name.trim() || createMutation.isPending) return
    createMutation.mutate({ listName: name.trim() })
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)] py-3 border-b border-neutral-100 dark:border-neutral-800">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-neutral-500 dark:text-neutral-400"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-neutral-900 dark:text-neutral-100">Ny liste</h1>
      </div>

      {/* Template tiles */}
      <div className="px-4 pt-5">
        <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Maler</p>
        <div className="grid grid-cols-2 gap-3">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
          {(listTypes ?? []).map(type => (
            <TemplateTile
              key={type.id}
              type={type}
              onTap={() => tapTemplate(type)}
              disabled={createMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 px-4 my-6">
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
        <span className="text-xs text-neutral-400">eller lag din egen</span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Custom creation */}
      <div className="px-4 space-y-5">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Listenavn..."
          className="h-12 text-base"
          onKeyDown={e => e.key === 'Enter' && submitCustom()}
        />

        {/* Color picker */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Farge</p>
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map(hex => (
              <ColorSwatch
                key={hex}
                hex={hex}
                selected={selectedColor === hex}
                onSelect={() => setSelectedColor(hex)}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Ikon</p>
          <div className="grid grid-cols-6 gap-2">
            {ALL_ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => setSelectedIcon(icon)}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors active:opacity-70"
                style={{
                  backgroundColor: selectedIcon === icon ? displayColor : undefined,
                }}
              >
                <SvgIcon
                  name={icon}
                  className="w-6 h-6"
                  style={{ color: selectedIcon === icon ? 'white' : undefined }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submitCustom}
          disabled={!name.trim() || createMutation.isPending}
          className="w-full h-12 rounded-xl text-white font-medium transition-opacity disabled:opacity-40 active:opacity-80"
          style={{ backgroundColor: displayColor }}
        >
          {createMutation.isPending ? 'Oppretter...' : 'Opprett liste'}
        </button>
      </div>
    </div>
  )
}

function TemplateTile({ type, onTap, disabled }: { type: ListType; onTap: () => void; disabled: boolean }) {
  const color = useListColor(type.color)
  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className="h-24 rounded-xl flex flex-col items-start justify-between p-3 active:opacity-70 transition-opacity text-left disabled:opacity-50"
      style={{ backgroundColor: color }}
    >
      <SvgIcon name={type.icon_name} className="w-7 h-7 text-white/90" />
      <span className="text-white text-sm font-medium leading-tight">{type.name}</span>
    </button>
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
