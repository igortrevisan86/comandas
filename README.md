# ComandaPRO — Sistema de Comandas para Restaurante e Ponto de Venda (PDV)

Sistema profissional completo para operação de restaurante baseado no modelo de **cartões físicos numerados reutilizáveis** (estilo Graal / padarias / choperias — ex: 001, 002, 003...), com controle de ponto de venda, pagamentos parciais, racha de conta determinístico, frente de caixa com fechamento cego e auditoria de segurança imutável.

Pronto para execução local no **Windows** e acessível por outros dispositivos (tablets, smartphones, terminais de garçom) na **rede local (LAN)**.

---

## 🚀 Como Iniciar no Windows (1 Clique)

Na raiz do projeto (`sistema-comandas`), execute:

```cmd
iniciar.bat
```

O script realiza automaticamente:
1. Verificação da instalação e execução do **Docker Desktop**;
2. Criação do arquivo de configuração `.env` seguro a partir de `.env.example` (se inexistente);
3. Subida dos containers em segundo plano (`db`, `backend`, `frontend`);
4. Aguardo do healthcheck do banco de dados PostgreSQL;
5. Execução automática das migrações do Alembic e carga de dados semente (usuários, categorias, produtos e cartões de demonstração);
6. Detecção do endereço IP local e exibição dos links de acesso local e na rede (LAN).

### 🌐 Endereços de Acesso
- **Terminal Local:** `http://localhost:8080`
- **Acesso na Rede Local (LAN):** `http://<IP_DO_SEU_COMPUTADOR>:8080`
- **Documentação Interativa da API (Swagger UI):** `http://localhost:8080/docs`

### 🔑 Credenciais Padrão de Demonstração
| Usuário | Senha | Papel | Descrição |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Administrador Geral** | Acesso completo: Cardápio, Cartões, Usuários, Relatórios e Caixa |
| `operador` | `operador123` | **Operador de Caixa** | Operação diária: Painel de Cartões, Lançamento PDV, Pagamentos e Caixa |

*(Você pode alterar senhas e criar novos operadores diretamente na tela de Gestão de Usuários).*

---

## 🛠️ Comandos Operacionais

| Script | Finalidade |
| :--- | :--- |
| `iniciar.bat` | Inicia o banco de dados, API backend e frontend Nginx |
| `parar.bat` | Para os containers com segurança sem excluir os dados |
| `backup.bat` | Gera um dump seguro do PostgreSQL em `backups/backup_YYYYMMDD_HHMMSS.sql` |
| `restaurar.bat` | Restaura a base de dados a partir de um backup especificado |

---

## 🏛️ Arquitetura e Tecnologias

```
[ Dispositivos LAN (Tablets / Celulares / PCs) ]
                       │
                       ▼ Porta 8080 (Host)
        ┌─────────────────────────────┐
        │       Nginx (Frontend)      │
        │  SPA React 18 + Vite + CSS  │
        └──────────────┬──────────────┘
                       │ Proxy reverso /api
                       ▼ Porta 8000
        ┌─────────────────────────────┐
        │      FastAPI (Backend)      │
        │   Python 3.12 + SQLAlchemy  │
        └──────────────┬──────────────┘
                       │ Rede interna Docker bridge
                       │ (Porta 5432 ISOLADA do host)
                       ▼
        ┌─────────────────────────────┐
        │     PostgreSQL 16 (DB)      │
        │      Volume persistente     │
        └─────────────────────────────┘
```

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React, React Router v6, Vitest.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (cálculo monetário exato com `Decimal` / `NUMERIC(10,2)`), Alembic, Pytest.
- **Banco de Dados & Segurança de Rede:** PostgreSQL 16 rodando em rede bridge interna do Docker (`comandas-internal-net`). A porta 5432 **NÃO** é exposta ao host nem à rede local, impedindo ataques diretos ao banco.

---

## 💎 Regras de Negócio e Invariantes do Sistema

1. **Cartões Físicos como Identificadores:**
   - O cartão físico (ex: `001`) é apenas um identificador de circulação.
   - Cada abertura de comanda gera um novo registro com UUID independente.
   - O cartão pode ser reutilizado infinitas vezes mantendo o histórico completo e isolado de todas as contas passadas.
   - O sistema impede categoricamente a abertura de duas comandas ativas para o mesmo cartão simultaneamente.

2. **Snapshot Imutável de Preço e Nome:**
   - Ao lançar um produto na comanda, o sistema grava o nome e o preço unitário vigentes naquele exato instante.
   - Alterações posteriores no cardápio nunca alteram o valor de itens já consumidos.

3. **Divisão Igualitária com Centavos Determinísticos (Racha Conta):**
   - Ao dividir uma conta (ex: R$ 100,00 entre 3 pessoas), o algoritmo calcula:
     - Participante 1: R$ 33,34
     - Participante 2: R$ 33,33
     - Participante 3: R$ 33,33
     - **Soma exata:** R$ 100,00 (zero erro de arredondamento).

4. **Divisão por Itens e Frações:**
   - Permite associar itens consumidos a participantes específicos ou ratear itens com frações (ex: 0.500 de uma pizza). A soma das frações de um mesmo item não pode exceder 1.000.

5. **Pagamentos Parciais e Múltiplos:**
   - Suporta múltiplos recebimentos na mesma comanda (Dinheiro, PIX, Débito, Crédito).
   - Calculadora inteligente de troco para pagamentos em dinheiro com atalhos de cédulas (R$ 20, R$ 50, R$ 100, R$ 200).
   - O encerramento da comanda é bloqueado se houver saldo devedor pendente.
   - Ao liquidar o saldo (R$ 0,00), a comanda é encerrada e o cartão é liberado automaticamente para o próximo cliente.

6. **Frente de Caixa (Turnos e Fechamento Cego):**
   - Fundo de troco inicial no momento da abertura.
   - Sangrias (retiradas) e Suprimentos (reforços) com justificativa obrigatória.
   - **Separação rigorosa de valores:** Vendas em PIX e Cartões são computadas separadamente e **NÃO** entram na contagem da gaveta física de dinheiro.
   - Fechamento cego: o operador informa o valor em cédulas/moedas contado fisicamente; o sistema calcula a diferença (sobra ou quebra de caixa).

7. **Trilha de Auditoria Imutável:**
   - Cancelamento de itens, estorno de pagamentos, sangrias, suprimentos e alterações cadastrais exigem justificativa e são gravados em log de auditoria permanente com usuário, IP e timestamp.

8. **Comprovante Térmico de 80mm:**
   - Layout de impressão térmica pronto para conferência de mesa (prévia) e cupom final do cliente com atalho de impressão direta (`Ctrl+P` ou botão Imprimir).

---

## 🧪 Suíte de Testes Automatizados

O sistema conta com testes automatizados no Backend e no Frontend:

### Testes do Backend (Pytest):
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```
- **20 testes automatizados** cobrindo autenticação, integridade de cartões, idempotência de itens, snapshots de preços, pagamentos múltiplos, racha igualitário determinístico, divisão por itens, sangria/suprimento e reconciliação de caixa.

### Testes do Frontend (Vitest):
```powershell
cd frontend
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm test
```
- **8 testes unitários** validando renderização de tela de login, preenchimento rápido de credenciais e utilitários monetários BRL.

---

## 🔒 Auditoria e Boas Práticas
- Nenhuma senha gravada em texto plano (hashing seguro com BCrypt).
- Tokens JWT assinados com expiração controlada.
- Rotas protegidas por permissões de papéis (`admin` vs `operator`).
- Scripts `.bat` projetados para rodar de qualquer pasta no Windows.
