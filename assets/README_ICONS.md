# App Icon & Splash Screen Required

## What You Need

### 1. App Icon (icon.png)
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Design**: Your SonicBoost logo/branding
- **Colors**: Purple (#9333EA) based on your app theme

**Quick Create Options:**
- Use Canva (free): canva.com
- Use Figma (free): figma.com  
- Hire on Fiverr: ~$5-20
- AI Generate: Midjourney, DALL-E

**Design Tips:**
- Simple, recognizable at small sizes
- No text (works poorly at small sizes)
- Audio/sound wave theme
- Purple gradient matches your brand

### 2. Splash Screen (splash.png)
- **Size**: 1242x2688 pixels (iPhone 14 Pro Max)
- **Format**: PNG
- **Design**: Simple branded screen shown while app loads
- **Background**: Black (#000000) to match your app

**Content Suggestions:**
- SonicBoost logo centered
- Purple audio waveform
- "SonicBoost ProLite" text
- Keep it minimal

## How to Add

1. Create both images
2. Save as `icon.png` and `splash.png` in this `assets/` folder
3. Run: `npx expo prebuild --clean`
4. Your app will now have proper icons

## Temporary Solution

For testing, you can use placeholder icons:
- Download any 1024x1024 PNG online
- Rename to icon.png and splash.png
- Place in assets/ folder
- This lets you test, but replace before launch!

## Tools

**Free Icon Generators:**
- https://www.appicon.co - Generate all sizes
- https://icon.kitchen - Simple icon creator

**Free Design Tools:**
- Canva: canva.com
- Figma: figma.com
- Photopea: photopea.com (free Photoshop)

## Once Created

Your app.json already references these files:
```json
"icon": "./assets/icon.png",
"splash": {
  "image": "./assets/splash.png"
}
```

Just drop the files in this folder and you're done! ✅
