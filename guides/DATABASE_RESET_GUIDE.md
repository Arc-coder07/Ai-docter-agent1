# 🔄 Database Reset & Reinitialization Guide

## 📌 Overview

This guide explains how to completely reset your database and start fresh. This is useful when:
- Starting from scratch with your own data
- Testing fresh database states
- Removing orphaned tables from previous migrations
- Resetting for production deployment

---

## ⚠️ Important Files/Directories to Know

These are the database-related files in your project:

```
prisma/
├── schema.prisma          ← Database schema definition
└── migrations/            ← All migration files
    ├── migration_lock.toml
    └── 20250623110055_init/
        └── migration.sql   ← Current migration (creates 'hello' table)
```

---

## 🛑 Step 1: Backup Current Data (Optional but Recommended)

If you have any important data in the current database:

```bash
# Export PostgreSQL database
pg_dump doctor_ai > doctor_ai_backup.sql

# Or with all tables including schema
pg_dump -U postgres doctor_ai --verbose > doctor_ai_backup_full.sql
```

To restore later:
```bash
psql doctor_ai < doctor_ai_backup.sql
```

---

## 🗑️ Step 2: Delete Existing Database

### Option A: Complete Database Drop

```bash
# From terminal
dropdb doctor_ai

# Verify it's deleted
psql -l | grep doctor_ai
# (should show nothing)
```

### Option B: Drop using SQL

```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL terminal, run:
DROP DATABASE IF EXISTS doctor_ai;

# Exit
\q
```

### Option C: Docker (if using Docker)

```bash
# Stop and remove the container
docker stop postgres-doctor-ai
docker rm postgres-doctor-ai

# Remove the volume (this deletes all data)
docker volume rm postgres-data  # if you created a named volume
```

---

## 🧹 Step 3: Clean Up Migration Files

### Remove Old Migrations

```bash
# Delete the migrations folder
rm -rf prisma/migrations

# Recreate empty migrations directory
mkdir prisma/migrations
```

### Check Current Status

Your `prisma/` folder should now look like:
```
prisma/
├── schema.prisma
└── migrations/     ← Empty directory
```

---

## 🔧 Step 4: Update Database Schema (Optional)

Review and update [prisma/schema.prisma](prisma/schema.prisma) if needed:

### Current Schema Issues to Fix:

1. **Remove orphaned "hello" table** (if it was only for testing)
2. **Verify User and Session tables** match your needs

### Clean Schema Example:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id       Int       @id @default(autoincrement())
  email    String    @unique
  name     String
  credit   Int       @default(100)
  sessions Session[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Session {
  id            Int       @id @default(autoincrement())
  sessionId     String    @unique
  notes         String?
  selectedDoctor Json?
  conversation  Json?
  report        Json?
  createdBy     String
  createdOn     String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        Int
  createdAtTs   DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

---

## 🔨 Step 5: Create Fresh Database

### Option A: Using Prisma (Recommended)

```bash
# Create new database
createdb doctor_ai

# Run migration from scratch
npx prisma migrate dev --name init
```

This command will:
1. ✅ Create the database
2. ✅ Generate a new migration
3. ✅ Apply the migration
4. ✅ Generate Prisma Client

### Option B: Using SQL Directly

```bash
# Create database
psql -U postgres -c "CREATE DATABASE doctor_ai;"

# Apply migrations
npx prisma migrate deploy
```

### Option C: Reset Everything with Prisma Reset

```bash
# This will prompt you - type 'y' to confirm
npx prisma migrate reset

# It will:
# 1. Drop the database
# 2. Create a new one
# 3. Run migrations
# 4. Generate Prisma Client
```

---

## ✅ Step 6: Verify Database Setup

### Check Database Exists

```bash
psql -l | grep doctor_ai
```

Output should show:
```
 doctor_ai | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 |
```

### Generate Prisma Client

```bash
npx prisma generate
```

### View Database Schema in Prisma Studio

```bash
npx prisma studio
```

Visit http://localhost:5555 and verify tables:
- ✅ User table
- ✅ Session table
- ❌ hello table (should NOT be present if we cleaned migrations)

---

## 📊 Step 7: Seed Initial Data (Optional)

Create a seeding script to populate initial data:

### Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      credit: 1000,
    },
  })

  console.log('✅ Test user created:', user)

  // Create test session
  const session = await prisma.session.create({
    data: {
      sessionId: 'session_' + Date.now(),
      notes: 'Test session',
      createdBy: 'test@example.com',
      createdOn: new Date().toISOString(),
      userId: user.id,
    },
  })

  console.log('✅ Test session created:', session)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Update `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Run Seeding:

```bash
npm install -D ts-node
npx prisma db seed
```

---

## 🚨 Quick Reset Commands (Cheat Sheet)

### Complete Fresh Start

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Delete database
dropdb doctor_ai

# 3. Clean migrations
rm -rf prisma/migrations
mkdir prisma/migrations

# 4. Create fresh database and migrate
npx prisma migrate dev --name init

# 5. Start dev server
npm run dev
```

### Or One-Command Reset

```bash
# WARNING: This deletes ALL data
npx prisma migrate reset --force
```

---

## 🔗 Database Relations Update

If you want to add user-session relationships:

### Updated Schema:

```prisma
model User {
  id       Int       @id @default(autoincrement())
  email    String    @unique
  name     String
  credit   Int
  sessions Session[]  // Add this line
}

model Session {
  id            Int       @id @default(autoincrement())
  sessionId     String    @unique
  notes         String?
  selectedDoctor Json?
  conversation  Json?
  report        Json?
  createdBy     String
  createdOn     String
  userId        Int        // Add this
  user          User       @relation(fields: [userId], references: [id])  // Add this
}
```

### Migrate:

```bash
npx prisma migrate dev --name add_user_session_relation
```

---

## 📝 After Reset Checklist

- [ ] Delete old database
- [ ] Clean migrations folder
- [ ] Review/update schema.prisma
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Verify tables in Prisma Studio
- [ ] Update any hardcoded database references
- [ ] Seed initial data if needed
- [ ] Test API endpoints
- [ ] Verify user creation works
- [ ] Test session management

---

## 🔍 Troubleshooting Database Reset

### Error: "Database already exists"
```bash
# Force drop the database
dropdb -f doctor_ai

# Or manually in PostgreSQL
psql -U postgres -c "DROP DATABASE IF EXISTS doctor_ai;"
```

### Error: "Migrations folder doesn't exist"
```bash
# Recreate migrations folder
mkdir -p prisma/migrations
```

### Error: "Cannot find migration files"
```bash
# Regenerate Prisma from schema
npx prisma generate

# Then try migrate again
npx prisma migrate deploy
```

### Stale Prisma Client
```bash
# Clear cache and regenerate
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

### PostgreSQL Connection Error
```bash
# Make sure PostgreSQL is running
brew services start postgresql@15  # macOS

# Or check status
brew services list

# Or restart
brew services restart postgresql@15
```

---

## 🎯 Summary

**Files to Delete/Modify:**
- ✅ `prisma/migrations/` - Delete entire folder
- ✅ Old database - Drop using PostgreSQL
- ⚠️ `prisma/schema.prisma` - Review/update if needed

**Commands to Run:**
```bash
rm -rf prisma/migrations && mkdir prisma/migrations
dropdb doctor_ai
createdb doctor_ai
npx prisma migrate dev --name init
npx prisma studio
```

**Result:**
- Fresh PostgreSQL database
- Clean migration history
- Latest schema applied
- Ready for new development

---

