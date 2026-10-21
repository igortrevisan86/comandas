from decimal import Decimal

def test_multi_payment_change_calculation_and_closure(client, operator_headers):
    # 1. Abrir comanda no cartão 101
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    order_id = order["id"]

    prods = client.get("/api/v1/products", headers=operator_headers).json()
    # Adicionar itens totalizando R$ 150.00 (ex: 5 x Hambúrguer a 30.00)
    burg_id = prods[1]["id"]
    client.post(
        f"/api/v1/orders/{order_id}/items",
        headers=operator_headers,
        json={"items": [{"product_id": burg_id, "quantity": 5.0}]}
    )

    summary = client.get(f"/api/v1/orders/{order_id}", headers=operator_headers).json()
    assert Decimal(str(summary["total_amount"])) == Decimal("150.00")
    assert Decimal(str(summary["balance"])) == Decimal("150.00")

    # 2. Tentar fechar a comanda com saldo pendente de R$ 150.00 -> DEVE FALHAR
    close_attempt = client.post(f"/api/v1/orders/{order_id}/close", headers=operator_headers)
    assert close_attempt.status_code == 400
    assert "saldo pendente" in close_attempt.json()["detail"].lower()

    # 3. Pagamento 1: R$ 50,00 via Pix
    p1_resp = client.post(
        "/api/v1/payments",
        headers=operator_headers,
        json={"order_id": order_id, "method": "pix", "amount": 50.00}
    )
    assert p1_resp.status_code == 200
    assert Decimal(str(p1_resp.json()["amount"])) == Decimal("50.00")
    assert Decimal(str(p1_resp.json()["change_amount"])) == Decimal("0.00")

    # Saldo deve ser R$ 100,00
    summary = client.get(f"/api/v1/orders/{order_id}", headers=operator_headers).json()
    assert Decimal(str(summary["total_paid"])) == Decimal("50.00")
    assert Decimal(str(summary["balance"])) == Decimal("100.00")

    # 4. Pagamento 2: R$ 60,00 via Cartão de Débito
    p2_resp = client.post(
        "/api/v1/payments",
        headers=operator_headers,
        json={"order_id": order_id, "method": "debit", "amount": 60.00}
    )
    assert p2_resp.status_code == 200

    # Saldo deve ser R$ 40,00
    summary = client.get(f"/api/v1/orders/{order_id}", headers=operator_headers).json()
    assert Decimal(str(summary["total_paid"])) == Decimal("110.00")
    assert Decimal(str(summary["balance"])) == Decimal("40.00")

    # 5. Pagamento 3: R$ 40,00 em Dinheiro, cliente entrega nota de R$ 50,00 -> Troco calculado de R$ 10,00!
    p3_resp = client.post(
        "/api/v1/payments",
        headers=operator_headers,
        json={
            "order_id": order_id,
            "method": "cash",
            "amount": 40.00,
            "amount_received": 50.00
        }
    )
    assert p3_resp.status_code == 200
    assert Decimal(str(p3_resp.json()["amount"])) == Decimal("40.00")
    assert Decimal(str(p3_resp.json()["change_amount"])) == Decimal("10.00")

    # 6. Saldo deve estar zerado (R$ 0,00) e total pago R$ 150,00
    summary = client.get(f"/api/v1/orders/{order_id}", headers=operator_headers).json()
    assert Decimal(str(summary["total_paid"])) == Decimal("150.00")
    assert Decimal(str(summary["balance"])) == Decimal("0.00")

    # 7. Agora o encerramento da comanda DEVE TER SUCESSO!
    close_resp = client.post(f"/api/v1/orders/{order_id}/close", headers=operator_headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"

    # 8. O cartão 101 DEVE ter voltado a ficar "available"
    card_status = client.get("/api/v1/cards/101/status", headers=operator_headers).json()
    assert card_status["can_open_order"] is True
    assert card_status["card"]["status"] == "available"

    # 9. O cartão pode ser reutilizado imediatamente em uma nova comanda
    reopen_resp = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    assert reopen_resp["id"] != order_id
    assert reopen_resp["status"] == "open"

def test_prevent_payment_exceeding_balance(client, operator_headers):
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "102"}).json()
    prods = client.get("/api/v1/products", headers=operator_headers).json()
    # Adicionar R$ 10.00
    client.post(f"/api/v1/orders/{order['id']}/items", headers=operator_headers, json={"items": [{"product_id": prods[0]["id"], "quantity": 1.0}]})

    # Tentar pagar R$ 15.00 quando a dívida é R$ 10.00 -> deve falhar
    resp = client.post(
        "/api/v1/payments",
        headers=operator_headers,
        json={"order_id": order["id"], "method": "pix", "amount": 15.00}
    )
    assert resp.status_code == 400
    assert "excede o saldo restante" in resp.json()["detail"].lower()
