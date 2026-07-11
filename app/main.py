from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, SessionLocal, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOAR Incident Containment Engine")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/alerts", response_model=schemas.AlertResponse, status_code=201)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    db_alert = models.Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert
