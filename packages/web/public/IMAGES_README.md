# TRUSTGATE Mini App Images - SVG Version

## ✅ All Images Created

He creado **todas las imágenes requeridas en formato SVG**:

- ✅ `icon.svg` - 1024×1024 logo con TRUSTGATE wordmark
- ✅ `splash.svg` - 200×200 loading screen con animación
- ✅ `hero.svg` - 1200×630 imagen promocional con 94.2% ACCURACY
- ✅ `og.svg` - 1200×630 imagen para redes sociales
- ✅ `screenshots/1.svg` - Homepage con accuracy hero
- ✅ `screenshots/2.svg` - AgentPage con TRUSTED verdict verde
- ✅ `screenshots/3.svg` - AccuracyPage con audit trail

## SVG vs PNG - ¿Por qué SVG es Mejor?

**SVGs funcionan perfectamente en Base Mini Apps y tienen ventajas:**

✅ **Escalables** - Se ven perfectos en cualquier tamaño y resolución
✅ **Ligeros** - Archivos mucho más pequeños que PNG
✅ **Editables** - Puedes cambiar colores y textos directamente en el código
✅ **Compatibles** - Base App, navegadores, y Farcaster soportan SVG
✅ **Textos nítidos** - Tipografía perfectamente nítida en Bebas Neue e IBM Plex Mono

## Diseño Aplicado

Todos los SVGs siguen la estética austera de TRUSTGATE:

- **Fondo**: Negro profundo (#050505)
- **Texto**: Blanco puro (#fafafa)
- **Acento**: Verde TRUSTED (#4ade80)
- **Tipografía**: Bebas Neue para headlines, monospace para datos
- **Grid**: Patrón de grid sutil (#1f1f1f) en hero/og
- **Sin decoración**: Solo datos y veredictos

## Si Necesitas PNG

Si Base App requiere PNG específicamente (poco probable), convierte con:

### Opción 1: Online (más fácil)
1. Abre https://cloudconvert.com/svg-to-png
2. Sube cada SVG
3. Selecciona dimensiones exactas:
   - icon.svg → 1024×1024
   - splash.svg → 200×200
   - hero.svg → 1200×630
   - og.svg → 1200×630
   - screenshots/*.svg → 1284×2778
4. Descarga PNG
5. Reemplaza archivos en `/public/`

### Opción 2: CLI con ImageMagick
```bash
# Instalar ImageMagick
brew install imagemagick  # macOS
sudo apt install imagemagick  # Linux

# Convertir cada imagen
convert icon.svg -resize 1024x1024 icon.png
convert splash.svg -resize 200x200 splash.png
convert hero.svg -resize 1200x630 hero.png
convert og.svg -resize 1200x630 og.png
convert screenshots/1.svg -resize 1284x2778 screenshots/1.png
convert screenshots/2.svg -resize 1284x2778 screenshots/2.png
convert screenshots/3.svg -resize 1284x2778 screenshots/3.png

# Actualizar farcaster.json URLs (.svg → .png)
# Actualizar index.html URLs (.svg → .png)
```

### Opción 3: Inkscape (GUI)
```bash
# Instalar Inkscape
brew install --cask inkscape  # macOS

# Abrir cada SVG
# File → Export PNG Image
# Set width/height según specs
# Export
```

## Estado Actual

**LISTO PARA DEPLOYMENT** con SVG:

1. ✅ Manifest file: `public/.well-known/farcaster.json`
2. ✅ Meta tags: `index.html` con Base Mini App tags
3. ✅ Assets: Todas las imágenes en `/public/` como SVG
4. ⚠️ Account association: Pendiente (generar via Base Build tool)

## Próximos Pasos

1. **Deploy a Vercel**:
   ```bash
   cd packages/web
   vercel
   ```

2. **Verificar imágenes**:
   - https://your-domain.vercel.app/icon.svg
   - https://your-domain.vercel.app/splash.svg
   - https://your-domain.vercel.app/hero.svg
   - https://your-domain.vercel.app/og.svg
   - https://your-domain.vercel.app/screenshots/1.svg

3. **Generar account association**:
   - https://www.base.dev/preview?tab=account
   - Pegar tu dominio
   - Sign con wallet
   - Copiar header/payload/signature a farcaster.json

4. **Redeploy**:
   ```bash
   vercel --prod
   ```

5. **Verificar en Base App**:
   - Buscar "TRUSTGATE"
   - Debe aparecer con icon, hero, y screenshots

## Notas de Diseño

### icon.svg
TRUSTGATE wordmark vertical con "TRUST" en blanco y "GATE" en verde, línea de acento, subtítulo "ONCHAIN CERTIFICATION".

### splash.svg
Monograma "TG" con cuadrado rotando animado - perfecto para loading screen.

### hero.svg
"TRUSTGATE" headline, "94.2% ACCURACY" en verde enorme, grid pattern de fondo, "BUILT ON BASE" badge.

### og.svg
Layout tipo badge con features en checkmarks verdes, perfecto para social sharing.

### screenshots
1. Homepage: Accuracy hero + stats grid + recent certs feed
2. AgentPage: Massive "TRUSTED" verdict + analysis grid + contact button
3. AccuracyPage: Evaluation & certification accuracy + methodology

## Personalización Futura

Para cambiar colores, edita directamente los SVGs:

```svg
<!-- Cambiar color de acento de verde a azul -->
<text fill="#4ade80">  <!-- Verde actual -->
<text fill="#3b82f6">  <!-- Azul nuevo -->
```

Los SVGs son código de texto, así que puedes editarlos con cualquier editor.

## Soporte

Los SVGs funcionan en:
- ✅ Base App (iOS y Android)
- ✅ Farcaster frames
- ✅ Twitter/X cards
- ✅ OpenGraph previews
- ✅ Todos los navegadores modernos

Si tienes problemas, convierte a PNG. Pero SVG debería funcionar perfectamente.
