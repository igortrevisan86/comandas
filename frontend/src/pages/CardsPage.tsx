import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card, Order } from '../types';
import { 
  CreditCard, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Ban, 
  RefreshCw, 
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const CardsPage: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [activeOrders, setActiveOrders] = useState<Record<number, Order>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'in_use' | 'blocked'>('all');
  const [search, setSearch] = useState('');
  
  // Modal de Abertura
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [selectedCardNum, setSelectedCardNum] = useState('');
  const [notes, setNotes] = useState('');
  const [opening, setOpening] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsData, ordersData] = await Promise.all([
        api.getCards(0, 300),
        api.getActiveOrders(),
      ]);
      setCards(cardsData);

      const ordersByCardId: Record<number, Order> = {};
      ordersData.forEach((order) => {
        ordersByCardId[order.card_id] = order;
      });
      setActiveOrders(ordersByCardId);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000); // auto-sync
    return () => clearInterval(interval);
  }, []);

  const handleOpenOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardNum) return;
    setOpening(true);
    setErrorMsg('');
    try {
      const newOrder = await api.openOrder(selectedCardNum, notes);
      setOpenModalOpen(false);
      setNotes('');
      // Direciona imediatamente para o PDV com a nova comanda aberta
      navigate(`/pdv?card=${newOrder.card_number_snapshot}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao abrir comanda.');
    } finally {
      setOpening(false);
    }
  };

  const handleCardClick = (card: Card) => {
    if (card.status === 'available') {
      setSelectedCardNum(card.number);
      setOpenModalOpen(true);
    } else if (card.status === 'in_use') {
      navigate(`/pdv?card=${card.number}`);
    }
  };

  // Filtragem
  const filteredCards = cards.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch = c.number.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const availableCount = cards.filter((c) => c.status === 'available').length;
  const inUseCount = cards.filter((c) => c.status === 'in_use').length;
  const blockedCount = cards.filter((c) => c.status === 'blocked').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-amber-500" />
            <span>Painel Geral de Comandas Físicas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe o estado de cada cartão do restaurante, abra novas comandas ou acesse o consumo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Atualizar dados"
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setSelectedCardNum('');
              setOpenModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Nova Comanda</span>
          </button>
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === 'all'
              ? 'bg-slate-800/80 border-slate-700 ring-2 ring-slate-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
          }`}
        >
          <div className="text-xs font-bold text-slate-400 uppercase">Total de Cartões</div>
          <div className="text-2xl font-black text-white mt-1">{cards.length}</div>
        </button>

        <button
          onClick={() => setFilter('available')}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === 'available'
              ? 'bg-emerald-950/60 border-emerald-800 ring-2 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
          }`}
        >
          <div className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Livres / Prontos</span>
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{availableCount}</div>
        </button>

        <button
          onClick={() => setFilter('in_use')}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === 'in_use'
              ? 'bg-sky-950/60 border-sky-800 ring-2 ring-sky-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
          }`}
        >
          <div className="text-xs font-bold text-sky-400 uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Em Atendimento</span>
          </div>
          <div className="text-2xl font-black text-sky-300 mt-1">{inUseCount}</div>
        </button>

        <button
          onClick={() => setFilter('blocked')}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === 'blocked'
              ? 'bg-rose-950/60 border-rose-800 ring-2 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
          }`}
        >
          <div className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5" />
            <span>Bloqueados</span>
          </div>
          <div className="text-2xl font-black text-rose-300 mt-1">{blockedCount}</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar por número do cartão (ex: 005)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {loading && cards.length === 0 ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Carregando cartões...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/60">
          Nenhum cartão encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredCards.map((card) => {
            const activeOrder = activeOrders[card.id];

            let cardStyles = '';
            let statusBadge = '';

            if (card.status === 'available') {
              cardStyles = 'border-emerald-900/40 hover:border-emerald-500/80 bg-emerald-950/20 hover:bg-emerald-950/40';
              statusBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            } else if (card.status === 'in_use') {
              cardStyles = 'border-sky-900/50 hover:border-sky-500/80 bg-sky-950/25 hover:bg-sky-950/45';
              statusBadge = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
            } else {
              cardStyles = 'border-rose-900/40 bg-rose-950/10 opacity-75';
              statusBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            }

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ${cardStyles}`}
              >
                {/* Top Number & Badge */}
                <div className="flex items-start justify-between">
                  <div className="font-mono font-black text-2xl text-white tracking-wider group-hover:scale-105 transition-transform">
                    {card.number}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusBadge}`}
                  >
                    {card.status === 'available'
                      ? 'Livre'
                      : card.status === 'in_use'
                      ? 'Em Uso'
                      : 'Bloqueado'}
                  </span>
                </div>

                {/* Bottom Order Info or Action hint */}
                <div className="mt-4 pt-2 border-t border-slate-800/60">
                  {card.status === 'in_use' && activeOrder ? (
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Consumo:</div>
                      <div className="text-sm font-extrabold text-sky-300">
                        R$ {Number(activeOrder.total_amount).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {activeOrder.notes || 'Sem observações'}
                      </div>
                    </div>
                  ) : card.status === 'available' ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Toque p/ Abrir</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-rose-400 font-medium truncate">
                      {card.notes || 'Bloqueado'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Abrir Nova Comanda */}
      <Modal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Abertura de Comanda"
      >
        <form onSubmit={handleOpenOrderSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Número do Cartão Físico
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: 001 ou bipe o código de barras"
              value={selectedCardNum}
              onChange={(e) => setSelectedCardNum(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Observação / Identificação do Cliente (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Mesa 12, Balcão, Cliente João"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={opening || !selectedCardNum}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {opening ? 'Abrindo...' : 'Confirmar e Abrir Comanda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
