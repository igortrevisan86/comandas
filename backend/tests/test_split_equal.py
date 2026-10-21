from decimal import Decimal

def test_equal_split_deterministic_cents_100_by_3(client, operator_headers):
    # 1. Abrir comanda
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    order_id = order["id"]

    prods = client.get("/api/v1/products", headers=operator_headers).json()
    # Adicionar itens até somar exatamente R$ 100.00 (ex: 10 x R$ 10.00)
    p1 = prods[0]["id"]
    client.post(
        f"/api/v1/orders/{order_id}/items",
        headers=operator_headers,
        json={"items": [{"product_id": p1, "quantity": 10.0}]}
    )

    # 2. Realizar divisão igualitária para 3 participantes
    split_resp = client.post(
        f"/api/v1/orders/{order_id}/split/equal",
        headers=operator_headers,
        json={"num_participants": 3}
    )
    assert split_resp.status_code == 200
    splits = split_resp.json()
    assert len(splits) == 3

    p1_val = Decimal(str(splits[0]["target_amount"]))
    p2_val = Decimal(str(splits[1]["target_amount"]))
    p3_val = Decimal(str(splits[2]["target_amount"]))

    # Validação dos centavos determinísticos exigidos no prompt:
    # Pessoa 1: R$ 33,34
    # Pessoa 2: R$ 33,33
    # Pessoa 3: R$ 33,33
    assert p1_val == Decimal("33.34")
    assert p2_val == Decimal("33.33")
    assert p3_val == Decimal("33.33")

    # A soma das parcelas deve ser exatamente igual a R$ 100,00 sem nenhum desvio
    assert (p1_val + p2_val + p3_val) == Decimal("100.00")

def test_equal_split_10_by_3(client, operator_headers):
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "102"}).json()
    order_id = order["id"]

    prods = client.get("/api/v1/products", headers=operator_headers).json()
    p1 = prods[0]["id"]  # R$ 10.00
    client.post(
        f"/api/v1/orders/{order_id}/items",
        headers=operator_headers,
        json={"items": [{"product_id": p1, "quantity": 1.0}]}
    )

    split_resp = client.post(
        f"/api/v1/orders/{order_id}/split/equal",
        headers=operator_headers,
        json={"num_participants": 3}
    )
    splits = split_resp.json()
    p1 = Decimal(str(splits[0]["target_amount"]))
    p2 = Decimal(str(splits[1]["target_amount"]))
    p3 = Decimal(str(splits[2]["target_amount"]))

    assert p1 == Decimal("3.34")
    assert p2 == Decimal("3.33")
    assert p3 == Decimal("3.33")
    assert (p1 + p2 + p3) == Decimal("10.00")
