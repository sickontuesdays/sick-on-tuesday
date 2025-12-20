# Deployment Instructions for GitHub + Vercel

## Overview
The Build Crafter system requires two separate repositories:
1. **Main Site Repository** (this repo) - Contains the dashboard and Build Crafter code
2. **Manifest Data Repository** - Contains the large manifest files (264MB total)

## Step 1: GitHub Setup

### 1A: Create Manifest Data Repository
1. Create a new GitHub repository named: `destiny-manifest-data`
2. Make it **public** (required for GitHub Pages raw file access)
3. Upload the manifest files from: `c:\Users\mrlit\Desktop\GCC\Resources and Tools\updated manifest\optimized_manifest\`

**Required files to upload:**
```
optimized_manifest/
├── weapons.json              (77 MB)
├── armor.json                (84 MB)
├── consumables.json          (16 MB)
├── cosmetics.json            (27 MB)
├── DestinyStatDefinition.json        (39 KB)
├── DestinyTraitDefinition.json       (155 KB)
├── DestinyDamageTypeDefinition.json  (4 KB)
├── DestinyClassDefinition.json       (1.3 KB)
├── DestinySandboxPerkDefinition.json (3.2 MB)
├── DestinyPlugSetDefinition.json     (12 MB)
└── DestinySocketTypeDefinition.json  (1.3 MB)
```

### 1B: Update Manifest URL
Edit: `sick-on-tuesday/js/api/manifest-loader.js` line 10:

**Replace:** `YOUR_USERNAME` with your actual GitHub username
```javascript
baseUrl = 'https://raw.githubusercontent.com/YOUR_USERNAME/destiny-manifest-data/main/';
```

### 1C: Push Main Site Repository
1. Initialize Git in `sick-on-tuesday/` directory (if not already)
2. Add all files: `git add .`
3. Commit: `git commit -m "Initial Build Crafter implementation"`
4. Create GitHub repository for main site
5. Push to GitHub

## Step 2: Vercel Deployment

### 2A: Connect Repository
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your main site repository (NOT the manifest data repo)
4. Leave all settings as default - Vercel will auto-detect it as a static site

### 2B: Configure Build Settings (if needed)
- **Framework Preset:** Other
- **Root Directory:** `./` (default)
- **Build Command:** None (static site)
- **Output Directory:** `./` (default)

### 2C: Deploy
1. Click "Deploy"
2. Vercel will automatically deploy your site
3. You'll get a URL like: `https://your-site-name.vercel.app`

## Step 3: Test Deployment

### 3A: Test Build Crafter
1. Visit your Vercel URL
2. Open browser developer tools (F12)
3. Go to the test page: `https://your-site-name.vercel.app/test-modules.html`
4. Check for:
   - ✅ "ES6 modules supported"
   - ✅ "Manifest data accessible"
   - ✅ "Build analyzer ready"

### 3B: Test Build Generation
1. Click "Test Build Generation" button
2. Should generate a sample build successfully
3. Try entering: "Hunter void build for raids" in main dashboard

## Step 4: Update Dashboard Integration

Once tested, replace the Build Spotlight card in `index.html`:

**Find this section around line 400-450:**
```html
<section class="card" data-id="Build" data-w="4" data-h="3">
  <div class="bar">
    <span>🎯 Build Spotlight</span>
  </div>
  <!-- Replace this content -->
</section>
```

**Replace with:**
```html
<section class="card" data-id="build-crafter" data-w="4" data-h="5">
  <div class="bar">
    <span>🎯 Build Crafter</span>
    <div class="controls">
      <button class="btn" onclick="buildCrafter?.showSettings?.()">⚙️</button>
      <button class="btn" onclick="buildCrafter?.refresh?.()">🔄</button>
    </div>
  </div>
  <div class="inner" id="build-crafter-content">
    <div class="loading-placeholder">
      <div>⏳ Loading Build Crafter...</div>
    </div>
  </div>
  <div class="resize"></div>
</section>
```

## Configuration Summary

**Files configured for deployment:**
- ✅ `manifest-loader.js` - Points to GitHub CDN
- ✅ `vercel.json` - Deployment configuration
- ✅ `.gitignore` - Excludes large files
- ✅ `main.js` - Auto-detects local vs production
- ✅ `test-modules.html` - Production-ready testing

**URLs you'll have:**
- **Main Site:** `https://your-site-name.vercel.app`
- **Manifest Data:** `https://raw.githubusercontent.com/YOUR_USERNAME/destiny-manifest-data/main/`

## Troubleshooting

**CORS Issues:**
- Ensure manifest repository is **public**
- GitHub raw files should work without CORS issues

**Large File Issues:**
- GitHub has 100MB file limit per file
- Split any files over 100MB if needed
- Use Git LFS if necessary

**Build Failures:**
- Check browser console for detailed error messages
- Verify manifest URLs are accessible
- Test with simple query first: "Hunter build"