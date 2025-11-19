# Component Locations Guide

Visual reference for where each new component appears on the page.

## Page Structure (Top to Bottom)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (Sticky)                                        │
│  [☰ Menu]  [LOGO - Centered]  [👤 Login] [🛒 Cart]    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  🎄 CHRISTMAS PROMOTIONAL BANNER (Dismissible)         │
│  ❄️  FREE DELIVERY on orders above ₦5,000! ❄️         │
│  [Order Now!] [X]                                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  RESTAURANT INFO BANNER                                 │
│  📍 [Awka ▼] Location Selector                         │
│  ⭐⭐⭐⭐⭐ 4.8 (500+)                                  │
│  🟢 Open • 20 min • Awka • 📞 Call                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SEARCH BAR                                             │
│  [🔍 Search for your favorite dishes...]               │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CATEGORY TABS (Scrollable)                            │
│  [🔥 All Items] [Combo Deals] [Yum Meals] [Sides]      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  MENU ITEMS GRID                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ Item │  │ Item │  │ Item │  │ Item │              │
│  │ [Img]│  │ [Img]│  │ [Img]│  │ [Img]│              │
│  │ Name │  │ Name │  │ Name │  │ Name │              │
│  │From ₦│  │ ₦5000│  │From ₦│  │ ₦3000│              │
│  │[Add ]│  │[Add ]│  │[Add ]│  │[Add ]│              │
│  └──────┘  └──────┘  └──────┘  └──────┘              │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FOOTER                                                 │
│  Links • Contact • Social Media                         │
└─────────────────────────────────────────────────────────┘

FLOATING ELEMENTS (Fixed Position):
┌────────────────────────────┐         ┌────────────────────┐
│ 💬 WhatsApp Float          │         │ 🛒 Cart Badge      │
│ Bottom-Left                │         │ Bottom-Right       │
│ [💬 Chat with us]          │         │ [🛒 3 View Cart   │
│                            │         │     ₦12,500 →]    │
└────────────────────────────┘         └────────────────────┘

MOBILE ONLY (≤768px):
┌─────────────────────────────────────────────────────────┐
│  BOTTOM NAVIGATION (Fixed)                              │
│  [🏠 Home] [📋 Orders] [👤 Account] [← Back]           │
└─────────────────────────────────────────────────────────┘
```

## Component Z-Index Layering

```
Layer 10:  Location Dropdown (z-10)
Layer 40:  Floating Buttons (WhatsApp, Cart Badge) (z-40)
Layer 50:  Header, Bottom Nav (z-50)
Layer 60:  Modals/Sheets (z-60+)
```

## Mobile Spacing Adjustments

### Without Bottom Nav (Desktop):
- Content flows naturally to footer
- Floating buttons: `bottom-6` (24px from bottom)

### With Bottom Nav (Mobile):
- Page has `pb-20` (80px padding-bottom)
- Floating buttons: `bottom-20` (positioned above bottom nav)
- Bottom nav: `h-16` (64px height) fixed at bottom

## Responsive Breakpoints

```
Mobile:    < 640px  (sm)
Tablet:    640-768px
Desktop:   768px+   (md)
Large:     1024px+  (lg)
X-Large:   1280px+  (xl)
```

### Component Visibility:

| Component             | Mobile | Tablet | Desktop |
|-----------------------|--------|--------|---------|
| Bottom Nav            | ✅     | ✅     | ❌      |
| WhatsApp Float        | ✅     | ✅     | ✅      |
| Floating Cart Badge   | ✅     | ✅     | ✅      |
| Christmas Banner      | ✅     | ✅     | ✅      |
| Header Menu Dropdown  | ✅     | ✅     | ❌      |
| Header Login Text     | ❌     | ❌     | ✅      |
| Logo Text             | ❌     | ❌     | ✅      |

## Touch Target Sizes

All interactive elements meet accessibility guidelines:

- **Minimum**: 44px × 44px (iOS/Android standard)
- **Preferred**: 48px × 48px
- Applied to:
  - Bottom nav buttons: 64px height
  - Floating buttons: 48px+ diameter
  - Header icons: 44px tap area
  - Menu cards: Full card clickable
  - CTA buttons: 44px+ height

## Color Usage by Component

### Christmas Banner:
- Background: `#C41E3A` → `#D32F2F` (gradient)
- Border: `#FFD700` (gold, 4px bottom)
- Text: White
- CTA Button: White bg, red text

### WhatsApp Float:
- Background: `#25D366` (WhatsApp green)
- Icon: White
- Pulse ring: 20% opacity green

### Floating Cart Badge:
- Background: `#FF4433` (primary red)
- Text: White
- Badge: White bg, red text

### Bottom Nav:
- Background: White
- Inactive: Gray-600
- Active: `#FF4433`
- Active indicator: Red dot

### Header:
- Background: White (95% opacity, backdrop blur)
- Logo placeholder: `#FF4433`
- Icons: Default gray
- Active: `#FF4433`

## Animation Details

### Christmas Banner:
- Snowflakes: Falling animation (8-11s duration)
- Sparkles: Pulsing scale/opacity
- Entry: Fade + slide down (0.5s)
- Exit: Fade + slide up (0.5s)

### Floating Buttons:
- Entry: Scale up from 0 with spring physics
- WhatsApp icon: Rotation shake every 3s
- Cart shimmer: Horizontal sweep every 5s
- Hover: Scale 1.05
- Tap: Scale 0.95

### Bottom Nav:
- Entry: Slide up (0.3s)
- Active indicator: Smooth layout animation
- Tap: Scale 0.9 with spring

### Menu Cards:
- Entry: Staggered fade-up (0.1s delay per item)
- Hover: Lift up 8px with shadow increase
- Image: Scale 1.05 on hover
- Tap: Immediate sheet open

## Accessibility Features

1. **ARIA Labels**: All icon-only buttons have descriptive labels
2. **Keyboard Navigation**: Tab through all interactive elements
3. **Screen Reader**: Semantic HTML, proper heading hierarchy
4. **Color Contrast**: All text meets WCAG AA standards
5. **Focus Indicators**: Visible focus rings on all inputs
6. **Touch Targets**: Minimum 44px for all clickable areas
7. **Motion**: Respects `prefers-reduced-motion`

## Testing Scenarios

### User Flow: First-Time Visitor (Mobile)
1. Sees Christmas banner → Can dismiss or click "Order Now"
2. Sees location selector → Can change delivery location
3. Browses menu with bottom nav always accessible
4. Adds items → Floating cart badge appears
5. Needs help → WhatsApp button always available
6. Checks out → Bottom nav "Orders" button easy to reach

### User Flow: Returning Customer (Desktop)
1. Christmas banner shows (unless dismissed in session)
2. Full navigation in header (no bottom nav clutter)
3. Hover states on all cards
4. WhatsApp and cart floating buttons less intrusive
5. Larger screen real estate for menu grid

---

**Quick Reference**: 
- Header height: 56-64px (mobile-desktop)
- Christmas banner: ~120px (mobile), ~100px (desktop)
- Restaurant banner: ~80px
- Bottom nav: 64px (mobile only)
- Floating button size: ~48-56px
