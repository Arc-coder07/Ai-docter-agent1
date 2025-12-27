# ✅ SETUP CHECKLIST - Doctor AI Agent

Use this checklist to ensure you complete all setup steps correctly.

---

## 📋 Pre-Setup Checklist

### Before You Start
- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL installed OR Docker available
- [ ] Code editor (VS Code) ready
- [ ] Internet connection (for API keys)

### Knowledge
- [ ] Read QUICK_OVERVIEW.md
- [ ] Read PROJECT_ANALYSIS_REPORT.md
- [ ] Understand the tech stack

---

## 🔑 API Keys Checklist

### Get All 4 API Keys

#### 1. Clerk (Authentication)
- [ ] Visit https://clerk.com
- [ ] Sign up for free account
- [ ] Create new application
- [ ] Copy `Publishable Key`
- [ ] Copy `Secret Key`
- [ ] Note the keys in a safe place

#### 2. AssemblyAI (Speech-to-Text)
- [ ] Visit https://assemblyai.com
- [ ] Sign up for free account
- [ ] Go to Settings → API Tokens
- [ ] Copy your `API Token`
- [ ] Note the key

#### 3. OpenRouter (AI Model)
- [ ] Visit https://openrouter.ai
- [ ] Sign up for free account
- [ ] Go to Settings → API Keys
- [ ] Create new API key
- [ ] Verify you have credits/payment method
- [ ] Copy your API key

#### 4. Murf AI (Optional - Text-to-Speech)
- [ ] Visit https://murf.ai
- [ ] Sign up (optional if using browser TTS)
- [ ] Get API key (if you want it)
- [ ] Copy the key

---

## 💻 Installation Checklist

### Clone Repository
- [ ] Navigate to project directory
- [ ] Verify you're in `/Ai-docter-agent` folder
- [ ] Check `.git` folder exists (if using git)

### Install Dependencies
```bash
npm install
```
- [ ] Command completes without errors
- [ ] `node_modules` folder created
- [ ] `package-lock.json` updated

---

## 🔧 Database Setup Checklist

### Option A: PostgreSQL (Local Installation)

#### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```
- [ ] Homebrew installed
- [ ] PostgreSQL installed
- [ ] Service started successfully

#### Windows
- [ ] Downloaded PostgreSQL installer
- [ ] Ran installation wizard
- [ ] Selected database port (default: 5432)
- [ ] Remembered postgres user password
- [ ] Verified installation with pgAdmin

#### Linux
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```
- [ ] PostgreSQL installed
- [ ] Service started

#### Create Database
```bash
createdb doctor_ai
```
- [ ] Command executed successfully
- [ ] Database created

### Option B: Docker
```bash
docker run --name postgres-doctor-ai \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=doctor_ai \
  -p 5432:5432 \
  -d postgres:15-alpine
```
- [ ] Docker installed
- [ ] Container created
- [ ] Container running
- [ ] Port 5432 exposed

---

## 📝 Environment Setup Checklist

### Create `.env.local` File
```bash
# In project root directory
touch .env.local
```
- [ ] File created in root directory
- [ ] File name is exactly `.env.local`

### Fill in All Variables
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[your_key]
CLERK_SECRET_KEY=sk_test_[your_key]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# AssemblyAI
NEXT_PUBLIC_ASSEMBLYAI_API_KEY=[your_key]

# OpenRouter
OPEN_ROUTER_API_KEY=[your_key]

# Murf AI (Optional)
MURF_API_KEY=[your_key]

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/doctor_ai?schema=public

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Verify Variables
- [ ] All required keys filled in
- [ ] No typos in variable names
- [ ] Values correct (copy-pasted carefully)
- [ ] File has no quotes around values (unless needed)
- [ ] File saved successfully

---

## 🗄️ Prisma Setup Checklist

### Generate Prisma Client
```bash
npx prisma generate
```
- [ ] Command completes without errors
- [ ] `.prisma/` folder created or updated
- [ ] No build errors

### Run Migrations
```bash
npx prisma migrate dev --name init
```
- [ ] Command completes successfully
- [ ] Creates initial migration
- [ ] Tables created in database
- [ ] Prisma client generated

### Verify Database
```bash
npx prisma studio
```
- [ ] Opens at http://localhost:5555
- [ ] Shows User table
- [ ] Shows Session table
- [ ] Tables are empty (as expected)
- [ ] Close browser window

---

## 🚀 Launch Application Checklist

### Start Development Server
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] Shows "Ready in X.Xs"
- [ ] Running on http://localhost:3000
- [ ] Turbopack/webpack output looks good

### Test Home Page
- [ ] Navigate to http://localhost:3000
- [ ] Page loads completely
- [ ] No console errors
- [ ] Hero section visible
- [ ] Navigation works
- [ ] Sign in button present

### Test Authentication
- [ ] Click "Sign In"
- [ ] Redirected to Clerk login
- [ ] Click "Create Account"
- [ ] Sign up form appears
- [ ] Fill in details
- [ ] Submit form
- [ ] Redirected to dashboard

### Test Dashboard
- [ ] Dashboard loads successfully
- [ ] Welcome message shows
- [ ] Add New Session button visible
- [ ] History List component renders
- [ ] Doctor List component renders

### Test Database
```bash
npx prisma studio
```
- [ ] Prisma Studio opens
- [ ] User table shows your created user
- [ ] Email is correct
- [ ] Credit amount shows
- [ ] Close studio

---

## 🎤 Test Voice Feature (Optional)

### Start Call Setup
- [ ] Click "Start Call" on dashboard
- [ ] Microphone permission popup appears
- [ ] Click "Allow" for microphone
- [ ] AI introduction begins

### Voice Conversation
- [ ] Hear AI voice through speaker
- [ ] Microphone indicator shows green
- [ ] Click to speak
- [ ] Say something
- [ ] See text transcription
- [ ] AI responds
- [ ] Hear AI response

### If Voice Not Working
- [ ] Check speaker volume
- [ ] Check microphone permission in browser
- [ ] Verify AssemblyAI API key in .env
- [ ] Verify OpenRouter API key in .env
- [ ] Check browser console for errors
- [ ] Read SETUP_GUIDE.md Troubleshooting section

---

## 📊 Verification Checklist

### Code Quality
```bash
npm run lint
```
- [ ] Command runs without errors
- [ ] No critical errors shown
- [ ] May have warnings (acceptable)

### Build Test
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] `.next/` folder created
- [ ] No build errors

### Start Production Server
```bash
npm start
```
- [ ] Server starts on port 3000
- [ ] Visit http://localhost:3000
- [ ] Home page loads

---

## ✨ Advanced Verification (Optional)

### API Testing
- [ ] Test `/api/users` endpoint
- [ ] Test `/api/chat` endpoint
- [ ] Test `/api/transcribe` endpoint
- [ ] Check response times
- [ ] Verify error handling

### Database Testing
- [ ] Create multiple users
- [ ] Create multiple sessions
- [ ] Query database with Prisma Studio
- [ ] Verify data persistence
- [ ] Test relationships

### Performance
- [ ] Check page load time
- [ ] Check API response time
- [ ] Monitor console for errors
- [ ] Check Network tab in DevTools

---

## 🎉 Success Indicators

When everything is set up correctly, you should see:

✅ **Development Server Running**
```
   ▲ Next.js 15.3.4
   - Local:        http://localhost:3000
   ✓ Ready in 2.5s
```

✅ **Home Page Loads**
- All sections visible
- No layout broken
- Buttons clickable

✅ **Authentication Works**
- Sign up succeeds
- User created in database
- Redirect to dashboard works

✅ **Dashboard Shows**
- User profile section
- History list (empty initially)
- Doctor list
- Add New Session button

✅ **Database Connected**
- User data saved
- Prisma Studio shows data
- No connection errors

---

## 🚫 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Cannot find module" | Run `npm install` |
| Database connection error | Check DATABASE_URL in .env |
| Port 3000 in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| Clerk not loading | Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Microphone not working | Check browser microphone settings |
| API key errors | Regenerate .env.local, restart server |
| Prisma errors | Run `npx prisma generate` |

---

## 📱 Browser Compatibility

- [ ] Google Chrome (recommended)
- [ ] Microsoft Edge
- [ ] Firefox (voice features may be limited)
- [ ] Safari (voice features may be limited)

---

## 🔐 Security Checklist

- [ ] Never commit `.env.local` to git
- [ ] API keys are secret (don't share)
- [ ] Database password secure
- [ ] HTTPS will be used in production
- [ ] Environment variables will be set in production

---

## 📚 Documentation Review

After setup, read these:

- [ ] SETUP_GUIDE.md - Complete
- [ ] CUSTOMIZATION_GUIDE.md - For your changes
- [ ] DATABASE_RESET_GUIDE.md - For database help
- [ ] PROJECT_ANALYSIS_REPORT.md - For understanding code

---

## 🎯 Next Steps After Setup

1. [ ] Test all features
2. [ ] Customize branding (CUSTOMIZATION_GUIDE.md)
3. [ ] Add your changes
4. [ ] Deploy to production
5. [ ] Monitor performance

---

## ✅ Final Verification

- [ ] npm install - ✓
- [ ] .env.local - ✓
- [ ] Database created - ✓
- [ ] Migrations run - ✓
- [ ] npm run dev - ✓
- [ ] Home page loads - ✓
- [ ] Authentication works - ✓
- [ ] Dashboard accessible - ✓
- [ ] Database has data - ✓

---

## 🎬 You're Ready!

Once all checkboxes above are checked, your setup is complete!

```
✅ Setup Complete!
✅ Application Running!
✅ Database Connected!
✅ Ready to Customize!
✅ Ready to Deploy!
```

**Next:** Read CUSTOMIZATION_GUIDE.md to make it your own!

---

**Date Completed:** __________  
**Notes:** ________________________________________________________

---

