import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Trash2, Search, X, ChevronRight, ArrowBigDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { UnitPicker, formatQty } from '../components/UnitPicker'
import { normalizeItemName, timeSinceLabel, scoreItem, daysSince } from '../lib/utils'
import {
    fetchHjemmelager,
    addHjemmelagerItem,
    updateHjemmelagerItem,
    deleteHjemmelagerItem,
    fetchItemCatalog,
    fetchPrimaryListItems,
    fetchRecipeSuggestions,
} from '../lib/queries'
import type { HjemmelagerItem, ListItem } from '../types'
import type { RecipeSuggestion } from '../lib/queries'

function expiryLabel(expiresAt: string | null): { text: string; urgent: boolean; expired: boolean } | null {
    if (!expiresAt) return null
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { text: 'Utgått', urgent: false, expired: true }
    if (diff === 0) return { text: 'Utløper i dag', urgent: true, expired: false }
    if (diff === 1) return { text: 'Utløper i morgen', urgent: true, expired: false }
    if (diff <= 3) return { text: `${diff} dager igjen`, urgent: true, expired: false }
    return { text: `${diff} dager igjen`, urgent: false, expired: false }
}

interface AddSheetProps {
    open: boolean
    onClose: () => void
}

function AddItemSheet({ open, onClose }: AddSheetProps) {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [unit, setUnit] = useState('stk')
    const [expiresAt, setExpiresAt] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const { data: catalog } = useQuery({
        queryKey: ['item-catalog'],
        queryFn: fetchItemCatalog,
    })

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300)
        } else {
            setSearch('')
            setQuantity(1)
            setUnit('stk')
            setExpiresAt('')
        }
    }, [open])

    const addMutation = useMutation({
        mutationFn: (name: string) =>
            addHjemmelagerItem({
                item_name: name.trim(),
                quantity,
                unit,
                expires_at: expiresAt || null,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hjemmelager'] })
            onClose()
        },
    })

    const normalizedSearch = normalizeItemName(search)

    const suggestions = (catalog ?? [])
        .filter(item => {
            if (!normalizedSearch) return true
            return item.name_normalized.includes(normalizedSearch)
        })
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
        .slice(0, 30)

    const exactMatch = (catalog ?? []).find(i => i.name_normalized === normalizedSearch)

    function addItem(name: string, itemUnit?: string) {
        if (!name.trim() || addMutation.isPending) return
        if (itemUnit) setUnit(itemUnit)
        addMutation.mutate(name)
    }

    function badgeFor(item: ListItem & { score: number }) {
        if (item.is_starred) return { label: '⭐', className: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' }
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
                className="h-[93vh]! px-0 pb-[env(safe-area-inset-bottom)] flex flex-col border-t border-neutral-100 dark:border-neutral-800"
            >
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
                            <input
                                type="text"
                                inputMode="numeric"
                                value={quantity}
                                onChange={e => {
                                    const v = parseInt(e.target.value)
                                    if (!isNaN(v) && v > 0) setQuantity(v)
                                }}
                                className="w-12 text-center text-sm font-medium text-neutral-900 dark:text-neutral-100 bg-transparent border-b border-neutral-300 dark:border-neutral-600 focus:outline-none focus:border-neutral-500"
                            />
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

                    {/* Expiry date */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-400 shrink-0">Utløper</span>
                        <input
                            type="date"
                            value={expiresAt}
                            onChange={e => setExpiresAt(e.target.value)}
                            className="flex-1 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 text-sm text-neutral-900 dark:text-neutral-100"
                        />
                        {expiresAt && (
                            <button onClick={() => setExpiresAt('')} className="text-neutral-400">
                                <X size={16} />
                            </button>
                        )}
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

                    {search.trim() && !exactMatch && (
                        <button
                            onClick={() => addItem(search)}
                            className="w-full flex items-center gap-3 px-4 min-h-13 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                        >
                            <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 shrink-0">
                                <Plus size={16} />
                            </div>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Legg til <strong className="text-neutral-900 dark:text-neutral-100">"{search.trim()}"</strong>
                            </span>
                        </button>
                    )}
                </div>

                {/* Close modal */}
                <div className="fixed bottom-22 right-4 pb-[env(safe-area-inset-bottom)]">
                    <button
                        onClick={onClose}
                        className="w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >

                        <ArrowBigDown size={28} strokeWidth={2} />
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    )
}

function ItemRow({ item }: { item: HjemmelagerItem }) {
    const queryClient = useQueryClient()
    const expiry = expiryLabel(item.expires_at)

    const updateQty = useMutation({
        mutationFn: (qty: number) => updateHjemmelagerItem(item.id, { quantity: qty }),
        onMutate: async (qty) => {
            await queryClient.cancelQueries({ queryKey: ['hjemmelager'] })
            const prev = queryClient.getQueryData<HjemmelagerItem[]>(['hjemmelager'])
            queryClient.setQueryData<HjemmelagerItem[]>(['hjemmelager'], old =>
                old?.map(i => i.id === item.id ? { ...i, quantity: qty } : i) ?? []
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['hjemmelager'], ctx.prev)
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['hjemmelager'] }),
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteHjemmelagerItem(item.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hjemmelager'] }),
    })

    return (
        <div className={`flex items-center gap-3 px-4 min-h-[56px] border-b border-neutral-100 dark:border-neutral-800 ${expiry?.expired ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.item_name}</p>
                {expiry && (
                    <p className={`text-xs mt-0.5 ${expiry.expired
                        ? 'text-neutral-400'
                        : expiry.urgent
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-neutral-400'
                        }`}>
                        {expiry.text}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={() => {
                        if (item.quantity <= 1) {
                            deleteMutation.mutate()
                        } else {
                            updateQty.mutate(item.quantity - 1)
                        }
                    }}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                >
                    <Minus size={12} />
                </button>
                <span className="text-sm text-neutral-900 dark:text-neutral-100 min-w-[2.5rem] text-center">
                    {formatQty(item.quantity, item.unit) ?? item.quantity}
                </span>
                <button
                    onClick={() => updateQty.mutate(item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                >
                    <Plus size={12} />
                </button>
            </div>

            <button
                onClick={() => deleteMutation.mutate()}
                className="w-9 h-9 flex items-center justify-center text-neutral-300 dark:text-neutral-600 active:text-red-500 dark:active:text-red-400 transition-colors"
            >
                <Trash2 size={16} />
            </button>
        </div>
    )
}

function RecentlyPurchasedSection({ hjemmelagerItems }: { hjemmelagerItems: HjemmelagerItem[] }) {
    const queryClient = useQueryClient()

    const { data: recentItems } = useQuery({
        queryKey: ['primary-list-items'],
        queryFn: fetchPrimaryListItems,
    })

    const addMutation = useMutation({
        mutationFn: (item: ListItem) =>
            addHjemmelagerItem({
                item_name: item.name,
                quantity: item.quantity ?? 1,
                unit: item.unit ?? 'stk',
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hjemmelager'] })
        },
    })

    const hjemmelagerNormalized = new Set(hjemmelagerItems.map(i => i.item_name_normalized))

    const suggestions = (recentItems ?? []).filter(
        item => !hjemmelagerNormalized.has(item.name_normalized)
    )

    if (!suggestions.length) return null

    return (
        <>
            <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
                Nylig kjøpt — legg til lager?
            </p>
            {suggestions.map(item => (
                <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 min-h-[52px] border-b border-neutral-100 dark:border-neutral-800"
                >
                    <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">{item.name}</span>
                    {formatQty(item.quantity, item.unit) && (
                        <span className="text-xs text-neutral-400">{formatQty(item.quantity, item.unit)}</span>
                    )}
                    <button
                        onClick={() => addMutation.mutate(item)}
                        disabled={addMutation.isPending}
                        className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70 disabled:opacity-40"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            ))}
        </>
    )
}

function RecipeSuggestionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const navigate = useNavigate()
    const { data: suggestions, isLoading, error } = useQuery({
        queryKey: ['recipe-suggestions'],
        queryFn: fetchRecipeSuggestions,
        enabled: open,
    })

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-[env(safe-area-inset-bottom)] flex flex-col max-h-[80vh]">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 px-4 pt-1 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    Hva kan jeg lage?
                </p>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="p-4 space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-neutral-400 text-center mt-8 px-6">
                            Kunne ikke hente forslag. Prøv igjen.
                        </p>
                    )}

                    {!isLoading && !error && suggestions?.length === 0 && (
                        <p className="text-sm text-neutral-400 text-center mt-8 px-6">
                            Ingen oppskrifter matcher det du har på lager.
                        </p>
                    )}

                    {suggestions?.map(s => (
                        <button
                            key={s.id}
                            onClick={() => { navigate(`/oppskrifter/${s.id}`); onClose() }}
                            className="w-full flex items-start gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.name}</p>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    {s.available_count} av {s.total_ingredients} varer på lager
                                </p>
                                {s.missing_items && s.missing_items.length > 0 && (
                                    <p className="text-xs text-neutral-400 mt-0.5">
                                        Mangler: {s.missing_items.join(', ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <span className="text-xs font-medium text-neutral-500">
                                    {Math.round(s.match_score * 100)}%
                                </span>
                                <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600" />
                            </div>
                        </button>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    )
}

export function HjemmelagerPage() {
    const [addOpen, setAddOpen] = useState(false)
    const [suggestOpen, setSuggestOpen] = useState(false)

    const { data: items, isLoading } = useQuery({
        queryKey: ['hjemmelager'],
        queryFn: fetchHjemmelager,
    })

    const expired = items?.filter(i => i.expires_at && new Date(i.expires_at) < new Date()) ?? []
    const expiringSoon = items?.filter(i => {
        if (!i.expires_at || new Date(i.expires_at) < new Date()) return false
        const diff = (new Date(i.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return diff <= 3
    }) ?? []
    const ok = items?.filter(i => {
        if (!i.expires_at) return true
        const diff = (new Date(i.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return diff > 3
    }) ?? []

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <h1 className="text-lg text-center font-semibold text-neutral-900 dark:text-neutral-100">Kjøleskap og fryseboks</h1>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
                {isLoading && (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                )}

                {!isLoading && items?.length === 0 && (
                    <p className="text-center text-sm text-neutral-400 mt-12 px-6">
                        Listen med innhold i kjøleskapet og fryseboksen er tom. <br />Trykk + for å legge til noe.
                    </p>
                )}

                {expiringSoon.length > 0 && (
                    <>
                        <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
                            Utløper snart
                        </p>
                        {expiringSoon.map(item => <ItemRow key={item.id} item={item} />)}
                    </>
                )}

                {ok.length > 0 && (
                    <>
                        {expiringSoon.length > 0 && (
                            <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
                                På lager
                            </p>
                        )}
                        {ok.map(item => <ItemRow key={item.id} item={item} />)}
                    </>
                )}

                {expired.length > 0 && (
                    <>
                        <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
                            Utgått
                        </p>
                        {expired.map(item => <ItemRow key={item.id} item={item} />)}
                    </>
                )}

                {!isLoading && <RecentlyPurchasedSection hjemmelagerItems={items ?? []} />}

                {!isLoading && (items?.length ?? 0) > 0 && (
                    <div className="px-4 py-4">
                        <PrimaryButton onClick={() => setSuggestOpen(true)}>
                            Hva kan jeg lage?
                        </PrimaryButton>
                    </div>
                )}
            </div>

            {/* FAB */}
            <div className="fixed bottom-22 right-4 pb-[env(safe-area-inset-bottom)]">
                <button
                    onClick={() => setAddOpen(true)}
                    className="w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <Plus size={28} strokeWidth={2} />
                </button>
            </div>

            <AddItemSheet open={addOpen} onClose={() => setAddOpen(false)} />
            <RecipeSuggestionSheet open={suggestOpen} onClose={() => setSuggestOpen(false)} />
        </div>
    )
}
