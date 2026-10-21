import {
  AuditLog,
  Card,
  CardQueryResponse,
  CashMovement,
  CashSession,
  Category,
  FinancialReport,
  LoginResponse,
  Order,
  OrderItem,
  OrderSplit,
  Payment,
  Product,
  User,
} from '../types';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('comandas_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'Erro inesperado na requisição.';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || errorDetail;
    } catch {
      // response is not JSON
      errorDetail = `Erro HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(formData: FormData): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Falha ao autenticar.');
    }
    return response.json();
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async getUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(userId: number, userData: Partial<User> & { password?: string }): Promise<User> {
    return request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Cards
  async queryCard(cardNumber: string): Promise<CardQueryResponse> {
    return request<CardQueryResponse>(`/cards/query/${encodeURIComponent(cardNumber)}`);
  },

  async getCards(skip = 0, limit = 200): Promise<Card[]> {
    return request<Card[]>(`/cards?skip=${skip}&limit=${limit}`);
  },

  async createCard(number: string, notes?: string): Promise<Card> {
    return request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify({ number, notes }),
    });
  },

  async batchCreateCards(startNum: number, endNum: number): Promise<{ message: string; created_count: number }> {
    return request<{ message: string; created_count: number }>('/cards/batch', {
      method: 'POST',
      body: JSON.stringify({ start_num: startNum, end_num: endNum }),
    });
  },

  async updateCard(cardId: number, data: Partial<Card>): Promise<Card> {
    return request<Card>(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Categories & Products
  async getCategories(): Promise<Category[]> {
    return request<Category[]>('/categories');
  },

  async createCategory(name: string, description?: string): Promise<Category> {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description, is_active: true }),
    });
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    return request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getProducts(categoryId?: number, search?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId.toString());
    if (search) params.append('search', search);
    const queryString = params.toString();
    return request<Product[]>(`/products${queryString ? `?${queryString}` : ''}`);
  },

  async createProduct(data: { name: string; description?: string; category_id: number; price: number; is_active?: boolean }): Promise<Product> {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    return request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Orders
  async openOrder(cardNumber: string, notes?: string): Promise<Order> {
    return request<Order>('/orders/open', {
      method: 'POST',
      body: JSON.stringify({ card_number: cardNumber, notes }),
    });
  },

  async getActiveOrders(): Promise<Order[]> {
    return request<Order[]>('/orders/active');
  },

  async getOrderByCard(cardNumber: string): Promise<Order | null> {
    return request<Order | null>(`/orders/by-card/${encodeURIComponent(cardNumber)}`);
  },

  async getOrder(orderId: string): Promise<Order> {
    return request<Order>(`/orders/${orderId}`);
  },

  async addItemsToOrder(orderId: string, items: Array<{ product_id: number; quantity: number }>, idempotencyKey?: string): Promise<Order> {
    return request<Order>(`/orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify({ items, idempotency_key: idempotencyKey }),
    });
  },

  async cancelOrderItem(orderId: string, itemId: number, reason: string): Promise<Order> {
    return request<Order>(`/orders/${orderId}/items/${itemId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async closeOrder(orderId: string): Promise<Order> {
    return request<Order>(`/orders/${orderId}/close`, {
      method: 'POST',
    });
  },

  // Splits
  async splitEqual(orderId: string, numParticipants: number): Promise<OrderSplit[]> {
    return request<OrderSplit[]>(`/orders/${orderId}/split/equal`, {
      method: 'POST',
      body: JSON.stringify({ num_participants: numParticipants }),
    });
  },

  async splitByItem(orderId: string, participants: any[]): Promise<OrderSplit[]> {
    return request<OrderSplit[]>(`/orders/${orderId}/split/by-items`, {
      method: 'POST',
      body: JSON.stringify({ participants }),
    });
  },

  // Payments
  async createPayment(paymentData: {
    order_id: string;
    method: string;
    amount: number;
    amount_received?: number;
    split_id?: number;
    notes?: string;
  }): Promise<Payment> {
    return request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  async cancelPayment(paymentId: number, reason: string): Promise<Payment> {
    return request<Payment>(`/payments/${paymentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Cash Session
  async getActiveCashSession(): Promise<CashSession | null> {
    return request<CashSession | null>('/cash/active');
  },

  async openCashSession(initialCash: number, notes?: string): Promise<CashSession> {
    return request<CashSession>('/cash/open', {
      method: 'POST',
      body: JSON.stringify({ initial_cash: initialCash, notes }),
    });
  },

  async closeCashSession(sessionId: number, finalCashCounted: number, notes?: string): Promise<CashSession> {
    return request<CashSession>(`/cash/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ final_cash_counted: finalCashCounted, notes }),
    });
  },

  async createCashMovement(sessionId: number, movementType: 'supply' | 'drain', amount: number, reason: string): Promise<CashMovement> {
    return request<CashMovement>(`/cash/${sessionId}/movement`, {
      method: 'POST',
      body: JSON.stringify({ movement_type: movementType, amount, reason }),
    });
  },

  async getCashSessions(skip = 0, limit = 20): Promise<CashSession[]> {
    return request<CashSession[]>(`/cash/sessions?skip=${skip}&limit=${limit}`);
  },

  // Reports & Audit
  async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return request<FinancialReport>(`/reports/financial${qs ? `?${qs}` : ''}`);
  },

  async getAuditLogs(action?: string, skip = 0, limit = 50): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (action) params.append('action', action);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    return request<AuditLog[]>(`/reports/audit?${params.toString()}`);
  },
};
