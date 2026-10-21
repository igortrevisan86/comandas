import os
import pytest
from decimal import Decimal

# Configure in-memory SQLite before importing application
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.session import Base, get_db
from app.models.card import Card, CardStatus
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole
from app.main import app

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_test_database(db):
    Base.metadata.create_all(bind=engine)
    
    # 1. Seed users
    admin_user = User(
        username="admin_test",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Test",
        role=UserRole.ADMIN,
        is_active=True
    )
    operator_user = User(
        username="operador_test",
        hashed_password=get_password_hash("OperadorPass123!"),
        full_name="Operador Test",
        role=UserRole.OPERATOR,
        is_active=True
    )
    db.add(admin_user)
    db.add(operator_user)
    db.flush()

    # 2. Seed cards
    c101 = Card(number="101", status=CardStatus.AVAILABLE)
    c102 = Card(number="102", status=CardStatus.AVAILABLE)
    c103 = Card(number="103", status=CardStatus.BLOCKED, notes="Cartão bloqueado para testes")
    db.add_all([c101, c102, c103])
    db.flush()

    # 3. Seed category & products
    cat = Category(name="Geral", description="Categoria padrão de testes", is_active=True)
    db.add(cat)
    db.flush()

    p1 = Product(name="Refrigerante", description="Lata 350ml", category_id=cat.id, price=Decimal("10.00"), is_active=True)
    p2 = Product(name="Hambúrguer", description="Artesanal", category_id=cat.id, price=Decimal("30.00"), is_active=True)
    p3 = Product(name="Porção Batata", description="Fritas crocantes", category_id=cat.id, price=Decimal("20.00"), is_active=True)
    db.add_all([p1, p2, p3])

    db.commit()

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_test_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_headers(client):
    resp = client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "AdminPass123!"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def operator_headers(client):
    resp = client.post("/api/v1/auth/login", data={"username": "operador_test", "password": "OperadorPass123!"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
