import { useState } from 'react'
import { LogOut, ChevronRight, Moon, Sun, Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'

type Theme = 'system' | 'light' | 'dark'

export function SettingsPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'system'
  })

  function applyTheme(t: Theme) {
    setTheme(t)
    localStorage.setItem('theme', t)
    const root = document.documentElement
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const sections = [
    {
      title: 'Lister',
      items: [
        { label: 'Administrer lister', onPress: () => navigate('/innstillinger/lister') },
      ],
    },
    {
      title: 'Oppskrifter',
      items: [
        { label: 'Administrer oppskrifter', onPress: () => navigate('/oppskrifter') },
      ],
    },
    {
      title: 'Utseende',
      items: [], // rendered separately below
    },
    {
      title: 'Konto',
      items: [
        { label: 'Bytt passord', onPress: () => navigate('/innstillinger/passord') },
      ],
    },
  ]

  return (
    <div className="flex flex-col flex-1 pb-16 overflow-y-auto">
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Innstillinger</h1>
      </div>

      {sections.map(section => (
        <div key={section.title} className="mt-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide px-4 mb-1">{section.title}</p>
          <div className="border-t border-neutral-100 dark:border-neutral-800">
            {section.title === 'Utseende' ? (
              <div className="px-4 py-3 flex items-center justify-between min-h-[52px] border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">Tema</span>
                <div className="flex gap-1">
                  {([['system', Monitor], ['light', Sun], ['dark', Moon]] as [Theme, React.ElementType][]).map(([t, Icon]) => (
                    <button
                      key={t}
                      onClick={() => applyTheme(t)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        theme === t
                          ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              section.items.map(item => (
                <button
                  key={item.label}
                  onClick={item.onPress}
                  className="w-full flex items-center justify-between px-4 min-h-[52px] border-b border-neutral-100 dark:border-neutral-800 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                >
                  <span className="text-sm text-neutral-900 dark:text-neutral-100">{item.label}</span>
                  <ChevronRight size={16} className="text-neutral-400" />
                </button>
              ))
            )}
          </div>
        </div>
      ))}

      <div className="px-4 mt-8">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={signOut}
        >
          <LogOut size={16} />
          Logg ut
        </Button>
      </div>
    </div>
  )
}
