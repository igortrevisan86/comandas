def test_card_registration_and_uniqueness(client, admin_headers):
    # Criar cartão novo
    resp = client.post("/api/v1/cards", headers=admin_headers, json={"number": "201", "notes": "Teste"})
    assert resp.status_code == 200
    assert resp.json()["number"] == "201"

    # Tentar criar com mesmo número -> erro 400
    resp_dup = client.post("/api/v1/cards", headers=admin_headers, json={"number": "201", "notes": "Duplicado"})
    assert resp_dup.status_code == 400

def test_query_card_status(client, operator_headers):
    # Cartão 101 está disponível
    resp = client.get("/api/v1/cards/101/status", headers=operator_headers)
    assert resp.status_code == 200
    assert resp.json()["can_open_order"] is True
    assert resp.json()["card"]["status"] == "available"

    # Cartão 103 está bloqueado
    resp_blocked = client.get("/api/v1/cards/103/status", headers=operator_headers)
    assert resp_blocked.status_code == 200
    assert resp_blocked.json()["can_open_order"] is False
    assert "bloqueado" in resp_blocked.json()["reason"].lower()

def test_open_order_and_prevent_duplicate_open(client, operator_headers):
    # 1. Abrir comanda para o cartão 101
    resp_open = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101", "notes": "Cliente 1"})
    assert resp_open.status_code == 200
    order_id = resp_open.json()["id"]
    assert resp_open.json()["card_number_snapshot"] == "101"
    assert resp_open.json()["status"] == "open"

    # 2. Consultar status do cartão -> agora deve estar em uso
    resp_status = client.get("/api/v1/cards/101/status", headers=operator_headers)
    assert resp_status.status_code == 200
    assert resp_status.json()["can_open_order"] is False
    assert resp_status.json()["current_order_id"] == order_id

    # 3. Tentar abrir OUTRA comanda para o mesmo cartão 101 -> deve falhar obrigatoriamente
    resp_dup = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101", "notes": "Segunda tentativa"})
    assert resp_dup.status_code == 400
    assert "já possui uma comanda aberta" in resp_dup.json()["detail"].lower()

def test_cannot_open_order_for_blocked_card(client, operator_headers):
    resp = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "103"})
    assert resp.status_code == 400
    assert "bloqueado" in resp.json()["detail"].lower()
