# TRUSTGATE Mini App Assets Required

To complete the Base Mini App setup, you need to generate these images:

## Required Assets

### 1. Icon (icon.png)
- **Size**: 1024×1024px
- **Format**: PNG
- **Background**: Opaque (no transparency)
- **Design**: TRUSTGATE logo or wordmark in Bebas Neue
- **Color scheme**: Black background (#050505) with green accent (#4ade80)

### 2. Splash Screen (splash.png)
- **Size**: 200×200px (recommended)
- **Format**: PNG
- **Design**: Loading icon or simplified logo
- **Background**: Matches `splashBackgroundColor` (#050505)

### 3. Hero Image (hero.png)
- **Size**: 1200×630px (1.91:1 aspect ratio)
- **Format**: PNG or JPG
- **Design**: Promotional image showing:
  - "TRUSTGATE" in large Bebas Neue type
  - "Onchain Certification Layer for AI Agents"
  - Key stat: "94.2% ACCURACY" in large type
  - Base mainnet logo

### 4. Open Graph Image (og.png)
- **Size**: 1200×630px (1.91:1 aspect ratio)
- **Format**: PNG or JPG
- **Design**: Same as hero image or variation
- **Purpose**: Social media sharing preview

### 5. Screenshots (screenshots/1.png, 2.png, 3.png)
- **Size**: 1284×2778px (portrait, iPhone 14 Pro dimensions)
- **Format**: PNG
- **Quantity**: 3 screenshots
- **Content**:
  1. Homepage with accuracy score as hero number
  2. AgentPage with TRUSTED verdict in green
  3. AccuracyPage showing audit trail

## Design Guidelines

### Color Palette
- **Void (background)**: #050505
- **Paper (text)**: #fafafa
- **Border**: #1f1f1f
- **TRUSTED**: #14532d (bg), #4ade80 (fg)
- **CONDITIONAL**: #78350f (bg), #fbbf24 (fg)
- **FLAGGED**: #7f1d1d (bg), #f87171 (fg)

### Typography
- **Headlines**: Bebas Neue
- **Data/Code**: IBM Plex Mono
- **Body**: DM Sans

### Aesthetic
- Austere, authoritative
- Financial audit report style
- No gradients, no decoration
- Only data and verdicts

## Generation Tools

Use [Mini App Assets Generator](https://www.miniappassets.com/) to generate properly formatted assets.

Or create manually in Figma/Photoshop following the specs above.

## Placement

All assets go in `/public/`:
```
public/
├── icon.png
├── splash.png
├── hero.png
├── og.png
└── screenshots/
    ├── 1.png
    ├── 2.png
    └── 3.png
```

## After Creating Assets

1. Upload to Vercel (they'll be in `/public/`)
2. Update `farcaster.json` URLs if domain changes
3. Generate `accountAssociation` via [Base Build tool](https://www.base.dev/preview?tab=account)
4. Copy generated fields to `farcaster.json`
5. Redeploy to Vercel
6. TRUSTGATE will appear in Base App discovery

## Verification

After deployment, verify:
- `https://trustgate.vercel.app/.well-known/farcaster.json` returns valid JSON
- All image URLs load correctly
- Manifest validates in Base Build tool
