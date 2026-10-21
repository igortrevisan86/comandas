import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Card } from '../types';
import { useToast } from '../context/ToastContext';
import { formatCardNumber, formatDateTime } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Layers,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  ShieldAlert,
  Sparkles,
  Edit3,
  Unlock,
  Lock,
} from 'lucide-react';

export const CardsAdminPage: React.FC = () => {
  const toast = useToast();

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'in_use' | 'blocked'>('all');

  // Batch Generation Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchStart, setBatchStart] = useState<number>(31);
  const [batchEnd, setBatchEnd] = useState<number>(60);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // Single Card Create Modal
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [singleNum, setSingleNum] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [creatingSingle, setCreatingSingle] = useState(false);

  // Edit Notes Modal
  const [editNotesModalOpen, setEditNotesModalOpen] = useState(false);
  const [selectedCardForNotes, setSelectedCardForNotes] = useState<Card | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Block/Unblock Confirm Modal
  const [confirmToggleBlock, setConfirmToggleBlock] = useState<{
    open: boolean;
    card: Card | null;
  }>({ open: false, card: null });

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await api.getCards(0, 500);
      setCards(data);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar lista de cartões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchSearch =
        c.number.toLowerCase().includes(search.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [cards, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = cards.length;
    const available = cards.filter((c) => c.status === 'available').length;
    const inUse = cards.filter((c) => c.status === 'in_use').length;
    const blocked = cards.filter((c) => c.status === 'blocked').length;
    return { total, available, inUse, blocked };
  }, [cards]);

  // Handle Batch Generation
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchStart <= 0 || batchEnd < batchStart) {
      toast.warning('O número inicial deve ser positivo e menor ou igual ao final.');
      return;
    }
    const count = batchEnd - batchStart + 1;
    if (count > 200) {
      toast.warning('Gere no máximo 200 cartões por lote.');
      return;
    }

    try {
      setGeneratingBatch(true);
      const res = await api.batchCreateCards(batchStart, batchEnd);
      toast.success(res.message || `${res.created_count} cartões criados com sucesso!`);
      setBatchModalOpen(false);
      await loadCards();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar lote de cartões.');
    } finally {
      setGeneratingBatch(false);
    }
  };

  // Handle Single Card Create
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = singleNum.trim();
    if (!cleanNum) {
      toast.warning('Informe o número do cartão.');
      return;
    }
    try {
      setCreatingSingle(true);
      await api.createCard(cleanNum, singleNotes.trim() || undefined);
      toast.success(`Cartão #${cleanNum} cadastrado com sucesso!`);
      setSingleModalOpen(false);
      setSingleNum('');
      setSingleNotes('');
      await loadCards();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar cartão.');
    } finally {
      setCreatingSingle(false);
    }
  };

  // Handle Toggle Block / Unblock
  const handleToggleBlock = async () => {
    const card = confirmToggleBlock.card;
    if (!card) return;

    if (card.status === 'in_use') {
      toast.warning('Cartões com comanda ativa não podem ser bloqueados antes do pagamento.');
      setConfirmToggleBlock({ open: false, card: null });
      return;
    }

    const nextStatus = card.status === 'blocked' ? 'available' : 'blocked';
    try {
      await api.updateCard(card.id, { status: nextStatus });
      toast.info(`Cartão #${card.number} agora está ${nextStatus === 'blocked' ? 'Bloqueado' : 'Disponível'}.`);
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, status: nextStatus } : c))
      );
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status do cartão.');
    } finally {
      setConfirmToggleBlock({ open: false, card: null });
    }
  };

  // Handle Save Notes
  const handleOpenEditNotes = (card: Card) => {
    setSelectedCardForNotes(card);
    setNotesInput(card.notes || '');
    setEditNotesModalOpen(true);
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForNotes) return;
    try {
      setSavingNotes(true);
      await api.updateCard(selectedCardForNotes.id, { notes: notesInput.trim() });
      toast.success(`Observação do cartão #${selectedCardForNotes.number} atualizada.`);
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCardForNotes.id ? { ...c, notes: notesInput.trim() } : c
        )
      );
      setEditNotesModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar anotação do cartão.');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-400" />
            Gestão do Inventário de Cartões
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle os cartões físicos reutilizáveis (001, 002, etc.), gere novos lotes e bloqueie cartões extraviados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCards}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setSingleModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition border border-slate-700 shadow-sm"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Novo Individual</span>
          </button>

          <button
            onClick={() => {
              // Preload next batch start based on current highest card
              const numbers = cards
                .map((c) => parseInt(c.number, 10))
                .filter((n) => !isNaN(n));
              const highest = numbers.length > 0 ? Math.max(...numbers) : 30;
              setBatchStart(highest + 1);
              setBatchEnd(highest + 30);
              setBatchModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar Lote de Cartões</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Físico
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-300">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Disponíveis
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.available}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Em Atendimento
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.inUse}</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Bloqueados
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">{stats.blocked}</div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar cartão por número ou nota (ex: 015)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'available'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Disponíveis ({stats.available})
          </button>
          <button
            onClick={() => setStatusFilter('in_use')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'in_use'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Em Uso ({stats.inUse})
          </button>
          <button
            onClick={() => setStatusFilter('blocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'blocked'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bloqueados ({stats.blocked})
          </button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium">
            Carregando inventário de cartões...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            Nenhum cartão encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredCards.map((c) => {
              const isAvailable = c.status === 'available';
              const isInUse = c.status === 'in_use';
              const isBlocked = c.status === 'blocked';

              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between group ${
                    isAvailable
                      ? 'bg-slate-950/60 border-emerald-500/30 hover:border-emerald-500/70'
                      : isInUse
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                      : 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                  }`}
                >
                  <div>
                    {/* Top Status Dot */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          isAvailable
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isInUse
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {isAvailable ? 'Livre' : isInUse ? 'Em Uso' : 'Bloqueado'}
                      </span>

                      {/* Block/Unblock Button */}
                      {!isInUse && (
                        <button
                          onClick={() => setConfirmToggleBlock({ open: true, card: c })}
                          className={`p-1 rounded-lg text-xs transition ${
                            isBlocked
                              ? 'text-emerald-400 hover:bg-emerald-500/20'
                              : 'text-rose-400 hover:bg-rose-500/20'
                          }`}
                          title={isBlocked ? 'Desbloquear cartão' : 'Bloquear cartão'}
                        >
                          {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Card Number */}
                    <div className="text-center py-2">
                      <div className="text-2xl font-black font-mono tracking-wider text-white">
                        {formatCardNumber(c.number)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                        Cartão Físico
                      </div>
                    </div>
                  </div>

                  {/* Notes & Actions Footer */}
                  <div className="pt-2 border-t border-slate-800/80 mt-2 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]" title={c.notes || 'Sem observação'}>
                      {c.notes || '-'}
                    </span>
                    <button
                      onClick={() => handleOpenEditNotes(c)}
                      className="p-1 rounded text-slate-500 hover:text-amber-400 transition"
                      title="Editar anotação"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Lote de Cartões */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Gerar Lote de Cartões Físicos"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBatchGenerate} className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Informe a faixa numérica sequencial desejada. Cartões já existentes no intervalo serão ignorados com segurança sem duplicação.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Número Inicial
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                required
                value={batchStart}
                onChange={(e) => setBatchStart(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-center text-base focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Número Final
              </label>
              <input
                type="number"
                min={batchStart}
                max={9999}
                required
                value={batchEnd}
                onChange={(e) => setBatchEnd(parseInt(e.target.value) || batchStart)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-center text-base focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
            Total a ser processado: <strong>{Math.max(0, batchEnd - batchStart + 1)}</strong> cartões (ex: #{formatCardNumber(batchStart)} até #{formatCardNumber(batchEnd)}).
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setBatchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={generatingBatch}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              {generatingBatch ? 'Gerando Lote...' : 'Gerar Cartões'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar Cartão Individual */}
      <Modal
        isOpen={singleModalOpen}
        onClose={() => setSingleModalOpen(false)}
        title="Cadastrar Cartão Individual"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSingle} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Número / Código do Cartão *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 099 ou VIP-1"
              value={singleNum}
              onChange={(e) => setSingleNum(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Cartão reservado para área externa"
              value={singleNotes}
              onChange={(e) => setSingleNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setSingleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingSingle}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              {creatingSingle ? 'Cadastrando...' : 'Cadastrar Cartão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Notas */}
      <Modal
        isOpen={editNotesModalOpen}
        onClose={() => setEditNotesModalOpen(false)}
        title={`Anotações do Cartão #${selectedCardForNotes?.number || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Observações do Cartão
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Cartão com código de barras desbotado ou reservado para eventos."
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditNotesModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingNotes}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              {savingNotes ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Block/Unblock */}
      <ConfirmModal
        isOpen={confirmToggleBlock.open}
        title={
          confirmToggleBlock.card?.status === 'blocked'
            ? `Desbloquear Cartão #${confirmToggleBlock.card?.number}`
            : `Bloquear Cartão #${confirmToggleBlock.card?.number}`
        }
        message={
          confirmToggleBlock.card?.status === 'blocked'
            ? `Deseja retornar o cartão #${confirmToggleBlock.card?.number} para o status DISPONÍVEL? Ele poderá ser entregue a novos clientes.`
            : `Deseja BLOQUEAR o cartão #${confirmToggleBlock.card?.number}? Ele não poderá ser aberto no PDV até que seja liberado novamente.`
        }
        confirmText={
          confirmToggleBlock.card?.status === 'blocked' ? 'Desbloquear' : 'Bloquear Cartão'
        }
        isDestructive={confirmToggleBlock.card?.status !== 'blocked'}
        onConfirm={handleToggleBlock}
        onCancel={() => setConfirmToggleBlock({ open: false, card: null })}
      />
    </div>
  );
};
