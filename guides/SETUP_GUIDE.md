# 🚀 Setup Guide - Running the Project

## Step 1: Clone/Prepare the Repository

If you haven't already cloned it:
```bash
git clone <repository-url>
cd Ai-docter-agent
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all packages from `package.json` (total ~40+ packages for frontend, backend, and dev tools).

---

## Step 3: Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# ==================== REQUIRED ====================

# 1. CLERK AUTHENTICATION
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# 2. ASSEMBLYAI (Speech-to-Text)
NEXT_PUBLIC_ASSEMBLYAI_API_KEY=your_assemblyai_key_here

# 3. OPENROUTER/OPENAI (AI Model)
OPEN_ROUTER_API_KEY=your_openrouter_key_here
# OR if using direct OpenAI:
# OPENAI_API_KEY=your_openai_key_here

# 4. MURF AI (Text-to-Speech) - OPTIONAL (has fallback to browser TTS)
MURF_API_KEY=your_murf_api_key_here

# 5. DATABASE
DATABASE_URL=postgresql://postgres:password@localhost:5432/doctor_ai?schema=public

# 6. APPLICATION URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting the API Keys

#### **Clerk Authentication**
1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Copy `Publishable Key` and `Secret Key`

#### **AssemblyAI**
1. Go to [assemblyai.com](https://assemblyai.com)
2. Create account and go to API tokens
3. Copy your API key

#### **OpenRouter**
1. Go to [openrouter.ai](https://openrouter.ai)
2. Create account
3. Generate API key
4. Ensure you have credits/subscription

#### **Murf AI (Optional)**
1. Go to [murf.ai](https://murf.ai)
2. Get API key (optional - app will fallback to browser TTS)

---

## Step 4: Set Up PostgreSQL Database

### Option A: Local Installation

#### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb doctor_ai

# Verify connection
psql -l
```

#### Windows (using installer)
1. Download from [postgresql.org](https://postgresql.org/download/windows)
2. Run installer and follow wizard
3. Remember the password you set for `postgres` user
4. Open pgAdmin or SQL Shell to create database:
   ```sql
   CREATE DATABASE doctor_ai;
   ```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

sudo systemctl start postgresql
sudo -u postgres createdb doctor_ai
```

### Option B: Docker (Recommended)

```bash
# Create a Docker container for PostgreSQL
docker run --name postgres-doctor-ai \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=doctor_ai \
  -p 5432:5432 \
  -d postgres:15-alpine

# Verify it's running
docker ps
```

---

## Step 5: Initialize Database with Prisma

### Fresh Start (First Time Setup)

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Open Prisma Studio to view database
npx prisma studio
```

The command will:
- Create the database schema
- Generate Prisma Client types
- Create initial tables (User, Session)

### Verify Setup

Open Prisma Studio:
```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- Create test records
- Monitor data changes

---

## Step 6: Update Configuration Files (Optional)

### Update `lib/config.tsx` with your details:
```tsx
export const siteConfig = {
  name: "Your App Name",
  description: "Your description",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  links: {
    email: "your-email@example.com",
    twitter: "your-twitter",
    github: "your-github",
    // ... other links
  },
}
```

### Update metadata in `app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  title: "Your App Title",
  description: "Your app description",
}
```

---

## Step 7: Run the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000`

Output should show:
```
   ▲ Next.js 15.3.4
   - Local:        http://localhost:3000
   - Environments: .env.local

✓ Ready in 2.5s
```

### Access Points:
- **Home Page:** http://localhost:3000
- **Sign In:** http://localhost:3000/sign-in
- **Dashboard:** http://localhost:3000/dashboard (requires login)
- **Medical Agent:** http://localhost:3000/dashboard/medical-agent
- **Prisma Studio:** http://localhost:5555

---

## Step 8: Test the Setup

1. **Sign Up**
   - Go to http://localhost:3000/sign-up
   - Create an account
   - You'll be redirected to dashboard

2. **Dashboard Check**
   - View your profile
   - History should be empty initially
   - Doctor list should load

3. **Medical Agent**
   - Click "New Session" or "Start Call"
   - Test microphone access
   - Start voice conversation

---

## 🔧 Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

---

## 📋 Production Checklist

- [ ] Update `.env` with production API keys
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Update Clerk redirect URLs to production domain
- [ ] Use PostgreSQL with proper backups (RDS, Railway, Supabase)
- [ ] Enable HTTPS
- [ ] Set up proper logging (Sentry, LogRocket)
- [ ] Configure CORS if needed
- [ ] Set up database pooling (PgBouncer for PostgreSQL)
- [ ] Add API rate limiting
- [ ] Monitor usage and costs (OpenRouter, AssemblyAI credits)

---

## ⚠️ Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Database Connection Error
```
Error: Can't reach database server at `localhost`:`5432`
```
**Solution:**
- Check PostgreSQL is running: `brew services list` (macOS)
- Verify DATABASE_URL is correct
- Check credentials are right

### Prisma Client Generation Error
```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma
npx prisma generate
```

### API Keys Not Working
- Verify .env.local file is in root directory
- Restart development server after changing env vars
- Check API key validity at respective platforms
- Ensure keys aren't expired

### Microphone Permission Denied
- Check browser settings for microphone permission
- Allow HTTPS (required for secure contexts)
- Test in incognito/private window

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [AssemblyAI Documentation](https://assemblyai.com/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)

---

