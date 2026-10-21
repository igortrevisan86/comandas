# IMPLANTAÇÃO E DIÁRIO DE DESENVOLVIMENTO
## Sistema de Comandas para Restaurante (Estilo Graal)

Este documento registra continuamente todas as decisões de arquitetura, configurações, etapas implementadas, testes executados e instruções operacionais.

---

### 1. Resumo Executivo
- **Aplicação:** Sistema de Comandas e Ponto de Venda (PDV) para Restaurantes.
- **Modelo de Operação:** Cartões numerados físicos reutilizáveis (001, 002, etc.). O cartão é um identificador de circulação; dados e valores residem no banco de dados.
- **Ambiente de Execução:** Windows 10/11 local com suporte a acesso seguro via rede local (LAN).
- **Isolamento de Dados:** PostgreSQL isolado na rede interna do Docker (porta 5432 não exposta externamente). Nginx exposto como reverse proxy no host/LAN na porta 8080.

---

### 2. Arquitetura e Tecnologias
- **Frontend:**
  - React 18 + TypeScript + Vite.
  - Tailwind CSS + Lucide React.
  - React Router DOM para navegação SPA e rotas protegidas (Auth e Admin).
  - Vitest + Testing Library para testes unitários e de interface.
  - Suporte a impressão de comprovantes térmicos de 80mm via CSS `@media print`.
- **Backend:**
  - Python 3.12 + FastAPI.
  - Pydantic v2 para validação e schemas.
  - SQLAlchemy 2.0 com tipos `NUMERIC(12, 2)` / `Decimal` para precisão monetária (nunca float).
  - Alembic para controle de migrações de banco de dados.
  - Pytest para suíte de testes de regras de negócio, concorrência e integridade.
- **Banco de Dados:**
  - PostgreSQL 16 com restrições de integridade, chaves estrangeiras, índices e auditoria.
- **Infraestrutura e Rede:**
  - Docker Compose para orquestração dos serviços (`db`, `backend`, `frontend`).
  - Nginx servindo build estático otimizado e proxy reverso para `/api`.
  - Scripts operacionais Windows (`iniciar.bat`, `parar.bat`, `backup.bat`, `restaurar.bat`).

---

### 3. Progresso por Fases

| Fase | Descrição | Status |
|---|---|---|
| **Fase 1 — Fundação** | Estrutura, Docker Compose, Nginx, FastAPI, Modelos, Auth JWT, Scripts Windows | Concluída |
| **Fase 2 — Produtos e Cartões** | Gestão de Cartões, Categorias, Produtos, Abertura e integridade de Comandas | Concluída |
| **Fase 3 — Consumo** | Carrinho de PDV, Preços históricos, Lançamento idempotente, Resumo, Estornos | Concluída |
| **Fase 4 — Divisão e Pagamentos**| Divisão igualitária e por itens, Pagamentos parciais (Dinheiro, Pix, Débito, Crédito), Troco, Encerramento atômico | Concluída |
| **Fase 5 — Caixa e Relatórios** | Sessão de Caixa (Suprimento/Sangria/Fechamento Cego), Relatórios financeiros, Trilha de auditoria | Concluída |
| **Fase 6 — Interface & Testes**| Frontend React SPA completo (7 telas), Build de produção Vite, Bateria de 28 testes automatizados | Concluída |

---

### 4. Páginas e Telas do Frontend Implementadas
1. **Login (`LoginPage.tsx` / `/login`):**
   - Identificação com login e senha.
   - Botões de preenchimento rápido para demonstração (`admin` e `operador`).
2. **Painel de Cartões (`CardsPanelPage.tsx` / `/comandas`):**
   - Visualização em grade dos cartões físicos (001, 002, 003...).
   - Indicadores de estado: Disponíveis (verde), Em Atendimento (âmbar) e Bloqueados (vermelho).
   - Abertura de comanda em 1 clique e atalhos diretos para PDV ou Pagamento.
3. **Ponto de Venda e Lançamento (`POSPage.tsx` / `/pdv`):**
   - Leitura de código de barras ou digitação do cartão.
   - Catálogo de produtos com filtro de categorias e busca por nome.
   - Cesta de lançamentos com subtotal e controle de quantidade.
   - Envio idempotente para a comanda com chave de segurança contra cliques duplos.
   - Tabela de consumo com cancelamento de itens auditado por justificativa.
   - Impressão térmica de pré-conta / conferência de consumo.
4. **Checkout e Divisão (`CheckoutPage.tsx` / `/checkout`):**
   - Painel financeiro da comanda (Consumo, Pago, Saldo Devedor).
   - Pagamento em Dinheiro com calculadora em tempo real de troco e atalhos de cédulas.
   - Pagamento PIX com QR Code dinâmico e código Copia e Cola.
   - Pagamento via Cartão de Débito e Cartão de Crédito.
   - Suporte a recebimentos parciais e estorno com justificativa obrigatória.
   - Divisão de conta igualitária determinística (sem arredondamento) e por itens.
   - Encerramento atômico permitido exclusivamente após saldo == R$ 0,00, liberando o cartão físico para reuso.
5. **Frente de Caixa (`CashSessionPage.tsx` / `/caixa`):**
   - Abertura de turno com fundo de troco.
   - Movimentações de Sangria (retirada) e Suprimento (reforço) com justificativa.
   - Separação estrita de valores em espécie vs recebimentos eletrônicos (PIX/Cartões não contam na gaveta).
   - Fechamento cego: operador digita a contagem física; sistema compara e exibe a quebra/diferença de caixa.
   - Histórico completo de turnos anteriores.
6. **Administração do Cardápio (`ProductsAdminPage.tsx` / `/cardapio`):**
   - Cadastro e edição de produtos, categorias, preços e ativação/inativação.
7. **Administração de Cartões (`CardsAdminPage.tsx` / `/cartoes`):**
   - Cadastro individual ou em lote (ex: gerar cartões de 1 a 100 de uma vez).
   - Bloqueio e desbloqueio físico de cartões.
8. **Operadores e Acessos (`UsersAdminPage.tsx` / `/usuarios`):**
   - Criação de novos operadores e administradores, troca de senhas e inativação de contas.
9. **Relatórios e Auditoria (`ReportsAdminPage.tsx` / `/relatorios`):**
   - Extrato consolidado de faturamento por método de pagamento e cancelamentos.
   - Ranking dos produtos líderes de vendas.
   - Trilha de auditoria imutável com operador, ação, data/hora, IP e justificativas.

---

### 5. Validação e Testes Automatizados Executados

#### A. Backend (Pytest):
- **Framework:** Pytest 8.4.2 em Python 3.12.10
- **Resultado:** **20 testes executados e aprovados (100% de sucesso)**
  - `test_auth.py` (5 testes): Login, validação de senha criptografada BCrypt, perfil JWT, autorização RBAC para criação de usuários.
  - `test_cards_and_orders.py` (4 testes): Cadastro de cartão único, consulta de situação, abertura e bloqueio de abertura duplicada, cartões bloqueados.
  - `test_products_and_history.py` (2 testes): Preservação de snapshot histórico do preço unitário após alterações no cardápio e impedimento de lançar produto inativo.
  - `test_order_consumption.py` (2 testes): Lançamento idempotente e cancelamento com justificativa auditada.
  - `test_split_equal.py` (2 testes): Divisão de centavos determinística (100 / 3 -> 33,34 + 33,33 + 33,33 = 100,00).
  - `test_split_by_items.py` (2 testes): Atribuição fracionária e bloqueio de soma de frações > 1.000.
  - `test_payments_and_closure.py` (2 testes): Pagamentos combinados, cálculo de troco, bloqueio de pagamento acima do saldo, liberação do cartão para reuso limpo.
  - `test_cash_session.py` (1 teste): Fundo de troco, segregação de dinheiro físico vs PIX/Cartões, sangria/suprimento e reconciliação.

#### B. Frontend (Vitest & Vite Build):
- **Framework:** Vitest 1.6.1 + React Testing Library + JSDOM
- **Resultado:** **19 testes executados e aprovados (100% de sucesso)**
  - `src/utils/formatters.test.ts` (11 testes): Formatação exata em padrão BRL (`R$ 10,50`), tratamento de zero, nulos, strings decimais e padding de cartões (`001`, `042`, `100`).
  - `src/test/formatters.test.ts` (6 testes): Testes complementares de internacionalização monetária.
  - `src/test/LoginPage.test.tsx` (2 testes): Renderização dos componentes da tela de login e preenchimento automático das contas de demonstração.
- **Vite Production Build:** Compilação concluída com sucesso e zero erros (`tsc && vite build` -> 1505 módulos transformados com bundle otimizado em `dist/`).

---

### 6. Como Rodar no Windows

1. Para iniciar todos os serviços (Banco, API e Frontend):
   ```cmd
   iniciar.bat
   ```
   - O sistema detecta o IP da máquina na rede local automaticamente e informa a URL para outros terminais/smartphones acessarem (ex: `http://192.168.1.15:8080`).
   - Primeiro acesso com usuário: `admin` e senha: `Admin@Comandas2026!`.

2. Para parar os containers preservando 100% dos dados:
   ```cmd
   parar.bat
   ```

3. Para gerar backup imediato da base de dados:
   ```cmd
   backup.bat
   ```
   - Gera um arquivo `.sql` compactado com carimbo de data/hora na pasta `backups\`.

4. Para restaurar um backup:
   ```cmd
   restaurar.bat backups\backup_YYYYMMDD_HHMMSS.sql
   ```

