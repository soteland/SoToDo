import { supabase } from './supabase'
import type { List, ListItem, ListType, Recipe, HjemmelagerItem } from '../types'

// ── Lists ────────────────────────────────────────────────────

export async function fetchLists(): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select(`*, list_type:list_types(*)`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as List[]
}

export async function fetchList(id: string): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .select(`*, list_type:list_types(*)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as List
}

export async function createList(payload: {
  list_type_id: string
  name: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('lists')
    .insert({ ...payload, owner_id: user!.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateList(id: string, patch: Partial<List>) {
  const { error } = await supabase.from('lists').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteList(id: string) {
  const { error } = await supabase.from('lists').delete().eq('id', id)
  if (error) throw error
}

// ── List Types ────────────────────────────────────────────────

export async function fetchListTypes(): Promise<ListType[]> {
  const { data, error } = await supabase
    .from('list_types')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as ListType[]
}

export async function createListType(payload: {
  name: string
  icon_name: string
  color: string
}) {
  const { data, error } = await supabase
    .from('list_types')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateListType(id: string, patch: Partial<ListType>) {
  const { error } = await supabase.from('list_types').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteListType(id: string) {
  const { error } = await supabase.from('list_types').delete().eq('id', id)
  if (error) throw error
}

// ── List Items ────────────────────────────────────────────────

export async function fetchListItems(listId: string): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('is_checked', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data as ListItem[]
}

export async function addListItem(payload: {
  list_id: string
  name: string
  quantity?: number
  unit?: string
  subcategory?: string
  avg_frequency_days?: number
}) {
  const { data, error } = await supabase
    .from('list_items')
    .insert({
      ...payload,
      name_normalized: payload.name.toLowerCase().trim(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateListItem(id: string, patch: Partial<ListItem>) {
  const { error } = await supabase.from('list_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function checkOffItem(id: string) {
  const { error } = await supabase.rpc('check_off_item', { p_item_id: id })
  if (error) throw error
}

export async function uncheckItem(id: string) {
  const { error } = await supabase.rpc('uncheck_item', { p_item_id: id })
  if (error) throw error
}

export async function deleteListItem(id: string) {
  const { error } = await supabase.from('list_items').delete().eq('id', id)
  if (error) throw error
}

/** All unique items across all accessible lists — deduplicated by name_normalized.
 *  Used as the catalog for recipe ingredient suggestions. */
export async function fetchItemCatalog(): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .order('last_purchased_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  // Deduplicate by name_normalized, keep highest-scored entry
  const seen = new Set<string>()
  return (data as ListItem[]).filter(item => {
    if (seen.has(item.name_normalized)) return false
    seen.add(item.name_normalized)
    return true
  })
}

export async function setPrimaryList(id: string | null, unsetId: string | null) {
  const updates: Promise<void>[] = []
  if (id) updates.push(updateList(id, { is_primary: true }))
  if (unsetId) updates.push(updateList(unsetId, { is_primary: false }))
  await Promise.all(updates)
}

// ── Smart suggestions: aggregate by name across accessible lists of same type

export async function fetchSuggestions(
  listTypeId: string,
  search: string
): Promise<{ name: string; last_purchased_at: string | null; purchase_count: number; avg_frequency_days: number | null; is_starred: boolean }[]> {
  const { data, error } = await supabase
    .from('list_items')
    .select('name, last_purchased_at, purchase_count, avg_frequency_days, is_starred')
    .eq('list_id', listTypeId) // will be replaced with RPC in Phase 2
    .ilike('name', `%${search}%`)
    .order('purchase_count', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

// ── Recipes ───────────────────────────────────────────────────

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`*, items:recipe_items(*)`)
    .order('name', { ascending: true })
  if (error) throw error
  return data as Recipe[]
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`*, items:recipe_items(* )`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Recipe
}

export async function createRecipe(payload: {
  name: string
  description?: string
  instructions?: string[]
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...payload, owner_id: user!.id })
    .select()
    .single()
  if (error) throw error
  return data as Recipe
}

export async function updateRecipe(id: string, patch: {
  name?: string
  description?: string
  instructions?: string[]
}) {
  const { error } = await supabase.from('recipes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

export async function replaceRecipeItems(recipeId: string, items: {
  item_name: string
  quantity: number
  unit: string
  is_pantry_staple: boolean
  sort_order: number
}[]) {
  const { error: delError } = await supabase.from('recipe_items').delete().eq('recipe_id', recipeId)
  if (delError) throw delError
  if (items.length === 0) return
  const { error } = await supabase.from('recipe_items').insert(
    items.map(i => ({
      ...i,
      recipe_id: recipeId,
      item_name_normalized: i.item_name.toLowerCase().trim(),
    }))
  )
  if (error) throw error
}

export async function importRecipeFromUrl(url: string): Promise<{
  name: string
  description: string
  instructions: string[]
  ingredients: { item_name: string; quantity: number; unit: string; is_pantry_staple: boolean }[]
}> {
  const { data, error } = await supabase.functions.invoke('import-recipe', { body: { url } })
  if (error) throw error
  return data
}

// ── Hjemmelager ───────────────────────────────────────────────

export async function fetchHjemmelager(): Promise<HjemmelagerItem[]> {
  const { data, error } = await supabase
    .from('hjemmelager')
    .select('*')
    .order('expires_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data as HjemmelagerItem[]
}

export async function addHjemmelagerItem(payload: {
  item_name: string
  quantity?: number
  unit?: string
  expires_at?: string | null
}) {
  const { data, error } = await supabase
    .from('hjemmelager')
    .insert({
      ...payload,
      item_name_normalized: payload.item_name.toLowerCase().trim(),
    })
    .select()
    .single()
  if (error) throw error
  return data as HjemmelagerItem
}

export async function updateHjemmelagerItem(id: string, patch: Partial<HjemmelagerItem>) {
  const { error } = await supabase.from('hjemmelager').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteHjemmelagerItem(id: string) {
  const { error } = await supabase.from('hjemmelager').delete().eq('id', id)
  if (error) throw error
}
