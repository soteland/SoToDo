import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Trash2, X } from 'lucide-react'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { UnitPicker, formatQty } from '../components/UnitPicker'
import {
    fetchHjemmelager,
    addHjemmelagerItem,
    updateHjemmelagerItem,
    deleteHjemmelagerItem,
} from '../lib/queries'
import type { HjemmelagerItem } from '../types'

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
    const [itemName, setItemName] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [unit, setUnit] = useState('stk')
    const [expiresAt, setExpiresAt] = useState('')

    const addMutation = useMutation({
        mutationFn: () =>
            addHjemmelagerItem({
                item_name: itemName.trim(),
                quantity,
                unit,
                expires_at: expiresAt || null,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hjemmelager'] })
            setItemName('')
            setQuantity(1)
            setUnit('stk')
            setExpiresAt('')
            onClose()
        },
    })

    function submit() {
        if (!itemName.trim() || addMutation.isPending) return
        addMutation.mutate()
    }

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent
                side="bottom"
                className="rounded-t-2xl px-4 pb-[env(safe-area-inset-bottom)] flex flex-col gap-4"
            >
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 pt-1">
                    Legg til vare
                </p>

                <Input
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    placeholder="Varenavn..."
                    className="h-12 text-base"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && submit()}
                />

                {/* Quantity */}
                <div className="flex items-center gap-4">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 w-16">Antall</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {quantity}
                        </span>
                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {/* Unit */}
                <div>
                    <p className="text-xs text-neutral-400 mb-2">Enhet</p>
                    <UnitPicker value={unit} onChange={setUnit} />
                </div>

                {/* Expiry */}
                <div className="flex items-center gap-4">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 w-16">Utløper</span>
                    <input
                        type="date"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        className="flex-1 h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 text-sm text-neutral-900 dark:text-neutral-100"
                    />
                    {expiresAt && (
                        <button onClick={() => setExpiresAt('')} className="text-neutral-400">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={submit}
                    disabled={!itemName.trim() || addMutation.isPending}
                    className="h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 font-medium disabled:opacity-40 active:opacity-80 transition-opacity mb-2"
                >
                    {addMutation.isPending ? 'Legger til...' : 'Legg til'}
                </button>
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
            {/* Name + expiry */}
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

            {/* Quantity + unit controls */}
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

            {/* Delete */}
            <button
                onClick={() => deleteMutation.mutate()}
                className="w-9 h-9 flex items-center justify-center text-neutral-300 dark:text-neutral-600 active:text-red-500 dark:active:text-red-400 transition-colors"
            >
                <Trash2 size={16} />
            </button>
        </div>
    )
}

export function HjemmelagerPage() {
    const [addOpen, setAddOpen] = useState(false)

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
                    <p className="text-center text-neutral-400 mt-12 px-6">
                        Listen med innhold i kjøleskapet og fryseboksen er tom. <br></br>Trykk + for å legge til noe.
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
            </div>

            {/* FAB */}
            <div className="fixed bottom-22 right-4 pb-[env(safe-area-inset-bottom)]">
                <button
                    onClick={() => setAddOpen(true)}
                    className=" w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <Plus size={28} strokeWidth={2} />
                </button>
            </div>

            <AddItemSheet open={addOpen} onClose={() => setAddOpen(false)} />
        </div>
    )
}
