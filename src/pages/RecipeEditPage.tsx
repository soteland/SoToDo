import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Trash2, Link, Loader, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { Input } from '../components/ui/input'
import { UnitPicker } from '../components/UnitPicker'
import { normalizeItemName } from '../lib/utils'
import {
    fetchRecipe,
    createRecipe,
    updateRecipe,
    replaceRecipeItems,
    deleteRecipe,
    importRecipeFromUrl,
    fetchItemCatalog,
} from '../lib/queries'
import type { ListItem } from '../types'

interface DraftItem {
    key: string
    item_name: string
    quantity: number
    unit: string
    is_pantry_staple: boolean
}

let keyCounter = 0
function newKey() { return String(++keyCounter) }
function blankItem(): DraftItem {
    return { key: newKey(), item_name: '', quantity: 1, unit: 'stk', is_pantry_staple: false }
}

export function RecipeEditPage() {
    const { id } = useParams<{ id: string }>()
    const isEdit = !!id
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: existing } = useQuery({
        queryKey: ['recipe', id],
        queryFn: () => fetchRecipe(id!),
        enabled: isEdit,
    })

    const { data: catalog } = useQuery({
        queryKey: ['item-catalog'],
        queryFn: fetchItemCatalog,
    })

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [instructions, setInstructions] = useState<string[]>([''])
    const [items, setItems] = useState<DraftItem[]>([blankItem()])
    const [urlInput, setUrlInput] = useState('')
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)

    // Refs for step textareas so we can focus after Enter
    const stepRefs = useRef<(HTMLTextAreaElement | null)[]>([])

    useEffect(() => {
        if (!existing) return
        setName(existing.name)
        setDescription(existing.description ?? '')
        setInstructions(existing.instructions?.length ? existing.instructions : [''])
        setItems(
            existing.items?.length
                ? existing.items.map(i => ({ key: newKey(), item_name: i.item_name, quantity: i.quantity, unit: i.unit, is_pantry_staple: i.is_pantry_staple }))
                : [blankItem()]
        )
    }, [existing])

    const saveMutation = useMutation({
        mutationFn: async () => {
            const cleanInstructions = instructions.map(s => s.trim()).filter(Boolean)
            const cleanItems = items.filter(i => i.item_name.trim())
            if (isEdit) {
                await updateRecipe(id!, { name: name.trim(), description: description.trim() || undefined, instructions: cleanInstructions })
                await replaceRecipeItems(id!, cleanItems.map((i, idx) => ({ ...i, item_name: i.item_name.trim(), sort_order: idx + 1 })))
                return id!
            } else {
                const recipe = await createRecipe({ name: name.trim(), description: description.trim() || undefined, instructions: cleanInstructions })
                await replaceRecipeItems(recipe.id, cleanItems.map((i, idx) => ({ ...i, item_name: i.item_name.trim(), sort_order: idx + 1 })))
                return recipe.id
            }
        },
        onSuccess: (recipeId) => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
            navigate(`/oppskrifter/${recipeId}`, { replace: true })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteRecipe(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            navigate('/oppskrifter', { replace: true })
        },
    })

    async function handleImport() {
        if (!urlInput.trim()) return
        setImporting(true)
        setImportError(null)
        try {
            const data = await importRecipeFromUrl(urlInput.trim())
            setName(data.name)
            setDescription(data.description ?? '')
            setInstructions(data.instructions?.length ? data.instructions : [''])
            setItems(data.ingredients.map(i => ({ key: newKey(), ...i })))
            setUrlInput('')
        } catch {
            setImportError('Kunne ikke hente oppskriften. Sjekk at lenken er riktig.')
        } finally {
            setImporting(false)
        }
    }

    // ── Item helpers ──────────────────────────────────────────────

    function updateItem(key: string, patch: Partial<DraftItem>) {
        setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
    }

    function removeItem(key: string) {
        setItems(prev => prev.filter(i => i.key !== key))
    }

    function pickCatalogItem(key: string, catalogItem: ListItem) {
        setItems(prev => prev.map(i => i.key === key ? {
            ...i,
            item_name: catalogItem.name,
            unit: catalogItem.unit,
            is_pantry_staple: catalogItem.is_pantry_staple,
        } : i))
    }

    // ── Step helpers ──────────────────────────────────────────────

    function updateStep(idx: number, val: string) {
        setInstructions(prev => prev.map((s, i) => i === idx ? val : s))
    }

    function addStepAfter(idx: number) {
        setInstructions(prev => {
            const next = [...prev]
            next.splice(idx + 1, 0, '')
            return next
        })
        // Focus the new step after render
        setTimeout(() => stepRefs.current[idx + 1]?.focus(), 30)
    }

    function removeStep(idx: number) {
        setInstructions(prev => prev.filter((_, i) => i !== idx))
    }

    function moveStep(idx: number, dir: -1 | 1) {
        const to = idx + dir
        setInstructions(prev => {
            if (to < 0 || to >= prev.length) return prev
            const next = [...prev]
                ;[next[idx], next[to]] = [next[to], next[idx]]
            return next
        })
        setTimeout(() => stepRefs.current[to]?.focus(), 30)
    }

    const canSave = name.trim().length > 0 && !saveMutation.isPending

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)] py-3 border-b border-neutral-100 dark:border-neutral-800">
                <button
                    onClick={() => navigate(-1)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-neutral-500"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="flex-1 font-semibold text-neutral-900 dark:text-neutral-100">
                    {isEdit ? 'Rediger oppskrift' : 'Ny oppskrift'}
                </h1>
                {isEdit && (
                    <button
                        onClick={() => { if (confirm('Slett oppskrift?')) deleteMutation.mutate() }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-300 dark:text-neutral-600 active:text-red-500 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pb-28">
                <div className="p-4 space-y-5">

                    {/* URL import */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Lim inn lenke til oppskrift..."
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleImport()}
                            className="h-11 text-sm flex-1"
                        />
                        <button
                            onClick={handleImport}
                            disabled={importing || !urlInput.trim()}
                            className="h-11 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 active:opacity-70 shrink-0"
                        >
                            {importing ? <Loader size={16} className="animate-spin" /> : <Link size={16} />}
                            Hent
                        </button>
                    </div>
                    {importError && <p className="text-xs text-red-500">{importError}</p>}

                    {/* Name */}
                    <div>
                        <p className="text-xs text-neutral-400 mb-1.5">Navn</p>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Oppskriftsnavn..."
                            className="h-11 text-base"
                        />
                    </div>

                    {/* Comment */}
                    <div>
                        <p className="text-xs text-neutral-400 mb-1.5">Kommentar</p>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Kort beskrivelse..."
                            rows={2}
                            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 resize-none outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                        />
                    </div>

                    {/* Ingredients */}
                    <div>
                        <p className="text-xs text-neutral-400 mb-2">Ingredienser</p>
                        <div className="space-y-2">
                            {items.map(item => (
                                <IngredientRow
                                    key={item.key}
                                    item={item}
                                    catalog={catalog ?? []}
                                    onChange={patch => updateItem(item.key, patch)}
                                    onRemove={() => removeItem(item.key)}
                                    onPickCatalog={ci => pickCatalogItem(item.key, ci)}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => setItems(prev => [...prev, blankItem()])}
                            className="mt-2 flex items-center gap-1.5 text-sm text-neutral-400 active:opacity-60"
                        >
                            <Plus size={14} /> Legg til ingrediens
                        </button>
                    </div>

                    {/* Instructions */}
                    <div>
                        <p className="text-xs text-neutral-400 mb-2">Fremgangsmåte</p>
                        <div className="space-y-2">
                            {instructions.map((step, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-neutral-400 mt-2.5 w-4 shrink-0 text-right">{i + 1}</span>
                                    <textarea
                                        ref={el => { stepRefs.current[i] = el }}
                                        value={step}
                                        onChange={e => updateStep(i, e.target.value)}
                                        placeholder={`Steg ${i + 1}...`}
                                        rows={2}
                                        className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 resize-none outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                addStepAfter(i)
                                            }
                                        }}
                                    />
                                    <div className="flex flex-col gap-0.5 mt-1 shrink-0">
                                        <button
                                            onClick={() => moveStep(i, -1)}
                                            disabled={i === 0}
                                            className="p-1 text-neutral-300 dark:text-neutral-600 disabled:opacity-20 active:text-neutral-600"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => moveStep(i, 1)}
                                            disabled={i === instructions.length - 1}
                                            className="p-1 text-neutral-300 dark:text-neutral-600 disabled:opacity-20 active:text-neutral-600"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                        {instructions.length > 1 && (
                                            <button
                                                onClick={() => removeStep(i)}
                                                className="p-1 text-neutral-300 dark:text-neutral-600 active:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setInstructions(prev => [...prev, ''])
                                setTimeout(() => stepRefs.current[instructions.length]?.focus(), 30)
                            }}
                            className="mt-2 flex items-center gap-1.5 text-sm text-neutral-400 active:opacity-60"
                        >
                            <Plus size={14} /> Legg til steg
                        </button>
                    </div>

                </div>
            </div>

            {/* Save button */}
            <div className="fixed bottom-14 inset-x-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={!canSave}
                    className="w-full h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 font-medium disabled:opacity-40 active:opacity-80 transition-opacity"
                >
                    {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
                </button>
            </div>
        </div>
    )
}

// ── Ingredient row with catalog search ────────────────────────

function IngredientRow({ item, catalog, onChange, onRemove, onPickCatalog }: {
    item: DraftItem
    catalog: ListItem[]
    onChange: (patch: Partial<DraftItem>) => void
    onRemove: () => void
    onPickCatalog: (item: ListItem) => void
}) {
    const [focused, setFocused] = useState(false)
    const [searchVal, setSearchVal] = useState(item.item_name)
    const containerRef = useRef<HTMLDivElement>(null)

    const normalizedSearch = normalizeItemName(searchVal)

    const suggestions = focused && normalizedSearch.length > 0
        ? catalog
            .filter(ci => ci.name_normalized.includes(normalizedSearch))
            .slice(0, 6)
        : []

    // Sync external item_name changes (e.g. from import)
    useEffect(() => { setSearchVal(item.item_name) }, [item.item_name])

    const handleBlur = useCallback(() => {
        // Delay so tap on suggestion fires first
        setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
                setFocused(false)
                onChange({ item_name: searchVal })
            }
        }, 150)
    }, [searchVal, onChange])

    return (
        <div ref={containerRef} className="space-y-1.5 border-b-2 border-neutral-100 dark:border-neutral-800 pb-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                        value={searchVal}
                        onChange={e => { setSearchVal(e.target.value); onChange({ item_name: e.target.value }) }}
                        onFocus={() => setFocused(true)}
                        onBlur={handleBlur}
                        placeholder="Ingrediens..."
                        className="w-full h-9 pl-7 pr-2 border rounded-lg border-neutral-200 dark:border-neutral-700 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400"
                    />
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10 overflow-hidden">
                            {suggestions.map(ci => (
                                <button
                                    key={ci.id}
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => { onPickCatalog(ci); setSearchVal(ci.name); setFocused(false) }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-50"
                                >
                                    <span>{ci.name}</span>
                                    <span className="text-xs text-neutral-400">{ci.is_pantry_staple ? 'basisvare' : ''}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => onChange({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-9 w-14 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-2 text-sm text-center text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400"
                />
                <button onClick={onRemove} className="text-neutral-300 dark:text-neutral-600 active:text-red-500 transition-colors px-1">
                    <Trash2 size={14} />
                </button>
            </div>
            <div className="flex items-center justify-between gap-3">
                <UnitPicker extended value={item.unit} onChange={u => onChange({ unit: u })} />
                <button
                    type="button"
                    onClick={() => onChange({ is_pantry_staple: !item.is_pantry_staple })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 ${item.is_pantry_staple
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 border-transparent'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-400'
                        }`}
                >
                    Basisvare
                </button>
            </div>
        </div>
    )
}
