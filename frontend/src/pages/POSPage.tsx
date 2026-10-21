import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Category, Order, OrderItem, Product } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL, formatCardNumber, formatDateTime } from '../utils/formatters';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Ban,
  Printer,
  Banknote,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export const POSPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [cardNumber, setCardNumber] = useState(searchParams.get('card') || '');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [canOpenOrder, setCanOpenOrder] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  // Products and Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Cart / Basket
  const [cart, setCart] = useState<CartItem[]>([]);
  const [launching, setLaunching] = useState(false);

  // Modals
  const [cancellingItem, setCancellingItem] = useState<OrderItem | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const cardInputRef = useRef<HTMLInputElement>(null);

  // Load catalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        const [cats, prods] = await Promise.all([
          api.getCategories(),
          api.getProducts(),
        ]);
        setCategories(cats.filter((c) => c.is_active));
        setProducts(prods.filter((p) => p.is_active));
      } catch (err: any) {
        toast.error('Erro ao carregar cardápio.');
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Check card when parameter changes or search is triggered
  const checkCard = async (num: string) => {
    if (!num.trim()) {
      setActiveOrder(null);
      setCanOpenOrder(false);
      return;
    }

    try {
      setLoadingCard(true);
      const queryRes = await api.queryCard(num.trim());

      if (queryRes.current_order_id) {
        const order = await api.getOrder(queryRes.current_order_id);
        setActiveOrder(order);
        setCanOpenOrder(false);
      } else {
        setActiveOrder(null);
        setCanOpenOrder(queryRes.can_open_order);
        if (!queryRes.can_open_order) {
          toast.warning(queryRes.reason || 'Cartão indisponível.');
        }
      }
    } catch (err: any) {
      setActiveOrder(null);
      setCanOpenOrder(false);
      toast.error(err.message || 'Cartão não encontrado.');
    } finally {
      setLoadingCard(false);
    }
  };

  useEffect(() => {
    const cardParam = searchParams.get('card');
    if (cardParam) {
      setCardNumber(cardParam);
      checkCard(cardParam);
    }
  }, [searchParams]);

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim()) return;
    setSearchParams({ card: cardNumber.trim() });
    checkCard(cardNumber.trim());
  };

  const handleOpenOrder = async () => {
    if (!cardNumber.trim()) return;
    try {
      setLoadingCard(true);
      const order = await api.openOrder(cardNumber.trim());
      setActiveOrder(order);
      setCanOpenOrder(false);
      toast.success(`Comanda aberta para o Cartão #${cardNumber}!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir comanda.');
    } finally {
      setLoadingCard(false);
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    if (!activeOrder) {
      toast.warning('Identifique ou abra uma comanda antes de selecionar itens.');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = typeof item.product.price === 'string' ? parseFloat(item.product.price) : item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [cart]);

  // Launch items to comanda
  const handleLaunchItems = async () => {
    if (!activeOrder || cart.length === 0) return;

    try {
      setLaunching(true);
      const idempotencyKey = `launch_${activeOrder.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = cart.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }));

      const updatedOrder = await api.addItemsToOrder(activeOrder.id, payload, idempotencyKey);
      setActiveOrder(updatedOrder);
      setCart([]);
      toast.success(`${payload.length} item(ns) lançado(s) com sucesso na comanda!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao lançar itens.');
    } finally {
      setLaunching(false);
    }
  };

  // Cancel existing item
  const handleCancelItem = async (reason?: string) => {
    if (!activeOrder || !cancellingItem || !reason) return;

    try {
      const updatedOrder = await api.cancelOrderItem(activeOrder.id, cancellingItem.id, reason);
      setActiveOrder(updatedOrder);
      toast.success(`Item "${cancellingItem.product_name_snapshot}" cancelado com sucesso.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar item.');
    } finally {
      setCancellingItem(null);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, productSearch]);

  const activeItems = useMemo(() => {
    return activeOrder?.items.filter((i) => i.status === 'active') || [];
  }, [activeOrder]);

  const cancelledItems = useMemo(() => {
    return activeOrder?.items.filter((i) => i.status === 'cancelled') || [];
  }, [activeOrder]);

  return (
    <div className="space-y-6">
      {/* Top Bar: Card Scanner and Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Card Search / Barcode form */}
        <form onSubmit={handleCardSubmit} className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Comanda / Cartão Físico
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                ref={cardInputRef}
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Número (ex: 001)..."
                className="bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-base font-black text-white placeholder-slate-600 focus:outline-none w-44 font-mono"
              />
              <button
                type="submit"
                disabled={loadingCard}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                {loadingCard ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        </form>

        {/* Card State Indicators */}
        <div className="w-full lg:w-auto flex flex-wrap items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
          {activeOrder ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] text-slate-400">
                  Cartão #{formatCardNumber(activeOrder.card_number_snapshot)} • Aberto em {formatDateTime(activeOrder.opened_at)}
                </div>
                <div className="text-xl font-black text-amber-400">
                  Consumo: {formatBRL(activeOrder.total_amount)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                  title="Imprimir Pré-Conta"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/checkout?card=${activeOrder.card_number_snapshot}`)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Pagamento / Fechar</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          ) : canOpenOrder ? (
            <div className="flex items-center gap-3">
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cartão Livre para Abertura</span>
              </div>
              <button
                type="button"
                onClick={handleOpenOrder}
                disabled={loadingCard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Comanda Agora</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500/70" />
              <span>Digite ou bipe o número do cartão para iniciar o atendimento</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace: Catalog (Left) + Cart & Launched Items (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products Catalog - 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          {/* Categories & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Pesquisar produto pelo nome..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedCategory === c.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loadingCatalog ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Carregando cardápio...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 rounded-2xl text-left transition-all duration-150 flex flex-col justify-between group active:scale-[0.98] shadow-sm"
                >
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      {product.category_name || 'Cardápio'}
                    </span>
                    <h4 className="font-bold text-slate-100 text-sm group-hover:text-amber-300 transition line-clamp-2">
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm">
                      {formatBRL(product.price)}
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 group-hover:bg-amber-500 text-amber-400 group-hover:text-slate-950 flex items-center justify-center transition">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Basket to launch + Already launched items (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* New Basket (Itens a Lançar) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Novos Itens a Lançar ({cart.length})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-400 hover:text-rose-300 transition"
                >
                  Limpar Cesta
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Clique nos produtos ao lado para adicionar à comanda.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-200 truncate">{item.product.name}</div>
                      <div className="text-slate-400 text-[11px]">
                        {formatBRL(item.product.price)} un.
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, -1)}
                        className="p-1 hover:text-rose-400 text-slate-400 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, 1)}
                        className="p-1 hover:text-amber-400 text-slate-400 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-black text-amber-400 shrink-0 w-16 text-right">
                      {formatBRL(
                        (typeof item.product.price === 'string'
                          ? parseFloat(item.product.price)
                          : item.product.price) * item.quantity
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Launch Button & Subtotal */}
            {cart.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400">Subtotal a Lançar:</span>
                  <span className="text-amber-400 text-base">{formatBRL(cartTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchItems}
                  disabled={launching || !activeOrder}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition disabled:opacity-50"
                >
                  {launching ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirmar Lançamento na Comanda</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Already Launched Items in Order */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
                Itens Consumidos na Comanda
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {activeItems.length} ativos
              </span>
            </div>

            {!activeOrder ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Selecione uma comanda ativa para visualizar o consumo.
              </div>
            ) : activeItems.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Nenhum item lançado até o momento nesta comanda.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-slate-200">{item.product_name_snapshot}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.quantity} un. x {formatBRL(item.unit_price_snapshot)}
                        {item.created_by_name && ` • por ${item.created_by_name}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-extrabold text-slate-200">
                        {formatBRL(item.subtotal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCancellingItem(item)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition"
                        title="Cancelar item"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cancelled items notice if any */}
            {cancelledItems.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-rose-400/80 flex items-center justify-between">
                <span>{cancelledItems.length} item(ns) cancelado(s)</span>
                <span className="text-[10px] text-slate-400">Registrado na auditoria</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Cancellation Modal */}
      <ConfirmModal
        isOpen={!!cancellingItem}
        title="Cancelar Item da Comanda"
        message={`Deseja realmente cancelar "${cancellingItem?.product_name_snapshot}" (${formatBRL(
          cancellingItem?.subtotal
        )})? Esta ação deduzirá o valor da conta e ficará gravada na auditoria com justificativa.`}
        confirmText="Confirmar Cancelamento"
        cancelText="Voltar"
        requireReason={true}
        reasonPlaceholder="Ex: Cliente desistiu antes do preparo / Erro de digitação do atendente..."
        isDestructive={true}
        onConfirm={handleCancelItem}
        onCancel={() => setCancellingItem(null)}
      />

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        order={activeOrder}
        onClose={() => setShowReceiptModal(false)}
        title="Prévia / Conferência de Consumo"
      />
    </div>
  );
};
