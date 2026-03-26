export interface Profile {
  id: string
  display_name: string | null
  color: string
  is_admin: boolean
  created_at: string
}

export interface ListType {
  id: string
  user_id: string
  name: string
  icon_name: string
  color: string
  sort_order: number
  is_default: boolean
  created_at: string
}

export interface List {
  id: string
  owner_id: string
  list_type_id: string
  name: string
  is_visible_on_home: boolean
  history_shared_at: string | null
  created_at: string
  // joined
  list_type?: ListType
  member_count?: number
}

export interface ListMember {
  id: string
  list_id: string
  user_id: string
  invited_by: string | null
  display_name: string | null
  color: string
  joined_at: string
  profile?: Profile
}

export interface ListItem {
  id: string
  list_id: string
  name: string
  name_normalized: string
  subcategory: string | null
  quantity: number
  is_checked: boolean
  checked_at: string | null
  added_at: string
  added_by: string | null
  is_starred: boolean
  comment: string | null
  purchase_count: number
  last_purchased_at: string | null
  avg_frequency_days: number | null
  sort_order: number
  unit: string
  // joined
  added_by_profile?: Pick<Profile, 'id' | 'display_name' | 'color'>
}

export interface PurchaseHistory {
  id: string
  list_item_id: string
  purchased_by: string | null
  quantity: number
  purchased_at: string
  day_of_week: number
}

export interface Recipe {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
  items?: RecipeItem[]
}

export interface RecipeItem {
  id: string
  recipe_id: string
  item_name: string
  item_name_normalized: string
  quantity: number
  unit: string
  sort_order: number
}

export interface HjemmelagerItem {
  id: string
  user_id: string
  item_name: string
  item_name_normalized: string
  list_type_id: string | null
  quantity: number
  unit: string
  added_at: string
  expires_at: string | null
  duration_days: number | null
}

export interface InviteCode {
  id: string
  code: string
  created_by: string | null
  used_by: string | null
  used_at: string | null
  max_uses: number
  use_count: number
  expires_at: string | null
  created_at: string
}

// Suggestion shown in the add-item flow
export interface ItemSuggestion {
  name: string
  name_normalized: string
  score: number
  badge: 'høy_sannsynlighet' | 'tid_siden_sist' | 'ofte_kjøpt_sammen' | 'favoritt' | null
  badge_label: string | null
  last_purchased_at: string | null
  avg_frequency_days: number | null
  subcategory: string | null
}
