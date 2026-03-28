import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { fetchRecipes, seedMyRecipes } from '../lib/queries'
import { Skeleton } from '../components/ui/skeleton'

export function RecipesPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { data: recipes, isLoading } = useQuery({
        queryKey: ['recipes'],
        queryFn: fetchRecipes,
    })
    const seedMutation = useMutation({
        mutationFn: seedMyRecipes,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
    })

    return (
        <div className="flex flex-col flex-1 pb-16">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Oppskrifter</h1>
                <button
                    onClick={() => navigate('/oppskrifter/ny')}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500"
                >
                    <Plus size={22} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading && (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                    </div>
                )}

                {recipes?.map(recipe => (
                    <button
                        key={recipe.id}
                        onClick={() => navigate(`/oppskrifter/${recipe.id}`)}
                        className="w-full flex items-center gap-3 px-4 min-h-[60px] border-b border-neutral-100 dark:border-neutral-900 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                    >
                        <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{recipe.name}</p>
                            {recipe.description && (
                                <p className="text-xs text-neutral-400 mt-0.5">{recipe.description}</p>
                            )}
                        </div>
                        <span className="text-xs text-neutral-400">
                            {recipe.items?.length ?? 0} ingredienser
                        </span>
                    </button>
                ))}

                {!isLoading && recipes?.length === 0 && (
                    <div className="flex flex-col items-center gap-4 mt-12 px-6">
                        <p className="text-center text-neutral-400 text-sm">
                            Ingen oppskrifter ennå. Trykk + for å legge til.
                        </p>
                        <button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            className="text-sm text-neutral-500 underline underline-offset-2 disabled:opacity-40"
                        >
                            {seedMutation.isPending ? 'Legger til...' : 'Legg til standardoppskrifter'}
                        </button>
                    </div>
                )}
            </div>

            {/* FAB */}
            <div className="fixed bottom-22 right-4 pb-[env(safe-area-inset-bottom)]">
                <button
                    onClick={() => navigate('/oppskrifter/ny')}
                    className=" w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <Plus size={28} strokeWidth={2} />
                </button>
            </div>
        </div>
    )
}
