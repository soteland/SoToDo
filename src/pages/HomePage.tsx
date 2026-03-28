import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { fetchLists } from '../lib/queries'
import { SvgIcon } from '../components/SvgIcon'
import { Skeleton } from '../components/ui/skeleton'
import { useListColor } from '../hooks/useListColor'
import type { List } from '../types'

export function HomePage() {
    const navigate = useNavigate()
    const { data: lists, isLoading } = useQuery({
        queryKey: ['lists'],
        queryFn: fetchLists,
    })

    const visibleLists = lists?.filter(l => l.is_visible_on_home).reverse() ?? []

    return (
        <div className="flex flex-col flex-1 overflow-y-auto pb-16 justify-end mb-2">
            {/* Scrollable top area — logo/branding, revealed on scroll up */}


            {/* Tile grid */}
            <div className="grid grid-cols-2 gap-3 p-3 ">
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}

                {visibleLists.map(list => (
                    <ListTile key={list.id} list={list} onClick={() => navigate(`/liste/${list.id}`)} />
                ))}

                <button
                    onClick={() => navigate('/ny-liste')}
                    className="h-28 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center gap-1 text-neutral-400 dark:text-neutral-600 active:opacity-70 transition-opacity"
                >
                    <Plus size={24} strokeWidth={1.5} />
                    <span className="text-xs">Ny liste</span>
                </button>
            </div>
        </div>
    )
}

function ListTile({ list, onClick }: { list: List; onClick: () => void }) {
    const color = useListColor(list.list_type?.color ?? '#6BBF8E')
    const iconName = list.list_type?.icon_name ?? 'list'

    return (
        <button
            onClick={onClick}
            className="h-28 rounded-xl flex flex-col items-start justify-between p-4 active:opacity-80 transition-opacity text-left"
            style={{ backgroundColor: color }}
        >
            <SvgIcon
                name={iconName}
                className="w-12 h-12 text-white/90"
            />
            <span className="text-white font-medium text-md leading-tight">
                {list.name}
            </span>
        </button>
    )
}
