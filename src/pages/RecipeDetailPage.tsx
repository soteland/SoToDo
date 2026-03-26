import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Trash2, ShoppingCart } from 'lucide-react'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { Skeleton } from '../components/ui/skeleton'
import { fetchRecipe, fetchLists, addListItem, deleteRecipe } from '../lib/queries'
import { formatQty } from '../components/UnitPicker'
import type { List } from '../types'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [listPickerOpen, setListPickerOpen] = useState(false)

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

  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      navigate(-1)
    },
  })

  const addToListMutation = useMutation({
    mutationFn: async (list: List) => {
      const items = recipe?.items ?? []
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)] py-3 border-b border-neutral-100 dark:border-neutral-800">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-neutral-500 dark:text-neutral-400"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {recipe?.name ?? '...'}
        </h1>
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-300 dark:text-neutral-600 active:text-red-500 dark:active:text-red-400 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-28">
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

        {/* Ingredient count */}
        {recipe && (
          <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 pt-4 pb-2">
            {recipe.items?.length ?? 0} ingredienser
          </p>
        )}

        {/* Ingredients */}
        {recipe?.items?.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 min-h-[52px] border-b border-neutral-100 dark:border-neutral-800"
          >
            <span className="text-xs text-neutral-400 w-5 text-right shrink-0">{i + 1}</span>
            <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">
              {item.item_name}
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400 shrink-0">
              {formatQty(item.quantity, item.unit) ?? item.quantity}
            </span>
          </div>
        ))}

        {!isLoading && recipe?.items?.length === 0 && (
          <p className="text-center text-neutral-400 text-sm mt-12 px-6">
            Ingen ingredienser lagt til ennå.
          </p>
        )}
      </div>

      {/* Add to list button */}
      <div className="fixed bottom-14 inset-x-0 px-4 pb-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
        <button
          onClick={() => setListPickerOpen(true)}
          className="w-full h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 font-medium flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <ShoppingCart size={18} />
          Legg til i liste
        </button>
      </div>

      {/* List picker sheet */}
      <Sheet open={listPickerOpen} onOpenChange={v => !v && setListPickerOpen(false)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[env(safe-area-inset-bottom)] flex flex-col"
        >
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 px-4 pt-1 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            Velg liste
          </p>
          <div className="overflow-y-auto">
            {(lists ?? []).map(list => (
              <button
                key={list.id}
                onClick={() => addToListMutation.mutate(list)}
                disabled={addToListMutation.isPending}
                className="w-full flex items-center gap-3 px-4 min-h-[56px] border-b border-neutral-100 dark:border-neutral-800 text-left active:bg-neutral-50 dark:active:bg-neutral-900 disabled:opacity-50"
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
