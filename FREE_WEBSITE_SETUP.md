# Free Website & Legal Pages Setup (5 Minutes)

## No Company? No Problem! 🚀

You can use **GitHub Pages** for free to host your privacy policy and terms. Apple accepts this!

---

## Step 1: Update Privacy Policy Prompt (Use These)

### For Company Name:
```
Company: SonicBoost (sole proprietorship)
or
Developer: [Your Name] (indie developer)
```

### For Email:
Use any email you already have:
- Personal Gmail: `yourname@gmail.com`
- Or create one: `contact@sonicboost.app` (using Gmail/Outlook)

### For Website:
Use GitHub Pages (you'll create this in 2 minutes):
```
https://[your-github-username].github.io/sonicboost-legal
```

Example: `https://kingnobze.github.io/sonicboost-legal`

---

## Step 2: Updated ChatGPT Prompt

**Copy this to ChatGPT for Privacy Policy:**

```
Create a comprehensive Privacy Policy for my mobile app:

App Name: SonicBoost ProLite
Developer: [Your Name] (independent developer)
Contact Email: [your-email@gmail.com]
Website: https://[your-github-username].github.io/sonicboost-legal
Last Updated: January 31, 2025

App Description:
SonicBoost ProLite is an AI-powered audio enhancement mobile application that allows users to upload, enhance, and download audio files. The app uses AI for genre detection and natural language audio control.

[Rest of the prompt from CHATGPT_PROMPTS.md - same as before]

Note: This is an independent developer app, not a company. Include appropriate language for solo developer privacy policies.
```

---

## Step 3: Create FREE Website (GitHub Pages)

### Option A: Simple (Recommended)

Run these commands in your terminal:

```bash
# Create a new directory for your legal pages
cd ~/Documents
mkdir sonicboost-legal
cd sonicboost-legal

# Create basic HTML pages (we'll add content from ChatGPT)
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SonicBoost ProLite - Legal</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #000;
            color: #fff;
        }
        h1 { color: #9333EA; }
        a { color: #A855F7; }
        .nav { margin: 20px 0; }
        .nav a { margin-right: 20px; }
    </style>
</head>
<body>
    <h1>🎵 SonicBoost ProLite</h1>
    <p>AI-Powered Audio Enhancement</p>
    <div class="nav">
        <a href="privacy.html">Privacy Policy</a>
        <a href="terms.html">Terms of Service</a>
    </div>
</body>
</html>
EOF

# Create placeholder privacy page
cat > privacy.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - SonicBoost ProLite</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #000;
            color: #fff;
            line-height: 1.6;
        }
        h1, h2 { color: #9333EA; }
        a { color: #A855F7; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p><em>Last Updated: January 31, 2025</em></p>
    
    <!-- PASTE YOUR PRIVACY POLICY FROM CHATGPT HERE -->
    <p>Coming soon...</p>
    
    <hr>
    <p><a href="index.html">← Back</a></p>
</body>
</html>
EOF

# Create placeholder terms page
cat > terms.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - SonicBoost ProLite</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #000;
            color: #fff;
            line-height: 1.6;
        }
        h1, h2 { color: #9333EA; }
        a { color: #A855F7; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p><em>Effective Date: January 31, 2025</em></p>
    
    <!-- PASTE YOUR TERMS FROM CHATGPT HERE -->
    <p>Coming soon...</p>
    
    <hr>
    <p><a href="index.html">← Back</a></p>
</body>
</html>
EOF

# Initialize git and push to GitHub
git init
git add .
git commit -m "Initial legal pages"

# Create GitHub repo (you'll need GitHub CLI or do this manually)
# If you have gh CLI:
gh repo create sonicboost-legal --public --source=. --push

# If not, go to github.com and create a new repo called "sonicboost-legal"
# Then:
# git remote add origin https://github.com/YOUR-USERNAME/sonicboost-legal.git
# git branch -M main
# git push -u origin main
```

### Then Enable GitHub Pages:
1. Go to your repo: `https://github.com/YOUR-USERNAME/sonicboost-legal`
2. Click "Settings"
3. Scroll to "Pages" (left sidebar)
4. Under "Source", select "main" branch
5. Click "Save"
6. Wait 2 minutes
7. Your site is live at: `https://YOUR-USERNAME.github.io/sonicboost-legal`

---

## Step 4: Fill in Privacy Policy

1. **Get policy from ChatGPT** using the updated prompt above
2. **Open** `privacy.html` in a text editor
3. **Replace** the "Coming soon..." section with ChatGPT's output
4. **Convert markdown to HTML** (or just paste as-is, it'll work)
5. **Commit and push**:
```bash
git add .
git commit -m "Add privacy policy"
git push
```

Wait 1 minute, then your policy is live!

---

## Step 5: Add URLs to Your App

Once live, add these to `SubscriptionsScreen.tsx`:

```tsx
// Add below the plans, before the info section
<View className="mx-6 mb-4">
  <Pressable
    onPress={() => Linking.openURL('https://YOUR-USERNAME.github.io/sonicboost-legal/privacy.html')}
    className="py-3"
  >
    <Text className="text-purple-400 text-sm text-center underline">
      Privacy Policy
    </Text>
  </Pressable>
  <Pressable
    onPress={() => Linking.openURL('https://YOUR-USERNAME.github.io/sonicboost-legal/terms.html')}
    className="py-3"
  >
    <Text className="text-purple-400 text-sm text-center underline">
      Terms of Service
    </Text>
  </Pressable>
</View>
```

---

## Alternative: Even Easier (Notion)

If GitHub seems complex:

1. Create free Notion account
2. Create two pages: "Privacy Policy" and "Terms of Service"
3. Paste ChatGPT output
4. Click "Share" → "Publish to web"
5. Get public URLs
6. Use those in your app

**Notion URLs look like:**
```
https://your-workspace.notion.site/Privacy-Policy-123abc
```

Apple accepts Notion-hosted legal pages! ✅

---

## What to Fill in Prompts

### For Privacy Policy:
```
Developer: [Your Full Name]
Company: Not applicable (independent developer)
Contact Email: [your-personal-email@gmail.com]
Website: https://[github-username].github.io/sonicboost-legal
```

### For Terms:
```
Company: [Your Name] (independent developer)
Contact: [your-email@gmail.com]
Governing Law: [Your State/Country]
```

---

## Pro Tips:

### Use Your Personal Info:
```
Developer: John Smith
Email: johnsmith@gmail.com
Location: California, USA
```

This is totally fine! Thousands of indie developers do this.

### Don't Have a Domain?
GitHub Pages URL is professional enough:
```
https://kingnobze.github.io/sonicboost-legal
```

Apple doesn't care if it's a custom domain.

### Legal Entity Not Required
You can:
- Operate as individual/sole proprietor
- Form LLC later if app succeeds
- No company registration needed to launch

---

## Cost Breakdown:

| Item | Cost |
|------|------|
| GitHub Pages | **FREE** |
| Privacy Policy | **FREE** (ChatGPT) |
| Terms of Service | **FREE** (ChatGPT) |
| Email | **FREE** (Gmail) |
| Domain (optional) | $12/year (later) |
| **Total** | **$0** |

---

## 🎯 Action Plan (10 Minutes):

1. ✅ **2 min**: Create GitHub repo "sonicboost-legal"
2. ✅ **2 min**: Copy template files from script above
3. ✅ **3 min**: Get Privacy Policy from ChatGPT
4. ✅ **2 min**: Paste into `privacy.html`, commit, push
5. ✅ **1 min**: Enable GitHub Pages
6. ✅ **Done!** You have a website + legal pages

---

## Example Final URLs:

Your website:
```
https://kingnobze.github.io/sonicboost-legal
```

Privacy:
```
https://kingnobze.github.io/sonicboost-legal/privacy.html
```

Terms:
```
https://kingnobze.github.io/sonicboost-legal/terms.html
```

**This is completely professional and Apple-approved!** ✅

Many successful apps use GitHub Pages for legal docs. You can upgrade to a custom domain later (like `sonicboost.app`) when you're making money.

For now, ship with GitHub Pages - it's free, fast, and professional enough! 🚀
