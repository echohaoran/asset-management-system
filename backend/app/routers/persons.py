from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import Person, Asset
from app.schemas import PersonCreate, PersonOut, PersonWithAssets, AssetOut
from app.auth import get_current_user
from app.routers.assets import _asset_to_out as _convert_asset_to_out

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.post("", response_model=PersonOut)
def create_person(req: PersonCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    person = Person(name=req.name, department=req.department)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.get("", response_model=list[PersonOut])
def list_persons(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Person).order_by(desc(Person.created_at)).all()


@router.put("/{person_id}", response_model=PersonOut)
def update_person(person_id: int, req: PersonCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    person.name = req.name
    person.department = req.department
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    # Clear person_id on checked-out assets before deleting
    db.query(Asset).filter(Asset.person_id == person_id).update({Asset.person_id: None})
    db.delete(person)
    db.commit()
    return {"message": "删除成功"}


@router.get("/{person_id}/assets", response_model=PersonWithAssets)
def get_person_assets(person_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    assets = db.query(Asset).filter(Asset.person_id == person_id).order_by(desc(Asset.updated_at)).all()
    return PersonWithAssets(
        id=person.id,
        name=person.name,
        department=person.department,
        created_at=person.created_at,
        assets=[_convert_asset_to_out(a, db) for a in assets],
    )
