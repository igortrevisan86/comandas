import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Order, OrderSplit, Payment, PaymentMethod } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL, formatCardNumber, formatDateTime } from '../utils/formatters';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Banknote,
  CreditCard,
  QrCode,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Layers,
  Percent,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [cardNumber, setCardNumber] = useState(searchParams.get('card') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Active Tab: 'payment' | 'equal_split' | 'item_split'
  const [activeTab, setActiveTab] = useState<'payment' | 'equal_split' | 'item_split'>('payment');

  // Payment Form
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [selectedSplitId, setSelectedSplitId] = useState<number | undefined>(undefined);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Equal Split Form
  const [equalParticipants, setEqualParticipants] = useState<number>(2);
  const [generatingSplit, setGeneratingSplit] = useState(false);

  // Modals
  const [cancellingPayment, setCancellingPayment] = useState<Payment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [closingOrder, setClosingOrder] = useState(false);

  // Load Order
  const fetchOrder = async (card: string) => {
    if (!card.trim()) return;
    try {
      setLoadingOrder(true);
      const queryRes = await api.queryCard(card.trim());
      if (queryRes.current_order_id) {
        const orderData = await api.getOrder(queryRes.current_order_id);
        setOrder(orderData);
        // Pre-fill amount with remaining balance
        const bal = typeof orderData.balance === 'string' ? parseFloat(orderData.balance) : orderData.balance;
        setAmount(bal > 0 ? bal.toFixed(2) : '0.00');
        setAmountReceived(bal > 0 ? bal.toFixed(2) : '0.00');
      } else {
        setOrder(null);
        toast.info(queryRes.reason || 'Não há comanda aberta para este cartão.');
      }
    } catch (err: any) {
      setOrder(null);
      toast.error(err.message || 'Erro ao consultar comanda.');
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    const cardParam = searchParams.get('card');
    if (cardParam) {
      setCardNumber(cardParam);
      fetchOrder(cardParam);
    }
  }, [searchParams]);

  const handleCardSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim()) return;
    setSearchParams({ card: cardNumber.trim() });
    fetchOrder(cardNumber.trim());
  };

  // Change calculation for cash
  const changeAmount = useMemo(() => {
    if (selectedMethod !== 'cash') return 0;
    const payVal = parseFloat(amount) || 0;
    const recVal = parseFloat(amountReceived) || 0;
    return recVal > payVal ? recVal - payVal : 0;
  }, [selectedMethod, amount, amountReceived]);

  // Submit Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const payVal = parseFloat(amount);
    if (isNaN(payVal) || payVal <= 0) {
      toast.error('Informe um valor válido de pagamento.');
      return;
    }

    const currentBalance = typeof order.balance === 'string' ? parseFloat(order.balance) : order.balance;
    if (payVal > currentBalance + 0.001) {
      toast.warning('O valor do pagamento não pode ser maior que o saldo devedor.');
      return;
    }

    try {
      setProcessingPayment(true);
      const recVal = selectedMethod === 'cash' ? parseFloat(amountReceived) || payVal : undefined;

      await api.createPayment({
        order_id: order.id,
        method: selectedMethod,
        amount: payVal,
        amount_received: recVal,
        split_id: selectedSplitId,
        notes: paymentNotes || undefined,
      });

      toast.success(`Pagamento de ${formatBRL(payVal)} registrado com sucesso!`);
      setSelectedSplitId(undefined);
      setPaymentNotes('');

      // Refresh order
      const refreshed = await api.getOrder(order.id);
      setOrder(refreshed);
      const newBal = typeof refreshed.balance === 'string' ? parseFloat(refreshed.balance) : refreshed.balance;
      setAmount(newBal > 0 ? newBal.toFixed(2) : '0.00');
      setAmountReceived(newBal > 0 ? newBal.toFixed(2) : '0.00');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao registrar pagamento.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Cancel Payment
  const handleCancelPayment = async (reason?: string) => {
    if (!order || !cancellingPayment || !reason) return;

    try {
      await api.cancelPayment(cancellingPayment.id, reason);
      toast.success('Pagamento cancelado e estornado com sucesso.');
      const refreshed = await api.getOrder(order.id);
      setOrder(refreshed);
      const newBal = typeof refreshed.balance === 'string' ? parseFloat(refreshed.balance) : refreshed.balance;
      setAmount(newBal.toFixed(2));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao estornar pagamento.');
    } finally {
      setCancellingPayment(null);
    }
  };

  // Close Order (Encerrar Comanda)
  const handleCloseOrder = async () => {
    if (!order) return;
    const bal = typeof order.balance === 'string' ? parseFloat(order.balance) : order.balance;
    if (bal > 0.001) {
      toast.error('Não é possível encerrar a comanda com saldo pendente.');
      return;
    }

    try {
      setClosingOrder(true);
      const closed = await api.closeOrder(order.id);
      setOrder(closed);
      toast.success(`Comanda do Cartão #${closed.card_number_snapshot} encerrada e cartão liberado!`);
      setShowReceiptModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao encerrar comanda.');
    } finally {
      setClosingOrder(false);
    }
  };

  // Equal Split calculation
  const equalSplitPreview = useMemo(() => {
    if (!order) return [];
    const total = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount;
    const totalCents = Math.round(total * 100);
    const n = Math.max(1, equalParticipants);
    const baseCents = Math.floor(totalCents / n);
    const remainder = totalCents % n;

    const parts = [];
    for (let i = 0; i < n; i++) {
      const cents = i < remainder ? baseCents + 1 : baseCents;
      parts.push({
        person: `Participante ${i + 1}`,
        amount: cents / 100,
      });
    }
    return parts;
  }, [order, equalParticipants]);

  const handleGenerateEqualSplit = async () => {
    if (!order) return;
    try {
      setGeneratingSplit(true);
      const splits = await api.splitEqual(order.id, equalParticipants);
      toast.success(`Divisão em ${splits.length} parcelas gerada com sucesso!`);
      const refreshed = await api.getOrder(order.id);
      setOrder(refreshed);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao dividir comanda.');
    } finally {
      setGeneratingSplit(false);
    }
  };

  const handlePaySplit = (split: OrderSplit) => {
    const remaining =
      (typeof split.target_amount === 'string' ? parseFloat(split.target_amount) : split.target_amount) -
      (typeof split.paid_amount === 'string' ? parseFloat(split.paid_amount) : split.paid_amount);
    setSelectedSplitId(split.id);
    setAmount(remaining.toFixed(2));
    setAmountReceived(remaining.toFixed(2));
    setActiveTab('payment');
    toast.info(`Preenchido para pagamento da parcela de ${split.participant_name}.`);
  };

  const balanceNumber = order ? (typeof order.balance === 'string' ? parseFloat(order.balance) : order.balance) : 0;
  const isPaidOff = order ? balanceNumber <= 0.001 : false;

  return (
    <div className="space-y-6">
      {/* Top Bar: Card Lookup */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleCardSearch} className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Localizar Comanda para Pagamento
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Cartão (ex: 001)..."
                className="bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-base font-black text-white placeholder-slate-600 focus:outline-none w-44 font-mono"
              />
              <button
                type="submit"
                disabled={loadingOrder}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                {loadingOrder ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        </form>

        {order && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Conferência</span>
            </button>

            {order.status === 'open' && (
              <button
                type="button"
                onClick={handleCloseOrder}
                disabled={!isPaidOff || closingOrder}
                className={`px-5 py-2 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 ${
                  isPaidOff
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title={isPaidOff ? 'Encerrar comanda e liberar cartão' : 'Saldo precisa estar zerado'}
              >
                <Check className="w-4 h-4" />
                <span>Encerrar Comanda</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!order ? (
        <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800">
          <Banknote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhuma comanda selecionada</h3>
          <p className="text-xs text-slate-400 mt-1">
            Digite o número do cartão acima para carregar o saldo e opções de pagamento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Financial Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cartão & Situação
              </span>
              <div className="text-xl font-black text-white mt-1">
                Cartão #{formatCardNumber(order.card_number_snapshot)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Status: <span className="font-bold text-amber-400 uppercase">{order.status === 'open' ? 'Aberta' : 'Fechada'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Consumido
              </span>
              <div className="text-xl font-black text-white mt-1">
                {formatBRL(order.total_amount)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {order.items.filter((i) => i.status === 'active').length} itens ativos
              </div>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Total Já Pago
              </span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {formatBRL(order.total_paid)}
              </div>
              <div className="text-xs text-emerald-300 mt-0.5">
                {order.payments.filter((p) => p.status === 'completed').length} recebimento(s)
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border transition ${
                isPaidOff
                  ? 'bg-emerald-950/40 border-emerald-800/80'
                  : 'bg-amber-950/40 border-amber-800/80'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isPaidOff ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                Saldo Devedor
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  isPaidOff ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {formatBRL(order.balance)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isPaidOff ? 'Conta totalmente quitada!' : 'Aguardando quitação'}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-6 text-sm font-bold">
            <button
              onClick={() => setActiveTab('payment')}
              className={`pb-3 transition flex items-center gap-2 border-b-2 ${
                activeTab === 'payment'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Receber Pagamento</span>
            </button>

            <button
              onClick={() => setActiveTab('equal_split')}
              className={`pb-3 transition flex items-center gap-2 border-b-2 ${
                activeTab === 'equal_split'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Divisão Igual (Racha Conta)</span>
              {order.splits.length > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                  {order.splits.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: Payment Registration */}
          {activeTab === 'payment' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Payment Form (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-amber-400" />
                    Registrar Pagamento
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione a forma de pagamento e informe o valor recebido.
                  </p>
                </div>

                {/* Method selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'pix', label: 'PIX', icon: QrCode },
                    { id: 'cash', label: 'Dinheiro', icon: Banknote },
                    { id: 'debit', label: 'Débito', icon: CreditCard },
                    { id: 'credit', label: 'Crédito', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m.id as PaymentMethod)}
                        className={`p-3 rounded-2xl border font-bold text-xs flex flex-col items-center gap-2 transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* PIX Mock Info */}
                {selectedMethod === 'pix' && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-2 bg-white rounded-xl shrink-0">
                      <QrCode className="w-16 h-16 text-slate-950" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>QR Code Dinâmico PIX</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Chave PIX: restaurante@comandapro.local
                      </p>
                      <div className="font-mono text-[10px] text-amber-400 truncate max-w-xs bg-slate-900 p-1 rounded">
                        00020126580014br.gov.bcb.pix0136comanda-pro-ref-{order.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {selectedSplitId && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                      <span>Liquidando Parcela Vinculada à Divisão</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSplitId(undefined)}
                        className="text-[11px] underline hover:text-white"
                      >
                        Desvincular
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Valor a Pagar (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-base font-black text-white focus:outline-none transition font-mono"
                      />
                    </div>

                    {selectedMethod === 'cash' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                          Valor Entregue pelo Cliente (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-base font-black text-white focus:outline-none transition font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cash Quick Bill Buttons & Troco Highlight */}
                  {selectedMethod === 'cash' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <span className="text-xs text-slate-400 font-semibold">Atalhos:</span>
                        {[20, 50, 100, 200].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAmountReceived(val.toFixed(2))}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                          >
                            R$ {val}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAmountReceived(amount)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg transition"
                        >
                          Valor Exato
                        </button>
                      </div>

                      {/* Troco Box */}
                      <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300">Troco a Devolver:</span>
                        <span className="text-xl font-black text-emerald-400">
                          {formatBRL(changeAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Observação / Código de Autorização (Opcional)
                    </label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Ex: NSU 123456 / Pago por Carlos..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processingPayment || isPaidOff}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition disabled:opacity-50"
                  >
                    {processingPayment ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>Confirmar Pagamento ({formatBRL(parseFloat(amount) || 0)})</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Payment History and Reversals (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Pagamentos Registrados ({order.payments.length})
                  </h3>
                </div>

                {order.payments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum pagamento registrado até o momento.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {order.payments.map((p) => {
                      const isCompleted = p.status === 'completed';
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            isCompleted
                              ? 'bg-slate-950 border-slate-800'
                              : 'bg-rose-950/20 border-rose-900/40 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-2">
                              <span className="uppercase text-amber-400">
                                {p.method === 'cash' ? 'Dinheiro' : p.method.toUpperCase()}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                  isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {isCompleted ? 'Efetivado' : 'Cancelado'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatDateTime(p.created_at)}
                              {p.user_name && ` • por ${p.user_name}`}
                              {p.change_amount && parseFloat(String(p.change_amount)) > 0
                                ? ` • Troco: ${formatBRL(p.change_amount)}`
                                : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-sm text-white">
                              {formatBRL(p.amount)}
                            </span>

                            {isCompleted && order.status === 'open' && (
                              <button
                                type="button"
                                onClick={() => setCancellingPayment(p)}
                                className="p-1 text-slate-400 hover:text-rose-400 transition"
                                title="Estornar pagamento"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Equal Bill Split (Racha Conta) */}
          {activeTab === 'equal_split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Split Generator (6 cols) */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    Divisão Igualitária Determinística
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Divide o consumo igualmente com distribuição determinística dos centavos restantes
                    (sem erros de arredondamento).
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Número de Pessoas na Mesa
                  </label>
                  <div className="flex items-center gap-3">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setEqualParticipants(num)}
                        className={`w-12 h-12 rounded-2xl border font-black text-sm transition ${
                          equalParticipants === num
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Box */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between pb-2 border-b border-slate-800">
                    <span>Prévia da Divisão ({equalParticipants} pessoas):</span>
                    <span className="text-amber-400 font-extrabold">{formatBRL(order.total_amount)}</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {equalSplitPreview.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{item.person}</span>
                        <span className="font-bold text-slate-200">{formatBRL(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateEqualSplit}
                  disabled={generatingSplit || order.status !== 'open'}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider transition disabled:opacity-50"
                >
                  {generatingSplit ? 'Gerando...' : 'Criar Parcelas de Cobrança'}
                </button>
              </div>

              {/* Created Splits (6 cols) */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Parcelas Registradas da Comanda ({order.splits.length})
                  </h3>
                </div>

                {order.splits.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma divisão cadastrada ainda para esta comanda.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {order.splits.map((s) => {
                      const isPaid = s.status === 'paid';
                      const isPartial = s.status === 'partial';

                      return (
                        <div
                          key={s.id}
                          className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-2">
                              <span>{s.participant_name}</span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                  isPaid
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isPartial
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isPaid ? 'Pago' : isPartial ? 'Parcial' : 'Pendente'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Pago: {formatBRL(s.paid_amount)} de {formatBRL(s.target_amount)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">
                              {formatBRL(s.target_amount)}
                            </span>

                            {!isPaid && order.status === 'open' && (
                              <button
                                type="button"
                                onClick={() => handlePaySplit(s)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-md shadow-emerald-600/20"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Pagar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Reversal Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancellingPayment}
        title="Estornar Pagamento"
        message={`Deseja realmente estornar o pagamento de ${formatBRL(
          cancellingPayment?.amount
        )} (${cancellingPayment?.method.toUpperCase()})? O saldo devedor da comanda será restabelecido e a ação auditada.`}
        confirmText="Confirmar Estorno"
        cancelText="Voltar"
        requireReason={true}
        reasonPlaceholder="Ex: Erro no lançamento / Cliente trocou forma de pagamento..."
        isDestructive={true}
        onConfirm={handleCancelPayment}
        onCancel={() => setCancellingPayment(null)}
      />

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        order={order}
        onClose={() => setShowReceiptModal(false)}
        title={order?.status === 'closed' ? 'Cupom de Encerramento' : 'Conferência de Comanda'}
      />
    </div>
  );
};
