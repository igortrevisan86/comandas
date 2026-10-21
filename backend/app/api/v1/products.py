from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_admin, get_current_user, get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["Produtos"])

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    only_active: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if only_active:
        query = query.filter(Product.is_active == True)
        
    products = query.order_by(Product.id.asc()).all()
    
    result = []
    for p in products:
        res = ProductResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            price=Decimal(str(p.price)),
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        result.append(res)
    return result

@router.post("", response_model=ProductResponse, status_code=status.HTTP_200_OK)
def create_product(
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    category = db.query(Category).filter(Category.id == prod_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria informada não existe."
        )
        
    product = Product(
        name=prod_in.name,
        description=prod_in.description,
        category_id=prod_in.category_id,
        price=prod_in.price.quantize(Decimal("0.01")),
        is_active=prod_in.is_active
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        category_id=product.category_id,
        category_name=category.name,
        price=Decimal(str(product.price)),
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at
    )

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    prod_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado."
        )
    if prod_in.category_id is not None:
        cat = db.query(Category).filter(Category.id == prod_in.category_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria informada não existe."
            )
        product.category_id = prod_in.category_id
        
    if prod_in.name is not None:
        product.name = prod_in.name
    if prod_in.description is not None:
        product.description = prod_in.description
    if prod_in.price is not None:
        product.price = prod_in.price.quantize(Decimal("0.01"))
    if prod_in.is_active is not None:
        product.is_active = prod_in.is_active
        
    db.commit()
    db.refresh(product)
    
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        price=Decimal(str(product.price)),
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at
    )
