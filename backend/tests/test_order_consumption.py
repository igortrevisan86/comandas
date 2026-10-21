from decimal import Decimal

def test_add_items_and_idempotency(client, operator_headers):
    # Abrir comanda
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    order_id = order["id"]

    prods = client.get("/api/v1/products", headers=operator_headers).json()
    p1 = prods[0]["id"]  # R$ 10.00
    p2 = prods[1]["id"]  # R$ 30.00

    # Lançar itens com chave de idempotência
    idem_key = "idemp_test_12345"
    payload = {
        "items": [
            {"product_id": p1, "quantity": 2.0},  # 20.00
            {"product_id": p2, "quantity": 1.0}   # 30.00
        ],
        "idempotency_key": idem_key
    }
    resp1 = client.post(f"/api/v1/orders/{order_id}/items", headers=operator_headers, json=payload)
    assert resp1.status_code == 200
    assert Decimal(str(resp1.json()["total_amount"])) == Decimal("50.00")
    assert len(resp1.json()["items"]) == 2

    # Enviar a mesma requisição novamente com a mesma chave (ex: duplo clique)
    resp2 = client.post(f"/api/v1/orders/{order_id}/items", headers=operator_headers, json=payload)
    assert resp2.status_code == 200
    # O total DEVE continuar R$ 50.00 e a quantidade de itens continuar 2 (sem duplicação!)
    assert Decimal(str(resp2.json()["total_amount"])) == Decimal("50.00")
    assert len(resp2.json()["items"]) == 2

def test_cancel_order_item_with_reason(client, operator_headers):
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "102"}).json()
    order_id = order["id"]

    prods = client.get("/api/v1/products", headers=operator_headers).json()
    p1 = prods[0]["id"]  # R$ 10.00

    # Lançar 2 refrigerantes (R$ 20.00)
    add_resp = client.post(
        f"/api/v1/orders/{order_id}/items",
        headers=operator_headers,
        json={"items": [{"product_id": p1, "quantity": 2.0}]}
    ).json()

    item_id = add_resp["items"][0]["id"]
    assert Decimal(str(add_resp["total_amount"])) == Decimal("20.00")

    # Cancelar item informando justificativa
    cancel_resp = client.post(
        f"/api/v1/orders/items/{item_id}/cancel",
        headers=operator_headers,
        json={"reason": "Cliente solicitou cancelamento por engano do garçom"}
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"
    assert "engano" in cancel_resp.json()["cancellation_reason"].lower()

    # Comanda deve refletir novo saldo de R$ 0.00
    summary = client.get(f"/api/v1/orders/{order_id}", headers=operator_headers).json()
    assert Decimal(str(summary["total_amount"])) == Decimal("0.00")
    assert Decimal(str(summary["balance"])) == Decimal("0.00")
    # O item cancelado permanece registrado no histórico
    assert len(summary["items"]) == 1
    assert summary["items"][0]["status"] == "cancelled"
