import psycopg2
import sys

try:
    # Try connecting
    conn = psycopg2.connect("postgresql://postgres.ihlbvnhjuivemlzgslzw:Peh9zjNkEDlTY7w3@3.111.105.85:6543/postgres?sslmode=require")
    print("Connected successfully using psycopg2!")
    conn.close()
except Exception as e:
    print(f"Failed to connect: {e}")
    sys.exit(1)
