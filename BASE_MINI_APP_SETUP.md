# TRUSTGATE Base Mini App Setup Guide

## Current Status

✅ **Manifest file created**: `public/.well-known/farcaster.json`
✅ **Meta tags added**: `index.html` includes Base Mini App and Farcaster Frame tags
⚠️ **Assets pending**: Need to create icon, splash, hero, og, and screenshot images
⚠️ **Account association pending**: Need to generate via Base Build tool

## Step-by-Step Setup

### 1. Create Required Assets

See `public/ASSETS_NEEDED.md` for detailed specs.

**Quick summary:**
- `icon.png` - 1024×1024px logo
- `splash.png` - 200×200px loading screen
- `hero.png` - 1200×630px promotional image
- `og.png` - 1200×630px social sharing image
- `screenshots/1.png`, `2.png`, `3.png` - 1284×2778px app screenshots

**Tool**: Use [miniappassets.com](https://www.miniappassets.com/) to generate properly formatted assets.

**Design**: Follow TRUSTGATE's austere aesthetic:
- Black background (#050505)
- White text (#fafafa)
- Green accent for TRUSTED (#4ade80)
- Bebas Neue for headlines
- IBM Plex Mono for data

### 2. Place Assets in `/public/`

```bash
cd packages/web/public
mkdir -p screenshots

# Add your generated images:
# icon.png
# splash.png
# hero.png
# og.png
# screenshots/1.png
# screenshots/2.png
# screenshots/3.png
```

### 3. Deploy to Vercel (First Time)

```bash
cd packages/web
vercel

# Follow prompts, note your deployment URL
# Example: trustgate.vercel.app
```

### 4. Update Manifest URLs

Edit `public/.well-known/farcaster.json` and replace all `trustgate.vercel.app` with your actual Vercel URL:

```json
{
  "miniapp": {
    "homeUrl": "https://YOUR-DOMAIN.vercel.app",
    "iconUrl": "https://YOUR-DOMAIN.vercel.app/icon.png",
    ...
  }
}
```

### 5. Generate Account Association

1. Navigate to [Base Build Account Association Tool](https://www.base.dev/preview?tab=account)
2. Paste your Vercel URL (without https://): `your-domain.vercel.app`
3. Click **Submit**
4. Click **Verify** button
5. Sign with your wallet (this generates the association proof)
6. Copy the generated `accountAssociation` fields:
   - `header`
   - `payload`
   - `signature`

### 6. Update Manifest with Account Association

Edit `public/.well-known/farcaster.json`:

```json
{
  "accountAssociation": {
    "header": "PASTE_GENERATED_HEADER_HERE",
    "payload": "PASTE_GENERATED_PAYLOAD_HERE",
    "signature": "PASTE_GENERATED_SIGNATURE_HERE"
  },
  "miniapp": {
    ...
  }
}
```

### 7. Redeploy to Vercel

```bash
vercel --prod
```

### 8. Verify Deployment

**Check manifest is accessible:**
```bash
curl https://your-domain.vercel.app/.well-known/farcaster.json
```

Should return valid JSON with your `accountAssociation` filled in.

**Check all images load:**
- `https://your-domain.vercel.app/icon.png`
- `https://your-domain.vercel.app/splash.png`
- `https://your-domain.vercel.app/hero.png`
- `https://your-domain.vercel.app/og.png`
- `https://your-domain.vercel.app/screenshots/1.png`
- `https://your-domain.vercel.app/screenshots/2.png`
- `https://your-domain.vercel.app/screenshots/3.png`

**Validate manifest:**
Return to [Base Build tool](https://www.base.dev/preview?tab=account) and verify your manifest validates successfully.

### 9. Test in Base App

1. Open Base App on mobile
2. Search for "TRUSTGATE"
3. Your Mini App should appear in results
4. Open it - should show splash screen, then load your app

### 10. Share and Embed

**Share on Farcaster:**
Post your URL in a cast - it will render as a rich embed with hero image and launch button.

**Share on Twitter:**
Tweet your URL - it will show og:image and og:description.

## Troubleshooting

### Mini App not appearing in Base App search

- Verify `noindex: false` in manifest
- Check manifest is accessible at `/.well-known/farcaster.json`
- Ensure `accountAssociation` is properly filled
- Wait 5-10 minutes for indexing after deployment

### Images not loading

- Check image URLs in manifest match actual file paths
- Verify files are in `/public/` directory
- Test URLs directly in browser
- Check Vercel deployment logs

### Account association fails

- Ensure you're using the wallet that will own the Mini App
- Verify domain in manifest matches deployment URL exactly
- Try generating association again if signature invalid

### Embed not showing on social media

- Check og:image is exactly 1200×630px
- Verify og:image URL is accessible
- Test URL in [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Clear Twitter/Farcaster cache (may take time)

## Maintenance

### Updating Mini App info

1. Edit `public/.well-known/farcaster.json`
2. Change name, description, tags, etc.
3. Redeploy: `vercel --prod`
4. Changes take effect after re-indexing (5-10 min)

**Note**: Changing `accountAssociation` requires re-generating via Base Build tool.

### Updating images

1. Replace image files in `/public/`
2. Keep same filenames or update URLs in manifest
3. Redeploy: `vercel --prod`
4. Clear browser cache to see changes

## Advanced: Custom Domain

If using a custom domain instead of `.vercel.app`:

1. Add domain in Vercel project settings
2. Update ALL URLs in `farcaster.json` to use custom domain
3. Re-generate `accountAssociation` with new domain
4. Redeploy

## Resources

- [Base Mini Apps Documentation](https://docs.base.org/llms.txt)
- [Mini App Assets Generator](https://www.miniappassets.com/)
- [Base Build Account Tool](https://www.base.dev/preview?tab=account)
- [Farcaster Frame Spec](https://docs.farcaster.xyz/reference/frames/spec)
- [TRUSTGATE Design Specs](./public/ASSETS_NEEDED.md)

## Next Steps After Mini App Setup

Once TRUSTGATE is live as a Base Mini App:

1. **Share widely**: Post on Farcaster, Twitter, Discord
2. **Monitor analytics**: Track installs and usage in Base App
3. **Complete XMTP integration**: Enable messaging with users
4. **Add webhook for notifications**: Notify users of certification status changes
5. **Expand web UI**: Complete additional pages (Leaderboard, Evaluations, etc.)

The Mini App setup makes TRUSTGATE **discoverable** in Base App, but the real value comes from the **onchain certifications** and **accuracy score flywheel**.
