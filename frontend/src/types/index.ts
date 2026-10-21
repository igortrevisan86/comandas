export type UserRole = 'admin' | 'operator';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type CardStatus = 'available' | 'in_use' | 'blocked';

export interface Card {
  id: number;
  number: string;
  status: CardStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardQueryResponse {
  card: Card;
  current_order_id?: string | null;
  can_open_order: boolean;
  reason?: string | null;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  category_id: number;
  category_name?: string | null;
  price: string | number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'open' | 'closed' | 'cancelled';
export type OrderItemStatus = 'active' | 'cancelled';

export interface OrderItem {
  id: number;
  order_id: string;
  product_id?: number | null;
  product_name_snapshot: string;
  unit_price_snapshot: string | number;
  quantity: string | number;
  subtotal: string | number;
  status: OrderItemStatus;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  created_by_name?: string | null;
}

export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit';
export type PaymentStatus = 'completed' | 'cancelled';

export interface Payment {
  id: number;
  order_id: string;
  split_id?: number | null;
  cash_session_id?: number | null;
  user_id: number;
  user_name?: string | null;
  method: PaymentMethod;
  amount: string | number;
  amount_received?: string | number | null;
  change_amount: string | number;
  status: PaymentStatus;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  reference_code?: string | null;
  created_at: string;
}

export type SplitType = 'equal' | 'by_item';
export type SplitStatus = 'pending' | 'partial' | 'paid';

export interface OrderSplitItem {
  id: number;
  order_item_id: number;
  product_name?: string | null;
  quantity_fraction: string | number;
  assigned_amount: string | number;
}

export interface OrderSplit {
  id: number;
  order_id: string;
  participant_name: string;
  split_type: SplitType;
  target_amount: string | number;
  paid_amount: string | number;
  status: SplitStatus;
  created_at: string;
  assigned_items: OrderSplitItem[];
}

export interface Order {
  id: string;
  card_id: number;
  card_number_snapshot: string;
  status: OrderStatus;
  opened_by_name?: string | null;
  closed_by_name?: string | null;
  opened_at: string;
  closed_at?: string | null;
  total_amount: string | number;
  total_paid: string | number;
  balance: string | number;
  notes?: string | null;
  items: OrderItem[];
  payments: Payment[];
  splits: OrderSplit[];
}

export type CashSessionStatus = 'open' | 'closed';
export type MovementType = 'supply' | 'drain';

export interface CashMovement {
  id: number;
  session_id: number;
  movement_type: MovementType;
  amount: string | number;
  reason: string;
  user_name?: string | null;
  created_at: string;
}

export interface CashSession {
  id: number;
  opened_by_name?: string | null;
  closed_by_name?: string | null;
  initial_cash: string | number;
  final_cash_counted?: string | number | null;
  expected_cash?: string | number | null;
  difference?: string | number | null;
  status: CashSessionStatus;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
  movements: CashMovement[];
  total_cash_payments: string | number;
  total_pix_payments: string | number;
  total_debit_payments: string | number;
  total_credit_payments: string | number;
  total_electronic_payments: string | number;
  open_orders_count: number;
}

export interface FinancialReport {
  period: { start?: string | null; end?: string | null };
  total_revenue: number;
  payments_by_method: {
    cash: number;
    pix: number;
    debit: number;
    credit: number;
  };
  orders_summary: {
    total: number;
    open: number;
    closed: number;
  };
  cancellations: {
    count: number;
    total_amount: number;
  };
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}
