from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.category import Category
from app.models.product import Product
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.audit_service import record_audit

# --- Categorias ---
def create_category(db: Session, cat_in: CategoryCreate, current_user: User, ip: Optional[str] = None) -> Category:
    name_clean = cat_in.name.strip()
    existing = db.query(Category).filter(Category.name.ilike(name_clean)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Categoria '{name_clean}' já existe."
        )
    category = Category(
        name=name_clean,
        description=cat_in.description,
        is_active=cat_in.is_active
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    record_audit(db, current_user, "CATEGORY_CREATE", "Category", str(category.id), {"name": category.name}, ip)
    db.commit()
    return category

def list_categories(db: Session, only_active: bool = False) -> List[Category]:
    query = db.query(Category)
    if only_active:
        query = query.filter(Category.is_active == True)
    return query.order_by(Category.name.asc()).all()

def update_category(db: Session, category_id: int, cat_in: CategoryUpdate, current_user: User, ip: Optional[str] = None) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")
    changes = {}
    if cat_in.name is not None:
        category.name = cat_in.name.strip()
        changes["name"] = category.name
    if cat_in.description is not None:
        category.description = cat_in.description
        changes["description"] = cat_in.description
    if cat_in.is_active is not None:
        category.is_active = cat_in.is_active
        changes["is_active"] = cat_in.is_active
    db.commit()
    db.refresh(category)
    record_audit(db, current_user, "CATEGORY_UPDATE", "Category", str(category.id), changes, ip)
    db.commit()
    return category

# --- Produtos ---
def create_product(db: Session, prod_in: ProductCreate, current_user: User, ip: Optional[str] = None) -> Product:
    cat = db.query(Category).filter(Category.id == prod_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria informada não existe.")
    
    product = Product(
        name=prod_in.name.strip(),
        description=prod_in.description,
        category_id=prod_in.category_id,
        price=prod_in.price,
        is_active=prod_in.is_active
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    record_audit(
        db, current_user, "PRODUCT_CREATE", "Product", str(product.id),
        {"name": product.name, "price": str(product.price), "category_id": product.category_id},
        ip
    )
    db.commit()
    return product

def list_products(
    db: Session,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    only_active: bool = False
) -> List[Product]:
    query = db.query(Product)
    if only_active:
        query = query.filter(Product.is_active == True)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search.strip()}%"))
    return query.order_by(Product.name.asc()).all()

def update_product(db: Session, product_id: int, prod_in: ProductUpdate, current_user: User, ip: Optional[str] = None) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
    
    changes = {}
    if prod_in.name is not None:
        product.name = prod_in.name.strip()
        changes["name"] = product.name
    if prod_in.description is not None:
        product.description = prod_in.description
        changes["description"] = product.description
    if prod_in.category_id is not None:
        cat = db.query(Category).filter(Category.id == prod_in.category_id).first()
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria informada não existe.")
        product.category_id = prod_in.category_id
        changes["category_id"] = product.category_id
    if prod_in.price is not None:
        old_price = str(product.price)
        product.price = prod_in.price
        changes["price"] = {"old": old_price, "new": str(prod_in.price)}
    if prod_in.is_active is not None:
        product.is_active = prod_in.is_active
        changes["is_active"] = prod_in.is_active

    db.commit()
    db.refresh(product)
    record_audit(db, current_user, "PRODUCT_UPDATE", "Product", str(product.id), changes, ip)
    db.commit()
    return product

def delete_or_deactivate_product(db: Session, product_id: int, current_user: User, ip: Optional[str] = None) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
    
    # Verificar se foi utilizado em pedidos históricos
    has_orders = db.query(OrderItem).filter(OrderItem.product_id == product.id).first()
    if has_orders:
        # Não pode apagar! Desativar para manter integridade histórica
        product.is_active = False
        db.commit()
        db.refresh(product)
        record_audit(
            db, current_user, "PRODUCT_DEACTIVATE", "Product", str(product.id),
            {"reason": "Produto desativado para preservar integridade de comandas historicas"},
            ip
        )
        db.commit()
        return product
    else:
        # Se nunca foi utilizado, pode ser excluído fisicamente
        db.delete(product)
        db.commit()
        record_audit(db, current_user, "PRODUCT_DELETE", "Product", str(product_id), {"name": product.name}, ip)
        db.commit()
        return product
