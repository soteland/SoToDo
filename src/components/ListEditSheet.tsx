import { useState } from 'react'
import { Check } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent } from './ui/sheet'
import { Input } from './ui/input'
import { PrimaryButton } from './ui/PrimaryButton'
import { SvgIcon } from './SvgIcon'
import { updateList, updateListType, fetchLists, setPrimaryList } from '../lib/queries'
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
    const [isPrimary, setIsPrimary] = useState(list.is_primary)
    const displayColor = useListColor(color)

    const { data: allLists } = useQuery({ queryKey: ['lists'], queryFn: fetchLists })
    const currentPrimary = allLists?.find(l => l.is_primary && l.id !== list.id) ?? null

    const saveMutation = useMutation({
        mutationFn: async () => {
            await Promise.all([
                updateList(list.id, { name: name.trim() }),
                updateListType(list.list_type_id, { color, icon_name: iconName }),
            ])
            if (isPrimary && !list.is_primary) {
                // Make this list primary, unset the current primary
                await setPrimaryList(list.id, currentPrimary?.id ?? null)
            } else if (!isPrimary && list.is_primary) {
                // Un-mark this list as primary
                await setPrimaryList(null, list.id)
            }
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
                className=" px-4 pb-3 flex flex-col gap-5 h-screen! overflow-y-auto border-0!"
            >
                <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 pt-2">
                    Rediger liste
                </p>

                {/* Name */}
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Listenavn..."
                    className="h-12 text-base"
                />

                {/* Primary list toggle */}
                <button
                    onClick={() => setIsPrimary(v => !v)}
                    className="flex items-center gap-3 py-1"
                >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isPrimary ? 'border-transparent' : 'border-neutral-300 dark:border-neutral-600'}`}
                        style={{ backgroundColor: isPrimary ? displayColor : undefined }}
                    >
                        {isPrimary && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Hovedliste for oppskrifter</span>
                </button>

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
                <PrimaryButton
                    onClick={() => saveMutation.mutate()}
                    disabled={!name.trim() || saveMutation.isPending}
                    className="mb-2"
                >
                    {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
                </PrimaryButton>
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
