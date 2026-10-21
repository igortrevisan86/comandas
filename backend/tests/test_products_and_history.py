from decimal import Decimal

def test_historical_unit_price_preservation(client, admin_headers, operator_headers):
    # 1. Obter produto inicial "Refrigerante" (preço R$ 10.00)
    prods = client.get("/api/v1/products?search=Refrigerante", headers=operator_headers).json()
    refri_id = prods[0]["id"]
    assert Decimal(str(prods[0]["price"])) == Decimal("10.00")

    # 2. Abrir comanda no cartão 102
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "102"}).json()
    order_id = order["id"]

    # 3. Lançar 2 refrigerantes na comanda (2 x 10 = R$ 20.00)
    client.post(
        f"/api/v1/orders/{order_id}/items",
        headers=operator_headers,
        json={"items": [{"product_id": refri_id, "quantity": 2.0}]}
    )

    # 4. Administrador atualiza o preço do Refrigerante para R$ 15.00 no cardápio
    update_resp = client.put(
        f"/api/v1/products/{refri_id}",
        headers=admin_headers,
        json={"price": 15.00}
    )
    assert update_resp.status_code == 200

    # 5. Conferir a comanda anterior: o item histórico DEVE CONTINUAR a R$ 10.00 com subtotal R$ 20.00!
    order_summary = client.get(f"/api/v1/orders/{order_id}", headers=operator_headers).json()
    assert Decimal(str(order_summary["total_amount"])) == Decimal("20.00")
    assert Decimal(str(order_summary["items"][0]["unit_price_snapshot"])) == Decimal("10.00")
    assert Decimal(str(order_summary["items"][0]["subtotal"])) == Decimal("20.00")

def test_cannot_add_inactive_product(client, admin_headers, operator_headers):
    # Desativar produto
    prods = client.get("/api/v1/products?search=Hambúrguer", headers=operator_headers).json()
    burg_id = prods[0]["id"]
    client.put(f"/api/v1/products/{burg_id}", headers=admin_headers, json={"is_active": False})

    # Tentar lançar produto inativo
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    resp = client.post(
        f"/api/v1/orders/{order['id']}/items",
        headers=operator_headers,
        json={"items": [{"product_id": burg_id, "quantity": 1.0}]}
    )
    assert resp.status_code == 400
    assert "inativo" in resp.json()["detail"].lower()
