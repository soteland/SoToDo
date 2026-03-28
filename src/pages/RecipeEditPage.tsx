import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Trash2, Link, Loader, ChevronUp, ChevronDown, Search, Minus } from 'lucide-react'
import { Input } from '../components/ui/input'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { Badge } from '../components/ui/badge'
import { UNITS_EXTENDED } from '../components/UnitPicker'
import { normalizeItemName, timeSinceLabel, scoreItem, daysSince } from '../lib/utils'
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
    const [items, setItems] = useState<DraftItem[]>([])
    const [urlInput, setUrlInput] = useState('')
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)
    const [pickerOpen, setPickerOpen] = useState(false)

    const stepRefs = useRef<(HTMLTextAreaElement | null)[]>([])

    useEffect(() => {
        if (!existing) return
        setName(existing.name)
        setDescription(existing.description ?? '')
        setInstructions(existing.instructions?.length ? existing.instructions : [''])
        setItems(
            existing.items?.length
                ? existing.items.map(i => ({ key: newKey(), item_name: i.item_name, quantity: i.quantity, unit: i.unit, is_pantry_staple: i.is_pantry_staple }))
                : []
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

    function updateItem(key: string, patch: Partial<DraftItem>) {
        setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
    }

    function removeItem(key: string) {
        setItems(prev => prev.filter(i => i.key !== key))
    }

    function addFromPicker(name: string, quantity: number, unit: string) {
        const normalized = normalizeItemName(name)
        const catalogItem = (catalog ?? []).find(c => c.name_normalized === normalized)
        setItems(prev => [...prev, {
            key: newKey(),
            item_name: name.trim(),
            quantity,
            unit,
            is_pantry_staple: catalogItem?.is_pantry_staple ?? false,
        }])
    }

    function updateStep(idx: number, val: string) {
        setInstructions(prev => prev.map((s, i) => i === idx ? val : s))
    }

    function addStepAfter(idx: number) {
        setInstructions(prev => {
            const next = [...prev]
            next.splice(idx + 1, 0, '')
            return next
        })
        setTimeout(() => stepRefs.current[idx + 1]?.focus(), 30)
    }

    function removeStep(idx: number) {
        setInstructions(prev => prev.filter((_, i) => i !== idx))
    }

    function moveStep(idx: number, dir: -1 | 1) {
        const to = idx + dir
        setInstructions(prev => {
            if (to < 0 || to >= prev.length) return prev
            const next = [...prev];
            [next[idx], next[to]] = [next[to], next[idx]]
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

                        <div>
                            <PrimaryButton
                                onClick={handleImport}
                                disabled={importing || !urlInput.trim()}
                                className=""
                            >
                                {importing ? <Loader size={16} className="animate-spin" /> : <Link size={16} />}
                                Hent

                            </PrimaryButton>
                        </div>
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
                        {items.length > 0 && (
                            <div className="mb-2">
                                {items.map(item => (
                                    <IngredientRow
                                        key={item.key}
                                        item={item}
                                        onChange={patch => updateItem(item.key, patch)}
                                        onRemove={() => removeItem(item.key)}
                                    />
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="flex items-center gap-1.5 text-sm text-neutral-400 active:opacity-60"
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
                                        <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1 text-neutral-300 dark:text-neutral-600 disabled:opacity-20 active:text-neutral-600">
                                            <ChevronUp size={14} />
                                        </button>
                                        <button onClick={() => moveStep(i, 1)} disabled={i === instructions.length - 1} className="p-1 text-neutral-300 dark:text-neutral-600 disabled:opacity-20 active:text-neutral-600">
                                            <ChevronDown size={14} />
                                        </button>
                                        {instructions.length > 1 && (
                                            <button onClick={() => removeStep(i)} className="p-1 text-neutral-300 dark:text-neutral-600 active:text-red-500 transition-colors">
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
            <div className="fixed bottom-14 inset-x-0 px-4 pb-7 pt-2 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
                <PrimaryButton onClick={() => saveMutation.mutate()} disabled={!canSave}>
                    {saveMutation.isPending ? 'Lagrer...' : 'Lagre'}
                </PrimaryButton>
            </div>

            {/* Ingredient picker sheet */}
            <IngredientPickerSheet
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                catalog={catalog ?? []}
                onAdd={addFromPicker}
            />
        </div >
    )
}

// ── Ingredient display row ─────────────────────────────────────

function stepSize(quantity: number): number {

    if (quantity >= 100) return 100
    if (quantity >= 10) return 10

    return 1
}

function IngredientRow({ item, onChange, onRemove }: {
    item: DraftItem
    onChange: (patch: Partial<DraftItem>) => void
    onRemove: () => void
}) {
    const [confirming, setConfirming] = useState(false)

    return (
        <div className="">
            <div className='flex items-center gap-2 min-h-11'>
                <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.item_name}</span>
                <button
                    type="button"
                    onClick={() => onChange({ quantity: Math.max(1, item.quantity - stepSize(item.quantity)) })}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-medium active:opacity-70"
                >
                    −
                </button>
                <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => onChange({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-12 rounded border border-neutral-200 dark:border-neutral-700 bg-transparent px-1.5 text-sm text-center text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400"
                />
                <button
                    type="button"
                    onClick={() => onChange({ quantity: item.quantity + stepSize(item.quantity) })}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-medium active:opacity-70"
                >
                    +
                </button>
                <select
                    value={item.unit}
                    onChange={e => onChange({ unit: e.target.value })}
                    className="h-8 rounded border border-neutral-200 dark:border-neutral-700 bg-transparent px-1.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400"
                >
                    {UNITS_EXTENDED.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            <div className='flex items-center justify-end gap-2 min-h-11 border-b border-neutral-100 dark:border-neutral-800'>


                <button
                    type="button"
                    onClick={() => onChange({ is_pantry_staple: !item.is_pantry_staple })}
                    className={`h-8 px-4 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${item.is_pantry_staple
                        ? 'bg-neutral-900 dark:bg-neutral-400 text-neutral-50 dark:text-neutral-900'
                        : 'bg-neutral-200 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-400'
                        }`}
                >
                    Basisvare
                </button>
                {confirming ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        onBlur={() => setConfirming(false)}
                        autoFocus
                        className="h-8 px-4 rounded-full bg-red-500 dark:bg-red-800 text-white text-xs font-medium active:opacity-70 shrink-0"
                    >
                        Sikker?
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-300 active:opacity-70 transition-colors shrink-0"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    )
}

// ── Ingredient picker sheet (same UX as AddItemSheet) ──────────

function IngredientPickerSheet({ open, onClose, catalog, onAdd }: {
    open: boolean
    onClose: () => void
    catalog: ListItem[]
    onAdd: (name: string, quantity: number, unit: string) => void
}) {
    const [search, setSearch] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [unit, setUnit] = useState('stk')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300)
        } else {
            setSearch('')
            setQuantity(1)
            setUnit('stk')
        }
    }, [open])

    const normalizedSearch = normalizeItemName(search)

    const suggestions = catalog
        .filter(item => {
            if (!normalizedSearch) return true
            return item.name_normalized.includes(normalizedSearch)
        })
        .map(item => ({
            ...item,
            score: scoreItem({
                daysSincePurchase: daysSince(item.last_purchased_at),
                avgFrequencyDays: item.avg_frequency_days,
                isStarred: item.is_starred,
                associationWeight: 0,
                purchaseCount: item.purchase_count,
            }),
        }))
        .sort((a, b) => b.score - a.score)

    const exactMatch = catalog.find(i => i.name_normalized === normalizedSearch)

    function pick(name: string, itemUnit?: string) {
        if (!name.trim()) return
        onAdd(name.trim(), quantity, itemUnit ?? unit)
        setSearch('')
        setQuantity(1)
        setUnit('stk')
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    function badgeFor(item: ListItem & { score: number }) {
        if (item.is_starred) return { label: '⭐', className: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' }
        const days = daysSince(item.last_purchased_at)
        const label = timeSinceLabel(item.last_purchased_at)
        if (days !== null && item.avg_frequency_days && days >= item.avg_frequency_days * 0.9) {
            return { label: '🔴 Høy sannsynlighet', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' }
        }
        if (label) return { label: `🕐 ${label}`, className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' }
        return null
    }

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent
                side="bottom"
                className="h-[93vh]! px-0 flex flex-col border-t border-neutral-100 dark:border-neutral-800"
            >
                {/* Search input */}
                <div className="px-4 pt-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <Input
                            ref={inputRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Søk eller skriv ny ingrediens..."
                            className="pl-9 h-11"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && search.trim()) {
                                    exactMatch ? pick(exactMatch.name, exactMatch.unit) : pick(search)
                                }
                            }}
                        />
                    </div>

                    {/* Quantity + unit */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                            >
                                <Minus size={12} />
                            </button>
                            <span className="w-5 text-center text-sm font-medium text-neutral-900 dark:text-neutral-100">{quantity}</span>
                            <button
                                onClick={() => setQuantity(q => q + 1)}
                                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center active:opacity-70"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <div className="flex gap-1.5">
                                {UNITS_EXTENDED.map(u => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => setUnit(u)}
                                        className={`px-3 h-8 rounded-full text-xs font-medium transition-colors shrink-0 ${unit === u
                                            ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900'
                                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                            }`}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Suggestions */}
                <div className="flex-1 overflow-y-auto">
                    {suggestions.map(item => {
                        const badge = badgeFor(item)
                        return (
                            <button
                                key={item.id}
                                onClick={() => pick(item.name, item.unit)}
                                className="w-full flex items-center gap-3 px-4 min-h-[52px] border-b border-neutral-100 dark:border-neutral-900 text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                            >
                                <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">{item.name}</span>
                                {item.is_pantry_staple && (
                                    <span className="text-xs text-neutral-400 shrink-0">B</span>
                                )}
                                {badge && (
                                    <Badge variant="secondary" className={`text-xs shrink-0 ${badge.className}`}>
                                        {badge.label}
                                    </Badge>
                                )}
                            </button>
                        )
                    })}

                    {search.trim() && !exactMatch && (
                        <button
                            onClick={() => pick(search)}
                            className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left active:bg-neutral-50 dark:active:bg-neutral-900"
                        >
                            <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 flex-shrink-0">
                                <Plus size={16} />
                            </div>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Legg til <strong className="text-neutral-900 dark:text-neutral-100">"{search.trim()}"</strong>
                            </span>
                        </button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
