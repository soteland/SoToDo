import { NavLink } from 'react-router-dom'
import { Home, UtensilsCrossed, Refrigerator, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const links = [
    { to: '/', icon: Home, label: 'Hjem' },
    { to: '/hjemmelager', icon: Refrigerator, label: 'Lager' },
    { to: '/oppskrifter', icon: UtensilsCrossed, label: 'Oppskrifter' },
    { to: '/innstillinger', icon: Settings, label: 'Innstillinger' },
]

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
            <div className="flex h-18">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            cn(
                                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                                isActive
                                    ? 'text-neutral-900 dark:text-neutral-50'
                                    : 'text-neutral-400 dark:text-neutral-500'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon size={25} strokeWidth={isActive ? 2.5 : 1.8} />
                                <span>{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
