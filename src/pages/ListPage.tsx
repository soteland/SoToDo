import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Pencil } from 'lucide-react'
import { fetchListItems, fetchList, checkOffItem, uncheckItem } from '../lib/queries'
import { useListColor } from '../hooks/useListColor'
import { Skeleton } from '../components/ui/skeleton'
import { AddItemSheet } from '../components/AddItemSheet'
import { ListEditSheet } from '../components/ListEditSheet'
import { ItemRow } from '../components/ItemRow'
import type { ListItem } from '../types'

export function ListPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [addOpen, setAddOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const { data: list } = useQuery({
        queryKey: ['list', id],
        queryFn: () => fetchList(id!),
        enabled: !!id,
    })

    const { data: items, isLoading } = useQuery({
        queryKey: ['list-items', id],
        queryFn: () => fetchListItems(id!),
        enabled: !!id,
    })

    // Pending check timers — item greys out instantly but purchase only
    // records after CHECK_DELAY ms. Unchecking within the window cancels
    // the timer so no purchase is written (handles accidental taps).
    const CHECK_DELAY = 10000
    const pendingChecks = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    // Flush all pending checks on unmount so nothing is silently dropped
    useEffect(() => {
        return () => {
            Object.entries(pendingChecks.current).forEach(([itemId, timer]) => {
                clearTimeout(timer)
                checkOffItem(itemId)
            })
        }
    }, [])

    function handleCheck(itemId: string) {
        // Optimistic — grey out immediately
        queryClient.setQueryData<ListItem[]>(['list-items', id], old =>
            old?.map(i => i.id === itemId ? { ...i, is_checked: true, checked_at: new Date().toISOString() } : i) ?? []
        )
        // Schedule actual purchase write
        pendingChecks.current[itemId] = setTimeout(() => {
            delete pendingChecks.current[itemId]
            checkOffItem(itemId).then(() =>
                queryClient.invalidateQueries({ queryKey: ['list-items', id] })
            )
        }, CHECK_DELAY)
    }

    const uncheckMutation = useMutation({
        mutationFn: uncheckItem,
        onMutate: async (itemId) => {
            // Cancel pending check if still in grace period — no purchase recorded
            if (pendingChecks.current[itemId]) {
                clearTimeout(pendingChecks.current[itemId])
                delete pendingChecks.current[itemId]
                queryClient.setQueryData<ListItem[]>(['list-items', id], old =>
                    old?.map(i => i.id === itemId ? { ...i, is_checked: false, checked_at: null } : i) ?? []
                )
                return { cancelled: true }
            }
            await queryClient.cancelQueries({ queryKey: ['list-items', id] })
            const prev = queryClient.getQueryData<ListItem[]>(['list-items', id])
            queryClient.setQueryData<ListItem[]>(['list-items', id], old =>
                old?.map(i => i.id === itemId ? { ...i, is_checked: false, checked_at: null } : i) ?? []
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx && 'prev' in ctx && ctx.prev) queryClient.setQueryData(['list-items', id], ctx.prev)
        },
        onSettled: (_data, _err, _vars, ctx) => {
            if (ctx && 'cancelled' in ctx && ctx.cancelled) return
            queryClient.invalidateQueries({ queryKey: ['list-items', id] })
        },
    })

    const activeItems = items?.filter(i => !i.is_checked) ?? []
    const checkedItems = items?.filter(i => i.is_checked) ?? []
    const color = useListColor(list?.list_type?.color ?? '#6BBF8E')

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] pb-1"
                style={{ backgroundColor: color }}
            >
                <button
                    onClick={() => navigate(-1)}
                    className="text-white/90 p-1 -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-white font-semibold text-lg flex-1">{list?.name ?? '...'}</h1>
                <button
                    onClick={() => setEditOpen(true)}
                    className="text-white/80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                    <Pencil size={18} />
                </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto pb-24">
                {isLoading && (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                    </div>
                )}

                {/* Active items */}
                {activeItems.map(item => (
                    <ItemRow
                        key={item.id}
                        item={item}
                        listId={id!}
                        onCheck={() => handleCheck(item.id)}
                    />
                ))}

                {/* Separator + checked items */}
                {checkedItems.length > 0 && (
                    <>
                        {activeItems.length > 0 && (
                            <div className="h-px bg-neutral-200 dark:bg-neutral-800 mx-4 my-2" />
                        )}
                        {checkedItems.map(item => (
                            <ItemRow
                                key={item.id}
                                item={item}
                                listId={id!}
                                onCheck={() => uncheckMutation.mutate(item.id)}
                                checked
                            />
                        ))}
                    </>
                )}

                {!isLoading && items?.length === 0 && (
                    <p className="text-center text-neutral-400 text-sm mt-12 px-6">
                        Listen er tom. Trykk + for å legge til noe.
                    </p>
                )}
            </div>

            {/* Add button — fixed at bottom */}
            <div className="fixed bottom-22 right-4 pb-[env(safe-area-inset-bottom)]">
                <button
                    onClick={() => setAddOpen(true)}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform text-white"
                    style={{ backgroundColor: color }}
                >
                    <Plus size={28} strokeWidth={2} />
                </button>
            </div>

            {list && (
                <ListEditSheet
                    list={list}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                />
            )}

            <AddItemSheet
                open={addOpen}
                onClose={() => setAddOpen(false)}
                listId={id!}
                listTypeId={list?.list_type_id ?? ''}
                listColor={color}
            />
        </div>
    )
}
