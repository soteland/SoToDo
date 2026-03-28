import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Pencil, ShoppingCart } from 'lucide-react'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { Skeleton } from '../components/ui/skeleton'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { fetchRecipe, fetchLists, addListItem } from '../lib/queries'
import { formatQty } from '../components/UnitPicker'
import type { List, RecipeItem } from '../types'

export function RecipeDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [listPickerOpen, setListPickerOpen] = useState(false)
    const [includeStaples, setIncludeStaples] = useState(false)

    const { data: recipe, isLoading } = useQuery({
        queryKey: ['recipe', id],
        queryFn: () => fetchRecipe(id!),
        enabled: !!id,
    })

    const { data: lists } = useQuery({
        queryKey: ['lists'],
        queryFn: fetchLists,
        enabled: listPickerOpen,
    })

    const addToListMutation = useMutation({
        mutationFn: async (list: List) => {
            const items = (recipe?.items ?? []).filter(i => includeStaples || !i.is_pantry_staple)
            await Promise.all(
                items.map(item =>
                    addListItem({
                        list_id: list.id,
                        name: item.item_name,
                        quantity: item.quantity,
                        unit: item.unit,
                    })
                )
            )
            return list
        },
        onSuccess: (list) => {
            queryClient.invalidateQueries({ queryKey: ['list-items', list.id] })
            setListPickerOpen(false)
            navigate(`/liste/${list.id}`)
        },
    })

    const mainItems = recipe?.items?.filter(i => !i.is_pantry_staple) ?? []
    const stapleItems = recipe?.items?.filter(i => i.is_pantry_staple) ?? []

    function openListPicker(withStaples: boolean) {
        setIncludeStaples(withStaples)
        setListPickerOpen(true)
    }

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <button
                    onClick={() => navigate(-1)}
                    className="min-w-11 min-h-11 flex items-center justify-center -ml-2 text-neutral-500 dark:text-neutral-400"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg flex-1 font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {recipe?.name ?? '...'}
                </h1>
                <button
                    onClick={() => navigate(`/oppskrifter/${id}/rediger`)}
                    className="min-w-11 min-h-11 flex items-center justify-center text-neutral-400 dark:text-neutral-500"
                >
                    <Pencil size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-36">
                {isLoading && (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                    </div>
                )}

                {recipe?.description && (
                    <p className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                        {recipe.description}
                    </p>
                )}

                {/* Main ingredients */}
                {mainItems.length > 0 && (
                    <>
                        <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
                            Ingredienser
                        </p>
                        {mainItems.map(item => <IngredientRow key={item.id} item={item} />)}
                    </>
                )}

                {/* Pantry staples */}
                {stapleItems.length > 0 && (
                    <>
                        <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
                            Basisvarer
                        </p>
                        {stapleItems.map(item => (
                            <IngredientRow key={item.id} item={item} dimmed />
                        ))}
                    </>
                )}

                {/* Instructions */}
                {recipe?.instructions && recipe.instructions.length > 0 && (
                    <>
                        <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-6 pb-2">
                            Fremgangsmåte
                        </p>
                        <ol className="px-4 space-y-3 pb-4">
                            {recipe.instructions.map((step, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="text-xs font-semibold text-neutral-400 mt-0.5 w-4 shrink-0">{i + 1}</span>
                                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{step}</p>
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </div>

            {/* Bottom action area */}
            <div className={"fixed bottom-14 inset-x-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800 flex flex-col  gap-2"
                + (stapleItems.length == 0 ? " mb-4" : "")
            }>
                <PrimaryButton onClick={() => openListPicker(false)}>
                    <ShoppingCart size={18} />
                    Legg til i liste
                </PrimaryButton>
                {stapleItems.length > 0 && (
                    <button
                        onClick={() => openListPicker(true)}
                        className="border w-full  rounded-xl text-sm mb-3 h-7 text-neutral-500 dark:text-neutral-400 active:opacity-60 transition-opacity
                        "
                    >
                        Legg til alt inkl. basisvarer
                    </button>
                )}
            </div>

            {/* List picker sheet */}
            <Sheet open={listPickerOpen} onOpenChange={v => !v && setListPickerOpen(false)}>
                <SheetContent side="bottom" className=" flex flex-col border-neutral-100 dark:border-neutral-800 ">
                    <p className="text-lg  font-medium text-neutral-900 dark:text-neutral-100 px-4 pt-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                        Velg liste
                    </p>
                    <div className="overflow-y-auto">
                        {(lists ?? []).map(list => (
                            <button
                                key={list.id}
                                onClick={() => addToListMutation.mutate(list)}
                                disabled={addToListMutation.isPending}
                                className="w-full pb-3 flex items-center gap-3 px-4 min-h-14 border-b border-neutral-100 dark:border-neutral-800 text-left active:bg-neutral-50 dark:active:bg-neutral-900 disabled:opacity-50"
                            >
                                <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: list.list_type?.color ?? '#6BBF8E' }}
                                />
                                <span className="text-sm text-neutral-900 dark:text-neutral-100">{list.name}</span>
                            </button>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}

function IngredientRow({ item, dimmed }: { item: RecipeItem; dimmed?: boolean }) {
    return (
        <div className={`flex items-center gap-3 px-4 min-h-12 border-b border-neutral-100 dark:border-neutral-800 ${dimmed ? 'opacity-50' : ''}`}>
            <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">{item.item_name}</span>
            <span className="text-sm text-neutral-400 shrink-0">
                {formatQty(item.quantity, item.unit) ?? item.quantity}
            </span>
        </div>
    )
}
