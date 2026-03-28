import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

type Mode = 'login' | 'register' | 'magic'

export function AuthPage() {
    const [mode, setMode] = useState<Mode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setInfo(null)
        setLoading(true)

        try {
            if (mode === 'magic') {
                const { error } = await supabase.auth.signInWithOtp({ email })
                if (error) throw error
                setInfo('Sjekk e-posten din for en innloggingslenke.')
                return
            }

            if (mode === 'register') {
                // Verify invite code first
                const { data: valid } = await supabase.rpc('verify_invite_code', { p_code: inviteCode })
                if (!valid) {
                    setError('Ugyldig invitasjonskode.')
                    return
                }
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                // use_invite_code called after session established (in onboarding)
                setInfo('Konto opprettet! Sjekk e-posten for bekreftelse.')
                return
            }

            // login
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Noe gikk galt')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col min-h-dvh items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950">
            <div className="w-full max-w-sm space-y-6">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 text-center">
                    Sotodo
                </h1>
                <h2 className='text-center text-xl'>Den smarte handlelisten</h2>
                <p className='italic'>
                    En handleliste med litt AI, oppskrifter og "hva har jeg i kjøleskapet".
                    Kommer med forslag til oppskrifter basert på ingrediensene du har,
                    sier i fra om du allerede har noe du la til i en handleliste.
                </p>

                <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    {(['login', 'register', 'magic'] as Mode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 py-2 text-sm transition-colors ${mode === m
                                ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900'
                                : 'text-neutral-500'
                                }`}
                        >
                            {m === 'login' ? 'Logg inn' : m === 'register' ? 'Registrer' : 'Magisk lenke'}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                        type="email"
                        placeholder="E-post"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />

                    {mode !== 'magic' && (
                        <Input
                            type="password"
                            placeholder="Passord"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                    )}

                    {mode === 'register' && (
                        <Input
                            type="text"
                            placeholder="Invitasjonskode"
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                            required
                        />
                    )}

                    {error && <p className="px-2 text-sm text-red-600">{error}</p>}
                    {info && <p className="px-2 text-sm text-neutral-600 dark:text-neutral-400">{info}</p>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading
                            ? 'Vent...'
                            : mode === 'login'
                                ? 'Logg inn'
                                : mode === 'register'
                                    ? 'Opprett konto'
                                    : 'Send lenke'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
