from decimal import Decimal

def test_split_by_items_and_shared_item(client, operator_headers):
    # 1. Abrir comanda
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    order_id = order["id"]

    prods = client.get("/api/v1/products", headers=operator_headers).json()
    # P1: Refrigerante (R$ 10.00)
    # P2: Hambúrguer (R$ 30.00)
    # P3: Porção Batata (R$ 20.00)
    refri_id = prods[0]["id"]
    burg_id = prods[1]["id"]
    batata_id = prods[2]["id"]

    items_resp = client.post(
        f"/api/v1/orders/{order_id}/items",
        headers=operator_headers,
        json={"items": [
            {"product_id": refri_id, "quantity": 1.0},
            {"product_id": burg_id, "quantity": 1.0},
            {"product_id": batata_id, "quantity": 1.0}
        ]}
    ).json()

    # Identificar IDs de cada item criado
    item_refri = items_resp["items"][0]["id"]
    item_burg = items_resp["items"][1]["id"]
    item_batata = items_resp["items"][2]["id"]

    # Total da comanda = 10 + 30 + 20 = R$ 60.00
    assert Decimal(str(items_resp["total_amount"])) == Decimal("60.00")

    # Divisão por itens:
    # Pessoa 1: Hambúrguer (1.0 x 30 = 30) + metade da batata (0.5 x 20 = 10) -> Total: R$ 40,00
    # Pessoa 2: Refrigerante (1.0 x 10 = 10) + metade da batata (0.5 x 20 = 10) -> Total: R$ 20,00
    split_payload = {
        "participants": [
            {
                "participant_name": "Pessoa 1",
                "items": [
                    {"order_item_id": item_burg, "quantity_fraction": 1.0},
                    {"order_item_id": item_batata, "quantity_fraction": 0.5}
                ]
            },
            {
                "participant_name": "Pessoa 2",
                "items": [
                    {"order_item_id": item_refri, "quantity_fraction": 1.0},
                    {"order_item_id": item_batata, "quantity_fraction": 0.5}
                ]
            }
        ]
    }

    split_resp = client.post(f"/api/v1/orders/{order_id}/split/by-items", headers=operator_headers, json=split_payload)
    assert split_resp.status_code == 200
    splits = split_resp.json()
    assert len(splits) == 2

    p1 = splits[0]
    p2 = splits[1]

    assert Decimal(str(p1["target_amount"])) == Decimal("40.00")
    assert Decimal(str(p2["target_amount"])) == Decimal("20.00")
    assert (Decimal(str(p1["target_amount"])) + Decimal(str(p2["target_amount"]))) == Decimal("60.00")

def test_prevent_oversubscription_of_item_fraction(client, operator_headers):
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "102"}).json()
    prods = client.get("/api/v1/products", headers=operator_headers).json()
    items_resp = client.post(
        f"/api/v1/orders/{order['id']}/items",
        headers=operator_headers,
        json={"items": [{"product_id": prods[0]["id"], "quantity": 1.0}]}
    ).json()
    item_id = items_resp["items"][0]["id"]

    # Tentativa de atribuir mais de 100% de um item (0.7 + 0.5 = 1.2 = 120%)
    invalid_split = {
        "participants": [
            {"participant_name": "P1", "items": [{"order_item_id": item_id, "quantity_fraction": 0.7}]},
            {"participant_name": "P2", "items": [{"order_item_id": item_id, "quantity_fraction": 0.5}]}
        ]
    }
    resp = client.post(f"/api/v1/orders/{order['id']}/split/by-items", headers=operator_headers, json=invalid_split)
    assert resp.status_code == 400
    assert "excede 100%" in resp.json()["detail"].lower()
