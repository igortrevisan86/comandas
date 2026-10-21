def test_login_success(client):
    response = client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "AdminPass123!"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin_test"
    assert data["user"]["role"] == "admin"

def test_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "WrongPassword"})
    assert response.status_code == 401
    assert "incorretos" in response.json()["detail"].lower()

def test_get_current_user_profile(client, operator_headers):
    response = client.get("/api/v1/auth/me", headers=operator_headers)
    assert response.status_code == 200
    assert response.json()["username"] == "operador_test"
    assert response.json()["role"] == "operator"

def test_admin_can_create_user(client, admin_headers):
    response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "username": "novo_caixa",
            "full_name": "Novo Operador",
            "password": "SenhaSegura123!",
            "role": "operator",
            "is_active": True
        }
    )
    assert response.status_code == 200
    assert response.json()["username"] == "novo_caixa"

def test_operator_cannot_create_user(client, operator_headers):
    response = client.post(
        "/api/v1/users",
        headers=operator_headers,
        json={
            "username": "tentativa_admin",
            "full_name": "Invasor",
            "password": "SenhaSegura123!",
            "role": "admin",
            "is_active": True
        }
    )
    assert response.status_code == 403
