"""
Seed script to populate the doctors table with sample data.
Run: python -m app.scripts.seed_doctors
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlmodel import Session, select
from app.db.engine import engine
from app.models.doctor import Doctor


SAMPLE_DOCTORS = [
    {
        "name": "Dr. Sarah Mitchell",
        "specialization": "General Physician",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience_years": 12,
        "bio": "Dr. Mitchell is an experienced general physician with expertise in preventive medicine, chronic disease management, and overall wellness. She provides comprehensive care for patients of all ages.",
        "consultation_fee": 500.0,
        "is_available": True
    },
    {
        "name": "Dr. Rajesh Kumar",
        "specialization": "Pulmonologist",
        "qualification": "MBBS, MD (Pulmonary Medicine)",
        "experience_years": 15,
        "bio": "Dr. Kumar specializes in respiratory diseases including asthma, COPD, pneumonia, and lung infections. He has extensive experience in pulmonary diagnostics and treatment.",
        "consultation_fee": 800.0,
        "is_available": True
    },
    {
        "name": "Dr. Emily Chen",
        "specialization": "Cardiologist",
        "qualification": "MBBS, DM (Cardiology)",
        "experience_years": 18,
        "bio": "Dr. Chen is a leading cardiologist with expertise in interventional cardiology, heart failure management, and preventive cardiac care. She has published extensively in peer-reviewed journals.",
        "consultation_fee": 1000.0,
        "is_available": True
    },
    {
        "name": "Dr. Arun Sharma",
        "specialization": "Dermatologist",
        "qualification": "MBBS, MD (Dermatology)",
        "experience_years": 10,
        "bio": "Dr. Sharma specializes in skin disorders, cosmetic dermatology, and hair-related conditions. He uses advanced techniques for diagnosis and treatment of skin diseases.",
        "consultation_fee": 600.0,
        "is_available": True
    },
    {
        "name": "Dr. Lisa Patel",
        "specialization": "Pediatrician",
        "qualification": "MBBS, MD (Pediatrics)",
        "experience_years": 14,
        "bio": "Dr. Patel is dedicated to child healthcare, from newborn care to adolescent medicine. She has special interest in childhood vaccinations, nutrition, and developmental milestones.",
        "consultation_fee": 700.0,
        "is_available": True
    },
    {
        "name": "Dr. Michael Johnson",
        "specialization": "Orthopedic Surgeon",
        "qualification": "MBBS, MS (Orthopedics)",
        "experience_years": 20,
        "bio": "Dr. Johnson is a senior orthopedic surgeon specializing in joint replacement, sports injuries, and spinal disorders. He is skilled in both surgical and non-surgical treatment approaches.",
        "consultation_fee": 1200.0,
        "is_available": True
    },
    {
        "name": "Dr. Priya Nair",
        "specialization": "Neurologist",
        "qualification": "MBBS, DM (Neurology)",
        "experience_years": 16,
        "bio": "Dr. Nair specializes in treating neurological conditions including migraines, epilepsy, stroke, and neurodegenerative diseases. She uses the latest diagnostic tools for accurate assessment.",
        "consultation_fee": 900.0,
        "is_available": True
    },
    {
        "name": "Dr. David Wilson",
        "specialization": "Psychiatrist",
        "qualification": "MBBS, MD (Psychiatry)",
        "experience_years": 11,
        "bio": "Dr. Wilson provides compassionate mental health care for anxiety, depression, PTSD, and other psychiatric conditions. He believes in a holistic approach combining therapy with medication when needed.",
        "consultation_fee": 800.0,
        "is_available": True
    }
]


def seed_doctors():
    """Insert sample doctors into the database."""
    with Session(engine) as session:
        # Check if doctors already exist
        existing = session.exec(select(Doctor)).all()
        if existing:
            print(f"ℹ️  {len(existing)} doctors already exist. Skipping seed.")
            return

        for doc_data in SAMPLE_DOCTORS:
            doctor = Doctor(**doc_data)
            session.add(doctor)

        session.commit()
        print(f"✅ Seeded {len(SAMPLE_DOCTORS)} sample doctors successfully!")


if __name__ == "__main__":
    seed_doctors()
