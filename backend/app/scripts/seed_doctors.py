"""
Seed the doctors table with 8 realistic sample doctors and their availability.

Idempotent: skips if doctors already exist.
For existing doctors without availability, adds default Mon-Fri 9-5 schedule.

Usage:
    cd backend
    python -m app.scripts.seed_doctors
"""

import sys
import os

# Ensure backend/ is on the path when run as a module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlmodel import Session, select
from app.db.engine import engine
from app.models.doctor import Doctor, DoctorAvailability

DOCTORS = [
    {
        "name": "Dr. Ananya Sharma",
        "specialization": "General Physician",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience_years": 12,
        "bio": "Experienced general physician specializing in preventive care, chronic disease management, and holistic patient assessments.",
        "consultation_fee": 400,
        "is_available": True,
        "languages": "English, Hindi",
    },
    {
        "name": "Dr. Rajesh Menon",
        "specialization": "Cardiologist",
        "qualification": "MBBS, DM (Cardiology), FACC",
        "experience_years": 18,
        "bio": "Senior interventional cardiologist with expertise in echocardiography, cardiac catheterization, and heart failure management.",
        "consultation_fee": 800,
        "is_available": True,
        "languages": "English, Hindi, Malayalam",
    },
    {
        "name": "Dr. Priya Nair",
        "specialization": "Dermatologist",
        "qualification": "MBBS, MD (Dermatology)",
        "experience_years": 9,
        "bio": "Dermatologist focused on skin disorders, cosmetic dermatology, and AI-assisted skin lesion analysis for early detection.",
        "consultation_fee": 500,
        "is_available": True,
        "languages": "English, Malayalam",
    },
    {
        "name": "Dr. Vikram Patel",
        "specialization": "Pulmonologist",
        "qualification": "MBBS, MD (Pulmonary Medicine)",
        "experience_years": 15,
        "bio": "Pulmonary medicine specialist with deep experience in respiratory disorders, asthma management, and chest X-ray interpretation.",
        "consultation_fee": 600,
        "is_available": True,
        "languages": "English, Hindi, Gujarati",
    },
    {
        "name": "Dr. Meera Krishnan",
        "specialization": "Pediatrician",
        "qualification": "MBBS, DCH, MD (Pediatrics)",
        "experience_years": 11,
        "bio": "Caring pediatrician dedicated to child health, vaccinations, growth monitoring, and newborn care.",
        "consultation_fee": 450,
        "is_available": True,
        "languages": "English, Tamil",
    },
    {
        "name": "Dr. Suresh Iyer",
        "specialization": "Orthopedic Surgeon",
        "qualification": "MBBS, MS (Ortho), Fellowship in Sports Medicine",
        "experience_years": 20,
        "bio": "Orthopedic surgeon specializing in joint replacements, sports injuries, and fracture management with minimally invasive techniques.",
        "consultation_fee": 700,
        "is_available": True,
        "languages": "English, Hindi, Tamil",
    },
    {
        "name": "Dr. Kavitha Reddy",
        "specialization": "Neurologist",
        "qualification": "MBBS, DM (Neurology)",
        "experience_years": 14,
        "bio": "Neurologist skilled in diagnosing and treating epilepsy, migraines, stroke, and neurodegenerative disorders.",
        "consultation_fee": 750,
        "is_available": True,
        "languages": "English, Telugu",
    },
    {
        "name": "Dr. Arjun Das",
        "specialization": "Psychiatrist",
        "qualification": "MBBS, MD (Psychiatry)",
        "experience_years": 10,
        "bio": "Psychiatrist providing compassionate mental health care including therapy for anxiety, depression, and stress-related disorders.",
        "consultation_fee": 550,
        "is_available": True,
        "languages": "English, Hindi, Bengali",
    },
]

# Default availability: Mon-Fri, 9 AM to 5 PM, 30-min slots
DEFAULT_AVAILABILITY = [
    {"day_of_week": 0, "start_time": "09:00", "end_time": "13:00", "slot_duration_minutes": 30},  # Mon morning
    {"day_of_week": 0, "start_time": "14:00", "end_time": "17:00", "slot_duration_minutes": 30},  # Mon afternoon
    {"day_of_week": 1, "start_time": "09:00", "end_time": "13:00", "slot_duration_minutes": 30},
    {"day_of_week": 1, "start_time": "14:00", "end_time": "17:00", "slot_duration_minutes": 30},
    {"day_of_week": 2, "start_time": "09:00", "end_time": "13:00", "slot_duration_minutes": 30},
    {"day_of_week": 2, "start_time": "14:00", "end_time": "17:00", "slot_duration_minutes": 30},
    {"day_of_week": 3, "start_time": "09:00", "end_time": "13:00", "slot_duration_minutes": 30},
    {"day_of_week": 3, "start_time": "14:00", "end_time": "17:00", "slot_duration_minutes": 30},
    {"day_of_week": 4, "start_time": "09:00", "end_time": "13:00", "slot_duration_minutes": 30},
    {"day_of_week": 4, "start_time": "14:00", "end_time": "17:00", "slot_duration_minutes": 30},
]


def seed():
    with Session(engine) as session:
        existing = session.exec(select(Doctor)).first()
        if existing:
            # Check if availability exists
            avail_exists = session.exec(select(DoctorAvailability)).first()
            if avail_exists:
                print("✓ Doctors and availability already seeded — skipping.")
                return

            # Seed availability for existing doctors
            doctors = session.exec(select(Doctor)).all()
            count = 0
            for doctor in doctors:
                existing_avail = session.exec(
                    select(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor.id)
                ).first()
                if not existing_avail:
                    for slot_data in DEFAULT_AVAILABILITY:
                        slot = DoctorAvailability(doctor_id=doctor.id, **slot_data)
                        session.add(slot)
                    count += 1

            session.commit()
            print(f"✓ Seeded availability for {count} existing doctors.")
            return

        for data in DOCTORS:
            doctor = Doctor(**data)
            session.add(doctor)
            session.flush()  # Get doctor.id

            for slot_data in DEFAULT_AVAILABILITY:
                slot = DoctorAvailability(doctor_id=doctor.id, **slot_data)
                session.add(slot)

        session.commit()
        print(f"✓ Seeded {len(DOCTORS)} doctors with availability successfully.")


if __name__ == "__main__":
    seed()
