import psycopg2
import sys

# Try plain 'postgres' username
try:
    conn = psycopg2.connect("postgresql://postgres:Peh9zjNkEDlTY7w3@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require")
    print("Connected successfully with 'postgres' on 6543!")
    conn.close()
except Exception as e:
    print(f"Failed with 'postgres': {e}")
