from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import Base, engine
from app.models.card import Card, CardStatus
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole

def init_db(db: Session) -> None:
    # 1. Create tables if they do not exist
    Base.metadata.create_all(bind=db.get_bind())

    # 2. Seed initial users if not existing
    admin_exists = db.query(User).filter(User.username == settings.ADMIN_INITIAL_USERNAME).first()
    if not admin_exists:
        admin_user = User(
            username=settings.ADMIN_INITIAL_USERNAME,
            hashed_password=get_password_hash(settings.ADMIN_INITIAL_PASSWORD),
            full_name=settings.ADMIN_INITIAL_NAME,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.flush()

    operator_exists = db.query(User).filter(User.username == "operador").first()
    if not operator_exists:
        op_user = User(
            username="operador",
            hashed_password=get_password_hash("Operador@2026!"),
            full_name="Operador de Caixa",
            role=UserRole.OPERATOR,
            is_active=True
        )
        db.add(op_user)
        db.flush()


    # 3. Seed initial standard cards (001 to 030) if no cards exist
    card_count = db.query(Card).count()
    if card_count == 0:
        for i in range(1, 31):
            num_str = str(i).zfill(3)
            db.add(Card(number=num_str, status=CardStatus.AVAILABLE))
        db.flush()

    # 4. Seed initial categories & demo products if empty
    cat_count = db.query(Category).count()
    if cat_count == 0:
        categories_data = [
            ("Lanches & Salgados", "Hambúrgueres, coxinhas, pastéis e toasts artesanais"),
            ("Bebidas", "Refrigerantes, sucos naturais, águas e energéticos"),
            ("Cafeteria & Padaria", "Cafés expressos, cappuccinos, pães de queijo e croissants"),
            ("Pratos Executivos", "Almoços rápidos, parmegiana, grelhados e guarnições"),
            ("Sobremesas", "Pudins, tortas doces, mousses e sorvetes"),
        ]

        cat_map = {}
        for name, desc in categories_data:
            cat = Category(name=name, description=desc, is_active=True)
            db.add(cat)
            db.flush()
            cat_map[name] = cat.id

        products_data = [
            ("Hambúrguer Artesanal Graal", "Pão brioche, blend 180g, queijo cheddar e bacon crocante", "Lanches & Salgados", Decimal("38.90")),
            ("Coxinha Especial com Catupiry", "Massa crocante com recheio cremoso de frango desfiado", "Lanches & Salgados", Decimal("12.50")),
            ("Misto Quente Especial", "Pão de forma tostado na manteiga com presunto e mussarela", "Lanches & Salgados", Decimal("14.00")),
            ("Pão de Queijo Mineiro", "Assado na hora com queijo canastra legítimo", "Cafeteria & Padaria", Decimal("6.50")),
            ("Café Expresso Duplo", "Grãos selecionados 100% arábica", "Cafeteria & Padaria", Decimal("8.00")),
            ("Cappuccino Cremoso", "Café, leite vaporizado, canela e chocolate belga", "Cafeteria & Padaria", Decimal("12.00")),
            ("Suco Natural de Laranja 400ml", "Feito na hora, 100% fruta sem adição de água", "Bebidas", Decimal("11.00")),
            ("Refrigerante Lata 350ml", "Coca-Cola, Guaraná Antarctica ou Zero", "Bebidas", Decimal("7.50")),
            ("Água Mineral 500ml", "Com ou sem gás", "Bebidas", Decimal("5.00")),
            ("Filé à Parmegiana Executivo", "Acompanha arroz branco fresquinho e fritas crocantes", "Pratos Executivos", Decimal("46.90")),
            ("Frango Grelhado com Legumes", "Peito de frango marinado com ervas e legumes salteados", "Pratos Executivos", Decimal("36.00")),
            ("Pudim de Leite Condensado", "Fatia generosa com calda de caramelo dourada", "Sobremesas", Decimal("12.90")),
            ("Torta Holandesa", "Camada crocante, creme especial e cobertura de chocolate", "Sobremesas", Decimal("15.50")),
        ]

        for p_name, p_desc, c_name, p_price in products_data:
            if c_name in cat_map:
                prod = Product(
                    name=p_name,
                    description=p_desc,
                    category_id=cat_map[c_name],
                    price=p_price,
                    is_active=True
                )
                db.add(prod)

    db.commit()
