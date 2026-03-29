import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, EyeOff } from 'lucide-react'
import { fetchLists } from '../lib/queries'
import { SvgIcon } from '../components/SvgIcon'
import { Skeleton } from '../components/ui/skeleton'

export function ListsPage() {
    const navigate = useNavigate()
    const { data: lists, isLoading } = useQuery({
        queryKey: ['lists'],
        queryFn: fetchLists,
    })

    return (
        <div className="flex flex-col flex-1 pb-16">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alle lister</h1>
                <button
                    onClick={() => navigate('/ny-liste')}
                    className="min-w-11 min-h-11 flex items-center justify-center text-neutral-500"
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

                {lists?.map(list => {
                    const color = list.list_type?.color ?? '#6BBF8E'
                    const iconName = list.list_type?.icon_name ?? 'list'
                    return (
                        <button
                            key={list.id}
                            onClick={() => navigate(`/liste/${list.id}`)}
                            className="w-full flex items-center gap-3 px-4 min-h-15 border-b border-neutral-100 dark:border-neutral-900 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: color }}
                            >
                                <SvgIcon name={iconName} className="w-5 h-5 text-white" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {list.name}
                            </span>
                            {!list.is_visible_on_home && (
                                <EyeOff size={14} className="text-neutral-300 dark:text-neutral-600" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
