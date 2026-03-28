import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Minus } from 'lucide-react'
import { Sheet, SheetContent } from './ui/sheet'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { addListItem, fetchListItems } from '../lib/queries'
import { normalizeItemName, timeSinceLabel, scoreItem, daysSince } from '../lib/utils'
import { UnitPicker, formatQty } from './UnitPicker'
import type { ListItem } from '../types'

interface AddItemSheetProps {
    open: boolean
    onClose: () => void
    listId: string
    listTypeId: string
    listColor: string
}

export function AddItemSheet({ open, onClose, listId, listTypeId: _listTypeId, listColor }: AddItemSheetProps) {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [unit, setUnit] = useState('stk')
    const inputRef = useRef<HTMLInputElement>(null)

    // All items on this list — used for suggestions
    const { data: allItems } = useQuery({
        queryKey: ['list-items', listId],
        queryFn: () => fetchListItems(listId),
    })

    // Focus input when sheet opens; reset state on close
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            setSearch('')
            setQuantity(1)
            setUnit('stk')
        }
    }, [open])

    const addMutation = useMutation({
        mutationFn: (name: string) =>
            addListItem({ list_id: listId, name: name.trim(), quantity, unit }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
            setSearch('')
            setQuantity(1)
            setUnit('stk')
            inputRef.current?.focus()
        },
    })

    const normalizedSearch = normalizeItemName(search)

    // Build suggestions: scored items already on list (catalog), filtered by search
    const suggestions = (allItems ?? [])
        .filter(item => {
            if (!normalizedSearch) return item.purchase_count > 0
            return item.name_normalized.includes(normalizedSearch)
        })
        .filter(item => !item.is_checked) // don't re-suggest active items
        .map(item => ({
            ...item,
            score: scoreItem({
                daysSincePurchase: daysSince(item.last_purchased_at),
                avgFrequencyDays: item.avg_frequency_days,
                isStarred: item.is_starred,
                associationWeight: 0,
                purchaseCount: item.purchase_count,
            }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)

    // Check if search matches an existing item exactly
    const exactMatch = (allItems ?? []).find(
        i => i.name_normalized === normalizedSearch && !i.is_checked
    )

    function addItem(name: string, itemUnit?: string) {
        if (!name.trim()) return
        if (itemUnit) setUnit(itemUnit)
        addMutation.mutate(name)
    }

    function badgeFor(item: ListItem & { score: number }) {
        if (item.is_starred) return { label: '⭐ Favoritt', className: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' }
        const days = daysSince(item.last_purchased_at)
        const label = timeSinceLabel(item.last_purchased_at)
        if (days !== null && item.avg_frequency_days && days >= item.avg_frequency_days * 0.9) {
            return { label: '🔴 Høy sannsynlighet', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' }
        }
        if (label) return { label: `🕐 ${label}`, className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' }
        return null
    }

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent
                side="bottom"
                className="h-[80vh] px-0 pb-[env(safe-area-inset-bottom)] flex flex-col"
            >
                {/* Search input */}
                <div className="px-4 pt-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <Input
                            ref={inputRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Søk eller skriv ny vare..."
                            className="pl-9 h-11"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && search.trim()) {
                                    if (exactMatch) {
                                        addItem(exactMatch.name, exactMatch.unit)
                                    } else {
                                        addItem(search)
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* Quantity + unit */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                            >
                                <Minus size={12} />
                            </button>
                            <span className="w-5 text-center text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {quantity}
                            </span>
                            <button
                                onClick={() => setQuantity(q => q + 1)}
                                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <UnitPicker value={unit} onChange={setUnit} />
                        </div>
                    </div>
                </div>

                {/* Suggestions list */}
                <div className="flex-1 overflow-y-auto">
                    {suggestions.map(item => {
                        const badge = badgeFor(item)
                        return (
                            <button
                                key={item.id}
                                onClick={() => addItem(item.name, item.unit)}
                                className="w-full flex items-center gap-3 px-4 min-h-[52px] border-b border-neutral-100 dark:border-neutral-900 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                            >
                                <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">
                                    {item.name}
                                </span>
                                {formatQty(item.quantity, item.unit) && (
                                    <span className="text-xs text-neutral-400 shrink-0">
                                        {formatQty(item.quantity, item.unit)}
                                    </span>
                                )}
                                {badge && (
                                    <Badge variant="secondary" className={`text-xs shrink-0 ${badge.className}`}>
                                        {badge.label}
                                    </Badge>
                                )}
                            </button>
                        )
                    })}

                    {/* "Add new" row */}
                    {search.trim() && !exactMatch && (
                        <button
                            onClick={() => addItem(search)}
                            className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                        >
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                style={{ backgroundColor: listColor }}
                            >
                                <Plus size={16} />
                            </div>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Legg til <strong className="text-neutral-900 dark:text-neutral-100">"{search.trim()}"</strong>
                            </span>
                        </button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
