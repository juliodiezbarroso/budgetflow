# 💸 BudgetFlow

Personal finance tracker with Chase CSV import. Works as a PWA — installable on iPhone, iPad, and desktop.

---

## 🚀 Deploy to Vercel (5 minutes)

### 1. Push to GitHub
```bash
# In this folder:
git init
git add .
git commit -m "initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/budgetflow.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. Click **Deploy** — done ✅

Your app will be live at `https://budgetflow-xxxx.vercel.app`

---

## 📱 Install on iPhone / iPad

1. Open your Vercel URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

It will appear as a full-screen app icon — no browser bar, works offline.

---

## 💻 Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`

---

## 🏦 Importing Chase Transactions

1. Log into chase.com → your account
2. Click **Download transactions**
3. Select date range → format: **CSV** → Download
4. In the app, tap **🏦 Import CSV** and select the file
5. Review auto-categorized transactions, adjust if needed
6. Tap **Import**

---

## 🗂 Project Structure

```
budgetflow/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx       # React entry point
│   └── App.jsx        # Main app component
├── index.html         # HTML shell with PWA meta tags
├── vite.config.js     # Vite + PWA plugin config
└── package.json
```

---

## 🔄 Updating the App

Any time you push a new commit to GitHub, Vercel auto-redeploys in ~30 seconds. The PWA will update silently on next load.
