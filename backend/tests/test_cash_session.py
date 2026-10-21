from decimal import Decimal

def test_cash_session_physical_vs_electronic_and_reconciliation(client, operator_headers):
    # 1. Abrir sessão de caixa com R$ 100,00 de fundo de troco
    open_resp = client.post(
        "/api/v1/cash/open",
        headers=operator_headers,
        json={"initial_cash": 100.00, "notes": "Abertura turno manha"}
    )
    assert open_resp.status_code == 200
    session_id = open_resp.json()["id"]
    assert Decimal(str(open_resp.json()["initial_cash"])) == Decimal("100.00")
    assert Decimal(str(open_resp.json()["expected_cash"])) == Decimal("100.00")

    # 2. Criar comanda e registrar pagamento em DINHEIRO de R$ 40,00
    order = client.post("/api/v1/orders/open", headers=operator_headers, json={"card_number": "101"}).json()
    prods = client.get("/api/v1/products", headers=operator_headers).json()
    # Adicionar 2 itens de R$ 30 = R$ 60.00
    client.post(f"/api/v1/orders/{order['id']}/items", headers=operator_headers, json={"items": [{"product_id": prods[1]["id"], "quantity": 2.0}]})

    # Pagamento de R$ 40 em dinheiro
    client.post(
        "/api/v1/payments",
        headers=operator_headers,
        json={"order_id": order["id"], "method": "cash", "amount": 40.00, "amount_received": 40.00}
    )

    # Pagamento de R$ 20 em PIX
    client.post(
        "/api/v1/payments",
        headers=operator_headers,
        json={"order_id": order["id"], "method": "pix", "amount": 20.00}
    )

    # Fechar comanda quitada
    client.post(f"/api/v1/orders/{order['id']}/close", headers=operator_headers)

    # 3. Movimentações manuais de caixa:
    # Suprimento de R$ 50,00 (troco extra adicionado à gaveta)
    client.post(
        f"/api/v1/cash/{session_id}/movement",
        headers=operator_headers,
        json={"movement_type": "supply", "amount": 50.00, "reason": "Adicionado troco de moedas"}
    )

    # Sangria de R$ 30,00 (retirada de segurança para cofre)
    client.post(
        f"/api/v1/cash/{session_id}/movement",
        headers=operator_headers,
        json={"movement_type": "drain", "amount": 30.00, "reason": "Retirada para o cofre central"}
    )

    # Conferir status ativo da sessão:
    # Dinheiro esperado = Inicial (100) + Dinheiro Recebido (40) + Suprimento (50) - Sangria (30) = R$ 160,00
    # O PIX de R$ 20 NÃO pode entrar no dinheiro físico esperado!
    active_details = client.get("/api/v1/cash/active", headers=operator_headers).json()
    assert Decimal(str(active_details["expected_cash"])) == Decimal("160.00")
    assert Decimal(str(active_details["total_cash_payments"])) == Decimal("40.00")
    assert Decimal(str(active_details["total_pix_payments"])) == Decimal("20.00")
    assert Decimal(str(active_details["total_electronic_payments"])) == Decimal("20.00")

    # 4. Fechamento de caixa: operador conta as notas na gaveta e apura R$ 160,00 (sem quebra)
    close_resp = client.post(
        f"/api/v1/cash/{session_id}/close",
        headers=operator_headers,
        json={"final_cash_counted": 160.00, "notes": "Fechamento conferido sem divergência"}
    )
    assert close_resp.status_code == 200
    closed_data = close_resp.json()
    assert closed_data["status"] == "closed"
    assert Decimal(str(closed_data["expected_cash"])) == Decimal("160.00")
    assert Decimal(str(closed_data["final_cash_counted"])) == Decimal("160.00")
    assert Decimal(str(closed_data["difference"])) == Decimal("0.00")
