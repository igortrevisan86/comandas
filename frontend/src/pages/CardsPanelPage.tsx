import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card, Order } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL, formatCardNumber } from '../utils/formatters';
import {
  CreditCard,
  Search,
  PlusCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  Ban,
  ShoppingCart,
  Banknote,
  Filter,
} from 'lucide-react';

export const CardsPanelPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [cards, setCards] = useState<Card[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'in_use' | 'blocked'>('all');
  const [openingCard, setOpeningCard] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cardsData, ordersData] = await Promise.all([
        api.getCards(0, 300),
        api.getActiveOrders(),
      ]);
      setCards(cardsData);
      setActiveOrders(ordersData);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar cartões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map card_id -> active Order
  const ordersMap = useMemo(() => {
    const map = new Map<number, Order>();
    activeOrders.forEach((o) => map.set(o.card_id, o));
    return map;
  }, [activeOrders]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchSearch =
        c.number.toLowerCase().includes(search.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;
      if (statusFilter === 'all') return true;
      return c.status === statusFilter;
    });
  }, [cards, search, statusFilter]);

  const stats = useMemo(() => {
    const total = cards.length;
    const available = cards.filter((c) => c.status === 'available').length;
    const inUse = cards.filter((c) => c.status === 'in_use').length;
    const blocked = cards.filter((c) => c.status === 'blocked').length;
    return { total, available, inUse, blocked };
  }, [cards]);

  const handleOpenOrder = async (cardNumber: string) => {
    try {
      setOpeningCard(cardNumber);
      await api.openOrder(cardNumber);
      toast.success(`Comanda aberta com sucesso para o Cartão #${cardNumber}!`);
      navigate(`/pdv?card=${cardNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir comanda.');
    } finally {
      setOpeningCard(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-400" />
            Painel de Cartões Físicos
          </h1>
          <p className="text-sm text-slate-400">
            Gerenciamento em tempo real das comandas numeradas em circulação
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          Atualizar Painel
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.total}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total de Cartões
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{stats.available}</div>
            <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Disponíveis / Livres
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{stats.inUse}</div>
            <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Em Atendimento
            </div>
          </div>
        </div>

        <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{stats.blocked}</div>
            <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
              Bloqueados
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número (ex: 001)..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filtro:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              statusFilter === 'available'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Livres ({stats.available})
          </button>
          <button
            onClick={() => setStatusFilter('in_use')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              statusFilter === 'in_use'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Em Uso ({stats.inUse})
          </button>
          <button
            onClick={() => setStatusFilter('blocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              statusFilter === 'blocked'
                ? 'bg-rose-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bloqueados ({stats.blocked})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm mt-3 font-semibold">Carregando cartões e comandas...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhum cartão encontrado</h3>
          <p className="text-xs text-slate-400 mt-1">
            Tente outro termo de busca ou altere os filtros acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {filteredCards.map((card) => {
            const activeOrder = ordersMap.get(card.id);
            const isAvailable = card.status === 'available';
            const isInUse = card.status === 'in_use';
            const isBlocked = card.status === 'blocked';

            return (
              <div
                key={card.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative group ${
                  isInUse
                    ? 'bg-amber-950/20 border-amber-800/80 hover:border-amber-500/80 hover:shadow-lg hover:shadow-amber-500/10'
                    : isAvailable
                    ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-600/80 hover:shadow-lg hover:shadow-emerald-500/10'
                    : 'bg-rose-950/20 border-rose-900/60 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-2xl font-black tracking-tight text-white">
                      #{formatCardNumber(card.number)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isInUse
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isAvailable
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isInUse ? 'Em Uso' : isAvailable ? 'Livre' : 'Bloqueado'}
                    </span>
                  </div>

                  {card.notes && (
                    <p className="text-[11px] text-slate-400 truncate mb-2" title={card.notes}>
                      {card.notes}
                    </p>
                  )}

                  {isInUse && activeOrder && (
                    <div className="mt-2 pt-2 border-t border-amber-900/40 space-y-1">
                      <div className="text-[10px] text-slate-400">Total Consumo:</div>
                      <div className="text-base font-extrabold text-amber-300">
                        {formatBRL(activeOrder.total_amount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {activeOrder.items?.filter((i) => i.status === 'active').length || 0} itens
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-1.5">
                  {isAvailable && (
                    <button
                      type="button"
                      disabled={openingCard === card.number}
                      onClick={() => handleOpenOrder(card.number)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      {openingCard === card.number ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Abrir Comanda</span>
                        </>
                      )}
                    </button>
                  )}

                  {isInUse && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/pdv?card=${card.number}`)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1"
                        title="Lançar itens"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>PDV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/checkout?card=${card.number}`)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1"
                        title="Ir para pagamento"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Pagar</span>
                      </button>
                    </div>
                  )}

                  {isBlocked && (
                    <div className="text-[11px] text-rose-400 text-center font-semibold py-1">
                      Cartão Retido
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
