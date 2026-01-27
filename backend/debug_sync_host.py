import psycopg2
import sys

try:
    # Try connecting with hostname
    # Try port 5432 (Session mode) first
    conn = psycopg2.connect("postgresql://postgres.ihlbvnhjuivemlzgslzw:Peh9zjNkEDlTY7w3@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require")
    print("Connected successfully using psycopg2 on port 5432!")
    conn.close()
except Exception as e:
    print(f"Failed on 5432: {e}")

try:
    # Try port 6543 (Transaction mode)
    conn = psycopg2.connect("postgresql://postgres.ihlbvnhjuivemlzgslzw:Peh9zjNkEDlTY7w3@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require")
    print("Connected successfully using psycopg2 on port 6543!")
    conn.close()
except Exception as e:
    print(f"Failed on 6543: {e}")
