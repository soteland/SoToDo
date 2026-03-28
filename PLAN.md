# SoToDo — Full App Plan

> Smart, thumb-friendly shopping & todo lists for norske familier.
> Norwegian UI. Mobile-first PWA. Replaces paid grocery apps.
> "So" and "t" in the name plays to my username "SoTeland"
> Initially invite only

---

## Core Principles
- **Thumb-first**: all interactive elements reachable with one thumb, bottom nav, no top chrome
- **Zero friction**: adding an item must be fast — search, tap, done
- **Learns over time**: smart suggestions get better the more you use it
- **Norwegian throughout**: all UI text, labels, dates in Norwegian

## Styling Rules (for Claude — do not override)

> Design is the owner's domain. Code ships structure and function. Owner styles it.

- **Less is more.** No decorative elements, no gradients, no shadows unless functionally necessary.
- **Screen space is precious.** Every pixel must earn its place. No padding inflation, no unnecessary margins.
- **Clickability first.** Touch targets minimum 44×44px. Spacing exists to prevent mis-taps, not for aesthetics.
- **Stability over cleverness.** No animations that could jank. Transitions only where they aid orientation (e.g. sheet slide-up).
- **shadcn/ui components** for all interactive elements — but unstyled as much as possible. No purple, no default shadcn accent colors.
- **Tailwind `neutral` scale** for all non-list-specific color: `neutral-50` through `neutral-950`. No `slate`, `zinc`, `stone` mixing. No arbitrary color values outside of list colors.
- **List colors** (user-defined hex) are the only non-neutral colors in the UI. They appear on: tile backgrounds, icon fill, colored dots, active state accents.
- **No lorem ipsum, no placeholder copy.** Real Norwegian strings or nothing.
- **Claude does not refactor styles** the owner hasn't touched. Only add structure needed to make the feature work.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Data fetching | TanStack Query |
| Backend / DB | Supabase (Postgres + Auth + Edge Functions) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Auth | Supabase email+password + magic link |
| PWA | Vite PWA plugin (vite-plugin-pwa) |

---

## List Types & Icon System

### Icons
Font Awesome Pro SVGs in `/icons/*.svg` (renamed from `.svg`). Rendered inline in React with all `fill` attributes stripped and replaced by `currentColor` — icon color driven entirely by the list's chosen color.

**45 icons, all choosable for any list. No names shown in the picker — visual grid only.**

```
alien-8bit        books             book
building-columns  building          caduceus
calendar-check    camera-movie      capsule
cars              car               cart-shopping
car-wrench        casette-tape      chart-tree-map
cloud-sun         film-music        film
fork-knife        garage            gears
gifts             gift              grid-round-t-plus
hammer-brush      hammer            house-chimney
kitchen-set       list-check        list-music
list              map-location      money-bill
mortar-pestle     paw               pills
plane-departure   pot-food          refrigerator
rocket-launch     screwdriver-wrench  sun-bright
sun               toolbox           tree-christmas
utensils
```

### Icon Picker UX
- Scrollable grid of icon thumbnails, **no text labels**
- Selected icon highlighted with the list's current color
- Renders at ~40px in picker, same SVG scales perfectly to any size
- Template defaults pre-selected but freely swappable

### Default Color Palette
Offered as swatches when creating/editing a list. Pleasing, accessible, distinct:

| Swatch | Hex | Default for |
|--------|-----|-------------|
| 🟢 Frisk grønn | `#6BBF8E` | Handleliste |
| 🔵 Pastel blå | `#7EB8D4` | Apotek |
| ⬛ Koksgrå | `#3D3D3D` | Verktøy |
| 🔴 Myk rød | `#D97B7B` | Gaver |
| 🟡 Varm gul | `#E8C86A` | Interiør |
| 🟠 Varm oransje | `#E8956A` | Bygg & Hage |
| 🟣 Lavendel | `#9B8EC4` | Jul |
| 🩶 Kald grå | `#8FAAB8` | Hjemmelager |
| 🩷 Dusty rose | `#C48E9B` | Diverse / egendefinert |
| 🌿 Slate grønn | `#7A9E8E` | Egendefinert |

User can also enter a custom hex value.

### Template Lists (one-click creation)
Onboarding and "Ny liste" screen offers template tiles. Tapping one creates the list instantly with pre-filled name, icon, and color — all editable afterwards.

| Template | Navn (default) | Icon | Farge |
|----------|----------------|------|-------|
| **Handleliste** ← only forced default | Handleliste | `cart-shopping.svg` | `#6BBF8E` |
| Apotek | Apotek | `pills.svg` | `#7EB8D4` |
| Interiør | Interiør | `kitchen-set.svg` | `#E8C86A` |
| Verktøy | Verktøy | `screwdriver-wrench.svg` | `#3D3D3D` |
| Gaver | Gaveønsker | `gifts.svg` | `#D97B7B` |
| Jul | Julegaver | `tree-christmas.svg` | `#9B8EC4` |
| Diverse | Diverse | `list.svg` | `#8FAAB8` |

**"Handleliste" is the only forced default** — every new account gets one automatically. All others are opt-in during onboarding or "Ny liste".

### Manual "Legg til liste" flow
After the template tiles, a plain **[+ Lag din egen]** button:
1. Enter list name (free text)
2. Pick icon from scrollable icon picker (all icons in `/icons/`)
3. Pick color from palette swatches (or enter hex)
4. Tap "Opprett" → done

### Home screen tile rules
- **Every list is a tile** — no hierarchy. Two grocery lists = two tiles side by side.
- **Scrollable grid** — 2 columns, as many rows as needed. Most-used lists closest to thumb (bottom).
- **Hideable** — any list hidden from home screen via long-press → "Skjul fra forsiden". Still accessible via Lister tab. Hidden ≠ deleted.
- Top of screen scrolled off by default — logo/branding visible only on scroll up.
- Tile reordering via long-press drag (or in Innstillinger → Lister).

---

## Data Model

```sql
-- Users (Supabase Auth handles this)
-- auth.users: id, email

-- List types (6 defaults seeded, user can add/rename)
list_types
  id uuid PK
  user_id uuid FK auth.users
  name text                        -- "Dagligvarer"
  emoji text                       -- "🛒"
  sort_order int
  created_at timestamptz

-- Lists — owned by one user, optionally shared
lists
  id uuid PK
  owner_id uuid FK auth.users
  list_type_id uuid FK list_types
  name text                        -- "Dagligvarer", "Julegaver 2026"
  history_shared_at timestamptz    -- set when first shared; null = never shared
  created_at timestamptz

-- Who can access a list (owner is implicit from lists.owner_id)
list_members
  id uuid PK
  list_id uuid FK lists
  user_id uuid FK auth.users
  invited_by uuid FK auth.users
  display_name text                -- "Mamma", "Sofie"
  color text                       -- hex for colored dot
  joined_at timestamptz
  -- resharing: only lists.owner_id can invite. Enforced by RLS.

-- Items belong to a list — no global catalog
list_items
  id uuid PK
  list_id uuid FK lists
  name text                        -- "Melk" — name-based, not FK to a catalog
  name_normalized text             -- lowercase trimmed, for dedup + search
  quantity int default 1
  is_checked bool default false
  checked_at timestamptz
  added_at timestamptz
  added_by uuid FK auth.users      -- for colored dot
  subcategory text                 -- AI-suggested: 'meieri', 'kjøtt', 'frysevarer' etc.
  is_starred bool default false    -- shared star (trust assumed within list)
  comment text                     -- shared note (trust assumed within list)
  purchase_count int default 0     -- how many times bought on this list
  last_purchased_at timestamptz    -- most recent check-off on this list
  avg_frequency_days float         -- AI-seeded on creation, refined from purchase history

-- Purchase history per item per list
purchase_history
  id uuid PK
  list_item_id uuid FK list_items
  purchased_by uuid FK auth.users  -- for colored dot on history
  quantity int
  purchased_at timestamptz
  day_of_week int                  -- 0=Mon..6=Sun, for pattern learning

-- Autocomplete: aggregates by name_normalized + list_type across all accessible lists
-- Query: SELECT name, MAX(last_purchased_at), SUM(purchase_count)
--        FROM list_items JOIN lists ON list_id
--        WHERE list_type_id = ? AND (owner_id = me OR list_members.user_id = me)
--        GROUP BY name_normalized

-- Item associations — name-based since items have no global ID
item_associations
  id uuid PK
  user_id uuid FK auth.users       -- personal associations
  item_name_normalized text        -- "melk"
  list_type_id uuid FK list_types  -- scoped to list type
  associated_name_normalized text  -- "smør"
  weight float                     -- 0.0 to 1.0
  source text                      -- 'admin' | 'learned'

-- Recipes — owned by creator, shared by magic link or to specific lists
recipes
  id uuid PK
  owner_id uuid FK auth.users
  name text                        -- "Tacokveld"
  description text
  created_at timestamptz

recipe_items
  id uuid PK
  recipe_id uuid FK recipes
  item_name text                   -- "Kjøttdeig" — name-based, matched on add
  quantity int default 1

-- Recipe sharing
recipe_share_tokens
  id uuid PK
  recipe_id uuid FK recipes
  token text UNIQUE
  created_by uuid FK auth.users
  expires_at timestamptz
  created_at timestamptz

-- List share — warning acknowledged before sharing history
list_share_invites
  id uuid PK
  list_id uuid FK lists
  token text UNIQUE
  invited_by uuid FK auth.users
  history_warning_acknowledged bool default false  -- owner must check box
  expires_at timestamptz
  used_by uuid FK auth.users
  used_at timestamptz

-- Invite codes (app-level, invite-only registration)
invite_codes
  id uuid PK
  code text UNIQUE
  created_by uuid FK auth.users
  used_by uuid FK auth.users
  used_at timestamptz
  expires_at timestamptz

-- AI usage log (cost control)
ai_usage_log
  id uuid PK
  user_id uuid FK auth.users
  function_name text
  tokens_used int
  called_at timestamptz

-- Hjemmelager — personal, per user (not shared)
hjemmelager_items
  id uuid PK
  user_id uuid FK auth.users
  item_name text
  item_name_normalized text
  list_type_id uuid FK list_types  -- scoped so "Melk" only appears in grocery context
  quantity int default 1
  added_at timestamptz
  expires_at timestamptz
  duration_days int
```

---

## Navigation — Bottom Bar Only

```
[ 🏠 Hjem ] [ 📋 Lister ] [ 🍽️ Oppskrifter ] [ ⚙️ Innstillinger ]
```

No top navigation. No persistent header logo. Every screen reachable from thumb zone.

---

## Screens & UX

### 🏠 Hjem (/)
- 2×3 grid of list type tiles — full screen, no wasted space
- Bottom row = most-used (closest to thumb)
- Top partial row = scrolled off, revealed by scrolling up
- Tap tile → open that list

### 📋 Liste (/liste/:typeId)
- **Active items** — alphabetical, all visible
  - Each row: `[item name] [qty badge if >1] [⋯]`
  - Starred items (★) shown with subtle highlight/bold — same sort position
  - Tap item row = check it off (greys out, sinks to bottom)
  - ⋯ button = open item modal
- **Recipe nudge** (between active and greyed) — glowing ℹ️ strip if ≥80% of a recipe's items are on the list: "Du mangler bare X fra Tacokveld" → tap → modal → legg til?
- **Greyed-out items** — checked items, alphabetical, always visible when scrolling (or immediately if active list is short). Tap = restore to active list.
- **[+ Legg til]** button — fixed at bottom above nav bar

### ➕ Legg til (bottom sheet / modal from list)
- Large search field, autofocus
- **Smart suggestions at top** with badges:
  - `🔴 Høy sannsynlighet` — time + pattern says you need this
  - `🕐 4 uker siden sist` — time-based
  - `🛒 Ofte kjøpt sammen` — bought with current list items
  - `⭐ Favoritt` — starred items
- Below suggestions: live search results from catalog
- Bottom of list: `+ Legg til "[søkeord]" som ny vare`
- Tap any result → added to list instantly, sheet stays open for more

### ⋯ Item Modal (full screen)
Opened from the ⋯ button on any list row:
- **Navn** — editable text field
- **Kommentar** — personal note ("kjøp glutenfri", "Rema er billigst")
- **Liste** — which list type this belongs to (dropdown)
- **Antall** — +/− stepper for quantity on current list
- **Oppskrifter** — which recipes this item belongs to (read-only chips)
- **★ Stjerne** — toggle, visually marks item as important
- **Historikk** — "Sist kjøpt: 3. mars", "Kjøpt X ganger"
- Delete / arkiver item (bottom, destructive)

### 🍽️ Oppskrifter (/oppskrifter)
- List of recipes with name + item count
- Tap → recipe detail page
- Recipe detail: list of ingredients + qty, preview of what you already have vs. missing
- **[Legg til i liste]** → preview screen (select/deselect items) → add unchecked ones to Dagligvarer

### ⚙️ Innstillinger (/innstillinger)
- **Profil**: email, bytt passord, logg ut
- **Lister**: reorder, rename, add, delete list types
- **Oppskrifter**: manage (also accessible from Oppskrifter tab)
- **Varekatalog**: search/browse all items, edit associations
- **Assosiasjoner**: "når melk → foreslå smør og juice"
- **Utseende**: 🌙 mørk / ☀️ lys / 🔄 system (toggle)
- **Onboarding**: re-run onboarding wizard
- **Data**: eksporter, slett konto

### 🧙 Onboarding (first launch)
Step 1 — Velg dine lister (activate/deactivate the 6 defaults + can add own)
Step 2 — Forhåndslagte oppskrifter (checkbox list of 10 recipes to import)
Step 3 — Ferdig! (or "Sett opp manuelt" to skip all)
PWA install prompt + iOS Safari tip shown here.

---

## Smart Suggestion Scoring

Runs in **Supabase Edge Function** (or client-side for MVP):

```
score(item) =
  time_score        × 0.35   // days_since_purchase / avg_frequency_days
  + star_score      × 0.20   // is_starred ? 1 : 0
  + dow_score       × 0.15   // historical purchase rate on today's day-of-week
  + together_score  × 0.20   // association weight with items already on list
  + admin_boost     × 0.10   // admin-defined forced association
```

Items with score > 0.6 get a badge. Top 5 shown in add sheet.

---

## Recipe Completion Detection

- Runs on every list change
- If ≥ 80% of a recipe's items are on the active list → show nudge
- Nudge: glowing ℹ️ strip between active and greyed items
- Tap → modal: "Tacokveld: du har 5 av 6 varer. Legge til Rømme?"
- Threshold: 80% hardcoded (configurable per recipe in backlog)

---

## PWA & Auth

- **vite-plugin-pwa** generates manifest + service worker
- App icon, splash screen, `display: standalone`
- Supabase: `persistSession: true`, `autoRefreshToken: true` — session survives restarts
- Magic link as re-login fallback (one tap from email)
- Onboarding tip: "Legg til på hjemskjermen via Safari for best opplevelse (iOS)"
- Dark mode: follows system by default, manual toggle in Innstillinger

---

## Starter Data — Norwegian Family

### Dagligvarer katalog
**Meieri & egg:** Melk, Smør, Gulost, Rømme, Fløte, Yoghurt, Egg, Kesam, Kvarg, Crème fraîche
**Brød & bakst:** Brød, Knekkebrød, Tortillas, Hamburgerbrød, Pitabrød, Bagels
**Kjøtt & fisk:** Kjøttdeig, Kyllingfilet, Bacon, Pølser, Laks, Fiskepinner, Karbonader, Svinekoteletter
**Grønnsaker:** Løk, Hvitløk, Tomat, Agurk, Paprika, Salat, Gulrot, Potet, Brokkoli, Purre, Mais (boks), Spinat, Søtpotet, Sjampinjong, Squash
**Frukt:** Eple, Banan, Appelsin, Druer, Jordbær (fryst), Sitron
**Tørrmat & hermetikk:** Spagetti, Pasta (penne), Ris, Havregryn, Hermetiske tomater, Tomatpuré, Kidneybønner, Kikærter, Buljongterning (kylling), Buljongterning (kjøtt), Tacokrydder, Kokosmelk
**Drikke:** Juice (appelsin), Kaffe, Te, Mineralvann, Saft
**Frysvarer:** Frosne erter, Pommes frites, Frosne bønner
**Krydder & annet:** Salt, Pepper, Oregano, Basilikum, Paprikakrydder, Karri, Hvetemel, Bakepulver, Gjær, Olivenolje, Rapsolje, Sesamolje, Ketchup, Majones, Sennep, Soyasaus, Salsa (jar), Honning, Syltetøy, Sukker, Brunt sukker, Mørk sjokolade, Kakao, Vaniljesukker, Maizena

### 10 Oppskrifter
1. **Tacokveld** — Kjøttdeig, Tacokrydder, Tortillas, Salsa, Rømme, Gulost, Salat, Tomat, Paprika, Løk
2. **Spagetti Bolognese** — Spagetti, Kjøttdeig, Hermetiske tomater, Løk, Hvitløk, Tomatpuré, Buljongterning (kjøtt), Olivenolje
3. **Hjemmelaget pizza** — Hvetemel, Gjær, Hermetiske tomater, Gulost, Kjøttdeig, Paprika, Løk, Bacon
4. **Kylling wok** — Kyllingfilet, Ris, Paprika, Gulrot, Løk, Soyasaus, Hvitløk, Sesamolje
5. **Laksemiddag** — Laks, Potet, Brokkoli, Smør, Fløte, Sitron
6. **Pølse & pommes frites** — Pølser, Pommes frites, Ketchup, Sennep
7. **Havregrøt** — Havregryn, Melk, Sukker, Smør
8. **Pannekaker** — Hvetemel, Egg, Melk, Smør, Sukker
9. **Hamburger** — Kjøttdeig, Hamburgerbrød, Salat, Tomat, Løk, Gulost, Ketchup, Majones
10. **Fiskesuppe** — Laks, Fløte, Buljongterning (kylling), Gulrot, Potet, Purre, Smør

---

## Feature Phases

### Phase 1 — MVP (build this first)
- [x] Supabase project setup (DB schema, RLS policies, triggers, seeded list types)
- [x] Vite + React + shadcn/ui scaffold
- [x] PWA manifest + install prompt (vite-plugin-pwa)
- [x] Auth: email+password + magic link, session persistence, invite-only registration
- [ ] Onboarding wizard (list selection + recipe import)
- [x] Home screen: 2-column list tile grid, "Ny liste" tile
- [x] Ny liste: template tiles + custom creation (icon picker, color swatches)
- [x] Units: stk/g/kg/ml/dl/L/ss/ts/pakke/boks/flaske/pose — on list items, hjemmelager, recipes
- [x] Liste screen: active items, check off (optimistic), greyed-out section, separator
- [x] Legg til: search, scored suggestions with badges, create new item
- [x] ⋯ Item modal: edit name, comment, qty, star, stats, delete
- [x] Purchase history written on check-off (DB trigger via RPC)
- [x] Dark/light mode + system default (localStorage, pre-render class, settings toggle)
- [x] GitHub Actions → GitHub Pages deploy (workflow written, needs repo + secrets)
- [x] PWA icons (icon-192.png + icon-512.png missing)
- [ ] Make the add items taller - should be 80-90 vh
- [ ] Do not blur background, make it 50% darker instead.
- [ ] When i click + or add, activate the search field so keyboard pops up. Less clicks.
- [ ] The suggestions list should be "infinite", that is most predicted for adding now on top and the rest just below in order of last used. Last bought on top.
- [ ] Make sure top bar on iphone gets colored same as list color <meta name="apple-mobile-web-app-capable" content="yes"> https://gist.github.com/akshaykumar6/7a56c5ad8379b4cce945d218d6a67ef3


### Phase 2 — Smart
- [ ] Smart suggestion scoring (time, star, day-of-week) — scoring fn done client-side, needs real aggregate query
- [ ] "Often bought together" learned from history
- [ ] Admin association rules (Innstillinger → Assosiasjoner)
- [ ] Recipe completion detection + ℹ️ nudge
- [x] Oppskrifter tab: list view with item count
- [ ] Recipe detail page: ingredients, preview have/need, add all to list
- [ ] Move scoring to Supabase Edge Function
- [ ] AI: subcategory grouping headers in list view
- [ ] AI: lag oppskrift fra URL eller tekst (Sonnet)
- [ ] AI: duplikat-deteksjon ved varetillegg (Haiku)

### Phase 3 — Polish & Power
- [ ] Subcategories within Dagligvarer — UI toggle
- [ ] Household sharing (see full spec below)
- [x] Hjemmelager — MVP: add/remove/quantity, expiry tracking, grouped by urgency
- [ ] Hjemmelager — "Hva kan jeg lage?" (AI, Sonnet)
- [ ] AI: handleliste-innsikt og anbefalinger (Haiku)
- [ ] Configurable recipe completion threshold
- [ ] Step-by-step cooking instructions in recipes
- [ ] List sharing: invite link, join flow, colored dots per member
- [ ] Cloudflare / Turnstile bot protection on auth
- [ ] Budget tracking per shop
- [ ] Item image (camera or URL)
- [ ] Barcode scan to add items

---

## Household Sharing — Full Spec

> Designed into the DB schema from Phase 1. UI built in Phase 3.

### Concept: Husstand
A **husstand** (household) is a group of users sharing the same lists. One person creates it and invites others via email or invite link.

### Who added what — Fargekodet eier
Each item on a list has a small **colored dot** showing who added it:
- Your own items: **no dot** (or your color, subtle)
- Others: their assigned color dot (left side of row, small)
- Colors assigned per member in settings: 🟢 🔵 🟡 🟣 🔴 🟠

Example row: `🔵 Melk ×2 [⋯]` — added by the person with blue

### Data model additions
```sql
households
  id uuid PK
  name text                        -- "Familie Soteland"
  created_by uuid FK auth.users
  created_at timestamptz

household_members
  id uuid PK
  household_id uuid FK households
  user_id uuid FK auth.users
  display_name text                -- "Pappa", "Mamma", "Sofie"
  color text                       -- hex or named: "#22c55e"
  role text                        -- 'owner' | 'member'
  joined_at timestamptz

-- list_items gets one new column:
-- added_by uuid FK auth.users
```

### Innstillinger → Husstand page
- See all members + their color dots
- Rename members ("Bruker 1" → "Sofie")
- Change anyone's color (owner only)
- Invite new member: send email invite or copy link
- Remove member (owner only)
- Leave husstand (members)

### Permissions
| Action | Owner | Member |
|--------|-------|--------|
| Add items | ✅ | ✅ |
| Check off items | ✅ | ✅ |
| Edit own items (⋯) | ✅ | ✅ |
| Edit others' items | ✅ | ❌ |
| Delete others' items | ✅ | ❌ |
| Manage members | ✅ | ❌ |
| Edit recipes | ✅ | ✅ |
| Edit item catalog | ✅ | ✅ |

### Realtime
Supabase Realtime subscriptions on `list_items` — changes by any member appear instantly on all devices. Small animated pulse when an item is added by someone else.

### "Kids spam the list" mitigation
- Owner can see who added what via color dot
- Owner can remove any item regardless of who added it
- Future: optional "godkjenning" mode where kids' additions need owner approval (backlog)

### Architecture note
`list_items.added_by` column added to schema in **Phase 1** even though the UI isn't built until Phase 3. Zero migration cost later, and history accumulates from day one.

---

## Recipe Sharing — Magic Links

- Recipes are **personal by default**
- Owner can:
  - **Del med husstand** — pushes a copy to all household members instantly
  - **Generer delingslenke** — anyone with the link can import a read-only copy
- Imported recipes are a **copy** — recipient owns their version, edits don't sync back
- Only the original creator can edit their recipe
- Magic link format: `/oppskrifter/del/{token}` → shows preview → "Importer til mine oppskrifter"
- Share tokens stored in DB with optional expiry

```sql
recipe_share_tokens
  id uuid PK
  recipe_id uuid FK recipes
  token text UNIQUE
  created_by uuid FK auth.users
  expires_at timestamptz           -- null = never expires
  created_at timestamptz
```

---

## Ownership & Sharing Model

**Core rule: items belong to lists. Lists belong to owners.**

There is no global item catalog. An item only exists within a specific list. Privacy is enforced at the list level, not the item level.

### List ownership
- Every list has one **owner** (creator)
- Owner is the only person who can share or unshare a list
- Members can add, edit, check off, and delete items — **trust is assumed within a shared list**
- Members cannot invite further members (no resharing)

### Sharing a list
1. Owner taps "Del liste" → sees warning: *"Du deler [X varer] og all kjøpshistorikk. Mottaker vil se alt som noensinne er kjøpt på denne listen."*
2. Owner must tick a checkbox to acknowledge
3. App generates a one-time invite link (expires in 7 days)
4. Recipient clicks link → joins as member
5. `lists.history_shared_at` is set — permanent record of when exposure began

### Autocomplete scoping
Autocomplete is scoped to **list type**, not list. When adding to a Dagligvarer list:
- Searches `list_items.name_normalized` across ALL lists of type Dagligvarer you have access to
- Aggregates stats by name: `MAX(last_purchased_at)`, `SUM(purchase_count)`
- "Hammer" from a Verktøy list **never** appears in Dagligvarer autocomplete
- Items from a private Christmas list only appear in autocomplete for lists of the same type that you own or are a member of

### What "trust assumed" means in practice
Within a shared list:
- Stars (⭐) are shared — if you star Melk, your partner sees it starred
- Comments are shared — your "kjøp glutenfri" note is visible to all list members
- Colored dots show who added each item, but everyone can still edit/delete

### Privacy guarantees
- Items on lists you don't have access to are completely invisible
- Your private Christmas list items never leak into anyone else's autocomplete
- Hjemmelager is personal — never shared, not visible to list members
- Purchase scoring for suggestions uses purchase history from lists you have access to, aggregated by name — not across users you've never shared with

---

## AI Integration

**Yes — Supabase Edge Functions can call any external API.** The API key lives in Supabase secrets (never in frontend code). Rate limiting per user prevents cost runaway.

### Recommended: Claude API (Anthropic)
- Best Norwegian language understanding
- Best reasoning for ambiguous item names
- `claude-haiku-4-5` for fast/cheap operations, `claude-sonnet-4-6` for complex tasks
- Called from Supabase Edge Function → no API key exposed to client

### What AI can do in SoToDo

| Feature | Model | When |
|---------|-------|------|
| **Auto-kategorisering** — new item "Rawlplugg" → AI assigns 🔧 Verktøy | Haiku | Phase 2 |
| **Naturlig språk-tillegg** — "jeg trenger ting til lasagne" → AI suggests/adds ingredients | Sonnet | Phase 2 |
| **Oppskrift fra URL/tekst** — paste a recipe URL, AI extracts ingredients → creates recipe | Sonnet | Phase 2 |
| **Handleinnsikt** — "du kjøper ost veldig ofte, vurder større pakke" | Haiku | Phase 3 |
| **Middagsforslag** — "foreslå en enkel middag basert på det jeg kjøper" | Sonnet | Phase 3 |
| **Varenavn-normalisering** — "egg" / "Egg L" / "egg (free range)" → suggest canonical name | Haiku | Phase 2 |

### Architecture
```
Client → TanStack Query → Supabase Edge Function → Claude API
                              ↓
                    Writes result to DB
                    Returns structured JSON to client
```

Edge Function keeps all AI logic server-side. Client just sends a prompt and gets back items/categories/recipes. Streaming supported for chat-like UX.

### Phase 2 AI: start here
1. Auto-kategorisering on new item add (silent, instant, correctable)
2. Oppskrift fra tekst/URL (paste box on recipe create screen)

### Cost estimate
- Haiku: ~$0.001 per categorization call — essentially free
- Sonnet: ~$0.01–0.05 per recipe extraction — acceptable
- Rate limit: 50 AI calls/user/day for MVP

---

## Hjemmelager — Fridge & Pantry Tracker

> "Ting jeg allerede har hjemme" — prevents buying what you don't need. Phase 3.

### Concept
A virtual fridge/pantry per household. Items here show as **"har allerede"** in suggestions and recipe views.

### How items get in/out

| Method | How |
|--------|-----|
| **Manuelt** | Tap + i Hjemmelager, search catalog, add quantity + optional expiry |
| **Auto-inn fra handel** | Check off grocery item → optional prompt: "Legg i hjemmelager?" (toggle in settings, default on for food) |
| **Auto-tøm** | Each item has an estimated duration (Melk = 7 days, Pasta = 180 days). Auto-expires silently. |
| **Manuelt tøm** | Swipe to remove, or "Tøm alt" |

### Duration defaults (AI-assisted, Haiku)
When item added to Hjemmelager, AI suggests default duration based on name. User can override.
Examples: Melk → 7d, Brød → 5d, Egg → 28d, Pasta → 180d, Ketchup → 365d

### Impact on the rest of the app

**Add suggestions:** Items in Hjemmelager get `🏠 Har hjemme` badge, pushed to bottom of suggestions.

**Recipe completion nudge:**
"Tacokveld: 3/6 på listen + 2/6 hjemme — du mangler bare Rømme"

**"Hva kan jeg lage?" (Phase 3 AI):**
Shows recipes completable with current Hjemmelager contents, ranked by % match.

### Data model
```sql
hjemmelager_items
  id uuid PK
  household_id uuid FK households
  item_id uuid FK items
  quantity int default 1
  added_at timestamptz
  added_by uuid FK auth.users
  expires_at timestamptz           -- null = no expiry
  duration_days int                -- user's default for this item
```

### UI
- Accessible as a tile on home screen (user chooses) or bottom nav
- List: item name, qty, days until expiry (🟢 → 🟡 → 🔴)
- Banner: "🟡 3 varer utløper snart"
- Quick-add from catalog, same search UX as shopping list

---

## AI Integration

> **Important:** Claude Pro (claude.ai subscription) ≠ Claude API. They are separate products with separate billing. Claude Pro does NOT give free API access.

### Pricing Reality

| Service | Free tier | Paid |
|---------|-----------|------|
| **Supabase** | 500MB DB, 50K MAU, 500K Edge Function calls/month — sufficient for a family app indefinitely | $25/month Pro if needed |
| **Claude API (Haiku)** | No free tier | ~$0.001 per call. 1000 categorizations ≈ $1 |
| **Claude API (Sonnet)** | No free tier | ~$0.02–0.05 per recipe extraction |

**Realistic monthly AI cost for a family with rate limiting: $1–3/month.**

### Invite-Only Access + Cost Controls

```sql
-- Registration locked to invite codes only
invite_codes
  id uuid PK
  code text UNIQUE
  created_by uuid FK auth.users    -- only you can generate
  used_by uuid FK auth.users
  used_at timestamptz
  max_uses int default 1
  expires_at timestamptz

-- Every AI call logged
ai_usage_log
  id uuid PK
  user_id uuid FK auth.users
  function_name text               -- 'categorize' | 'recipe_from_url' | 'what_to_cook'
  tokens_used int
  called_at timestamptz
```

**Guards in every Edge Function:**
1. Valid session required
2. Check invite_codes — unregistered = 403
3. Check daily call count < limit (default 20/user/day)
4. Cache identical inputs for 24h — no repeat calls
5. Admin view in Innstillinger shows token usage per user per month

**Registration:** Sign-up requires a valid invite code. You generate codes in Innstillinger → Admin. No code = no account.

### AI Item Enrichment — Phase 1 (foundational)

Every new item gets a single **Haiku call** on creation. Returns three values, applied silently. User can override any of them in the ⋯ modal.

**Prompt (simplified):**
> "Gitt varenavn '{name}' i kontekst '{list_type}', returner JSON:
> subcategory (én av: meieri, kjøtt_fisk, frukt_grønt, brød_bakst, tørrmat, frysevarer, drikke, krydder_oljer, rengjøring, annet),
> avg_frequency_days (int, typisk antall dager mellom kjøp, null hvis engangsvare),
> hjemmelager_duration_days (int, typisk antall dager varen holder hjemme)"

**Example responses:**
| Item | subcategory | avg_frequency_days | hjemmelager_duration_days |
|------|-------------|-------------------|--------------------------|
| Melk | meieri | 7 | 7 |
| Kyllingfilet | kjøtt_fisk | 10 | 3 |
| Spagetti | tørrmat | 45 | 180 |
| Kaffe | tørrmat | 21 | 60 |
| Ketchup | krydder_oljer | 90 | 365 |
| Hammer | annet | null | null |
| Skrue M6 | annet | null | null |

**Caching:** same `name_normalized + list_type` = cached result, no repeat API calls. Cached in a `ai_item_enrichment_cache` table.

**Cost:** ~$0.001 per unique item name. A catalog of 200 unique items = $0.20 total, ever.

**Why Phase 1 and not Phase 2:**
Subcategory data needs to accumulate from day one. Moving it to Phase 2 means all early items have null subcategory and the Phase 2 grouping feature launches with broken data. Seed it now, use it later.

```sql
ai_item_enrichment_cache
  id uuid PK
  name_normalized text
  list_type_name text              -- 'dagligvarer', 'verktøy' etc.
  subcategory text
  avg_frequency_days int
  hjemmelager_duration_days int
  created_at timestamptz
  UNIQUE (name_normalized, list_type_name)
```

### All AI Features in Scope

| Feature | Model | Phase | Trigger |
|---------|-------|-------|---------|
| **Vareberiking** (subcategory + frequency + duration) | Haiku | **1** | Silent, on every new unique item |
| Lag oppskrift fra URL/tekst | Sonnet | 2 | Manual — paste box on recipe screen |
| Duplikat-deteksjon | Haiku | 2 | On item name entry, silent suggestion |
| Subcategory grouping headers i liste | — | 2 | Data already in DB, just flip UI |
| Hjemmelager varighet-forslag | — | 3 | From cache, not a new AI call |
| "Hva kan jeg lage?" | Sonnet | 3 | Manual — button i Oppskrifter |
| Handleliste-innsikt | Haiku | 3 | Manual trigger, weekly summary |

### What stays out of scope (cost safety)
- No free-text AI chat / open-ended assistant
- No AI on every keystroke
- No background AI jobs
- No image/photo recognition

---

## Backlog / Future Ideas
- Cooking instructions / step-by-step recipe view
- Kids "godkjenning" mode (owner must approve additions)
- Store-specific price tracking
- Seasonal suggestions
- Configurable recipe match threshold per recipe
- Budget per shopping trip
- Barcode scan
- Item image
- Subcategory headers in list
- Store layout optimization (smart sort by aisle)
- Export shopping list as PDF / share link
