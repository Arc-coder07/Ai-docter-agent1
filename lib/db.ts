import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Construct DATABASE_URL from Supabase credentials if DATABASE_URL is not set
function initializeDatabaseUrl() {
  // If DATABASE_URL is already set, use it
  if (process.env.DATABASE_URL) {
    return;
  }

  // Otherwise, construct from Supabase credentials
  // Support both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD;
  const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF;

  if (supabaseUrl && supabaseDbPassword) {
    // Extract project ref from URL if not provided separately
    let projectRef = supabaseProjectRef;
    if (!projectRef && supabaseUrl) {
      // Extract from URL like https://xxxxx.supabase.co
      const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      if (match) {
        projectRef = match[1];
      }
    }

    if (projectRef) {
      // Construct connection string for Supabase
      // Using direct connection (port 5432) - for connection pooling, use port 6543 with pgbouncer
      // Format: postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres
      const connectionString = `postgresql://postgres:${encodeURIComponent(supabaseDbPassword)}@${projectRef}.supabase.co:5432/postgres`;
      
      // Set DATABASE_URL so Prisma can use it
      process.env.DATABASE_URL = connectionString;
      return;
    }
  }

  // If we get here and still no DATABASE_URL, it will be handled by Prisma's error
  console.warn(
    "DATABASE_URL not set. Please provide either DATABASE_URL or Supabase credentials (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL, SUPABASE_DB_PASSWORD)"
  );
}

// Initialize DATABASE_URL from Supabase credentials if needed
initializeDatabaseUrl();

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;