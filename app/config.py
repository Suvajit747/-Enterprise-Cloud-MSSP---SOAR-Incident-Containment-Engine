import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./alerts.db")
API_TITLE = os.getenv("API_TITLE", "SOAR Incident Containment Engine")
API_VERSION = os.getenv("API_VERSION", "1.0.0")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY")
