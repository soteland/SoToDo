// Light mode colors — stored in DB
export const PALETTE_LIGHT = [
  '#6BBF8E', '#7EB8D4', '#3D3D3D', '#D97B7B',
  '#E8C86A', '#E8956A', '#9B8EC4', '#8FAAB8',
  '#C48E9B', '#7A9E8E',
]

// Dark mode colors — same order, ~20% darker
export const PALETTE_DARK = [
  '#569972', '#6593AA', '#313131', '#AE6262',
  '#BAA055', '#BA7755', '#7C729D', '#728893',
  '#9D727C', '#627E72',
]

/** Returns the display color for a stored hex, adjusted for current mode. */
export function getPaletteColor(hex: string, isDark: boolean): string {
  const idx = PALETTE_LIGHT.indexOf(hex)
  if (isDark && idx !== -1) return PALETTE_DARK[idx]
  return hex
}

// Keep PALETTE as the light set for places that just need the list
export const PALETTE = PALETTE_LIGHT

export const ALL_ICONS = [
  'alien-8bit', 'book', 'books', 'building', 'building-columns',
  'caduceus', 'calculator', 'calendar-check', 'camera-movie', 'capsule',
  'car', 'cars', 'car-wrench', 'cart-shopping', 'casette-tape',
  'chart-tree-map', 'cloud-sun', 'film', 'film-music', 'fork-knife',
  'garage', 'gears', 'gift', 'gifts', 'grid-round-t-plus',
  'hammer', 'hammer-brush', 'house-chimney', 'kitchen-set', 'list',
  'list-check', 'list-music', 'map-location', 'money-bill', 'mortar-pestle',
  'paw', 'pills', 'plane-departure', 'pot-food', 'refrigerator',
  'rocket-launch', 'screwdriver-wrench', 'sun', 'sun-bright', 'toolbox',
  'tree-christmas', 'utensils',
]
