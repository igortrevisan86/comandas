import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Category, Order, Product } from '../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Ban, 
  ArrowRight, 
  Check, 
  Clock, 
  AlertTriangle,
  Send
} from 'lucide-react';
import { Modal } from '../components/Modal';

interface CartItem {
  product: Product;
  quantity: number;
}

export const PosOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cardParam = searchParams.get('card') || '';
  const [cardNumber, setCardNumber] = useState(cardParam);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Cardápio
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submittingItems, setSubmittingItems] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  // Cancelamento de item
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{ id: number; name: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Active view tab on right side: 'cart' | 'history'
  const [rightTab, setRightTab] = useState<'cart' | 'history'>('cart');

  // Load Menu
  useEffect(() => {
    async function loadMenu() {
      try {
        const [cats, prods] = await Promise.all([
          api.getCategories(),
          api.getProducts(undefined, undefined),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Erro ao carregar cardápio:', err);
      }
    }
    loadMenu();
  }, []);

  // Load Order by Card Number
  const fetchOrderByCard = async (num: string) => {
    if (!num.trim()) {
      setCurrentOrder(null);
      return;
    }
    setLoadingOrder(true);
    try {
      const order = await api.getOrderByCard(num.trim());
      setCurrentOrder(order);
      if (order && order.items.length > 0 && cart.length === 0) {
        // Se já tem histórico e o carrinho tá vazio, podemos alternar para historico se desejar
      }
    } catch (err) {
      console.error(err);
      setCurrentOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    if (cardParam) {
      setCardNumber(cardParam);
      fetchOrderByCard(cardParam);
    }
  }, [cardParam]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setRightTab('cart');
  };

  const updateQuantity = (productId: number, delta: number) => {
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

  const cartTotal = cart.reduce(
    (acc, item) => acc + Number(item.product.price) * item.quantity,
    0
  );

  // Submit cart items to order
  const handleConfirmOrderItems = async () => {
    if (!currentOrder || cart.length === 0) return;

    setSubmittingItems(true);
    setOrderSuccessMsg('');
    const idempotencyKey = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const updated = await api.addItemsToOrder(currentOrder.id, itemsPayload, idempotencyKey);
      setCurrentOrder(updated);
      setCart([]);
      setRightTab('history');
      setOrderSuccessMsg('Itens lançados com sucesso na comanda!');
      setTimeout(() => setOrderSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Falha ao lançar itens.');
    } finally {
      setSubmittingItems(false);
    }
  };

  // Cancel item handler
  const handleConfirmCancelItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder || !itemToCancel || !cancelReason.trim()) return;

    setCancelling(true);
    setCancelError('');
    try {
      const updated = await api.cancelOrderItem(currentOrder.id, itemToCancel.id, cancelReason);
      setCurrentOrder(updated);
      setCancelModalOpen(false);
      setItemToCancel(null);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.message || 'Falha ao cancelar item.');
    } finally {
      setCancelling(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === null || p.category_id === selectedCategory;
    const matchesSearch =
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()));
    return matchesCat && matchesSearch && p.is_active;
  });

  const activeOrderItems = currentOrder?.items.filter((i) => i.status === 'active') || [];
  const cancelledOrderItems = currentOrder?.items.filter((i) => i.status === 'cancelled') || [];

  return (
    <div className="space-y-4">
      {/* Top Banner: Card Selector & Order Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Card Input */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cartão:
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchOrderByCard(cardNumber);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ex: 001"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-24 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-base text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Order Details Badge */}
        {currentOrder ? (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="px-3 py-1 rounded-xl bg-sky-950/60 border border-sky-800 text-sky-300 font-bold">
              Comanda #{currentOrder.card_number_snapshot} - Aberta
            </div>
            {currentOrder.notes && (
              <span className="text-slate-400">Obs: {currentOrder.notes}</span>
            )}
            <div className="text-right">
              <span className="text-slate-400 mr-2">Consumo Atual:</span>
              <span className="text-lg font-black text-amber-400">
                R$ {Number(currentOrder.total_amount).toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => navigate(`/checkout?card=${currentOrder.card_number_snapshot}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <span>Ir p/ Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Nenhuma comanda aberta para este cartão. Abra uma nova no painel de cartões.</span>
          </div>
        )}
      </div>

      {orderSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{orderSuccessMsg}</span>
        </div>
      )}

      {/* Main Split Layout: Menu Grid vs Cart & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Section: Menu & Products (col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Categories Pills & Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar item no cardápio..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Category horizontal pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === null
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos os Itens
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="p-4 bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/60 rounded-2xl flex flex-col justify-between cursor-pointer group transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div className="space-y-1">
                  <div className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
                    {product.category_name || 'Cardápio'}
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-base font-black text-amber-400">
                    R$ {Number(product.price).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="p-1.5 bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Cart / Order History (col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* Tabs selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setRightTab('cart')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                rightTab === 'cart'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Novo Lançamento ({cart.length})</span>
            </button>
            <button
              onClick={() => setRightTab('history')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                rightTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Consumo da Comanda ({activeOrderItems.length})</span>
            </button>
          </div>

          {/* TAB 1: CARRINHO ATUAL */}
          {rightTab === 'cart' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[440px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    Itens a Lançar
                  </span>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    Toque nos itens do cardápio à esquerda para adicionar ao pedido.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[11px] text-amber-400/90 font-medium">
                            R$ {(Number(item.product.price) * item.quantity).toFixed(2)}
                          </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Total a Adicionar:</span>
                  <span className="text-xl font-black text-amber-400">
                    R$ {cartTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleConfirmOrderItems}
                  disabled={!currentOrder || cart.length === 0 || submittingItems}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {!currentOrder
                      ? 'Selecione uma Comanda Aberta'
                      : submittingItems
                      ? 'Lançando...'
                      : 'Confirmar e Lançar na Comanda'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HISTÓRICO DE CONSUMO DA COMANDA */}
          {rightTab === 'history' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[440px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    Itens Registrados no Banco
                  </span>
                  <span className="text-xs font-extrabold text-amber-400">
                    Total: R$ {currentOrder ? Number(currentOrder.total_amount).toFixed(2) : '0.00'}
                  </span>
                </div>

                {!currentOrder ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    Nenhuma comanda selecionada.
                  </div>
                ) : activeOrderItems.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    Nenhum item consumido ainda nesta comanda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {activeOrderItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {Number(item.quantity).toFixed(0)}x {item.product_name_snapshot}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Unitário: R$ {Number(item.unit_price_snapshot).toFixed(2)} | Subtotal: R${' '}
                            {Number(item.subtotal).toFixed(2)}
                          </div>
                        </div>

                        {/* Cancel button */}
                        <button
                          onClick={() => {
                            setItemToCancel({ id: item.id, name: item.product_name_snapshot });
                            setCancelModalOpen(true);
                          }}
                          title="Estornar / Cancelar item"
                          className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 rounded-lg transition"
                        >
                          Estornar
                        </button>
                      </div>
                    ))}

                    {/* Cancelled items audit list */}
                    {cancelledOrderItems.length > 0 && (
                      <div className="pt-3 border-t border-slate-800/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                          Itens Cancelados:
                        </span>
                        {cancelledOrderItems.map((ci) => (
                          <div
                            key={ci.id}
                            className="p-1.5 text-[10px] text-slate-500 line-through flex justify-between"
                          >
                            <span>{ci.product_name_snapshot}</span>
                            <span>Motivo: {ci.cancellation_reason || 'Cancelado'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Action: Go to Payment */}
              {currentOrder && (
                <div className="pt-3 border-t border-slate-800">
                  <button
                    onClick={() => navigate(`/checkout?card=${currentOrder.card_number_snapshot}`)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                  >
                    <span>Seguir para Pagamento / Divisão</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cancelamento de Item */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Estorno / Cancelamento de Item"
      >
        <form onSubmit={handleConfirmCancelItem} className="space-y-4">
          {cancelError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {cancelError}
            </div>
          )}

          <p className="text-xs text-slate-300">
            Você está cancelando o item:{' '}
            <span className="font-bold text-white">{itemToCancel?.name}</span>. Por razões de
            auditoria e controle de estoque, a justificativa é obrigatória.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Justificativa Obrigatória
            </label>
            <input
              type="text"
              required
              autoFocus
              minLength={3}
              placeholder="Ex: Cliente desistiu antes do preparo"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={cancelling || !cancelReason.trim()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
            >
              {cancelling ? 'Estornando...' : 'Confirmar Estorno'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
