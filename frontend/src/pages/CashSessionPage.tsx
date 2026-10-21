import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CashMovement, CashSession } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatBRL, formatDateTime } from '../utils/formatters';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  CreditCard,
  QrCode,
  Printer,
  X,
} from 'lucide-react';

export const CashSessionPage: React.FC = () => {
  const { cashSession, refreshCashSession } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<CashSession[]>([]);

  // Open Session Form
  const [initialCash, setInitialCash] = useState<string>('100.00');
  const [openNotes, setOpenNotes] = useState<string>('');

  // Cash Movement (Sangria / Suprimento) Modal
  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    type: 'supply' | 'drain';
  }>({ isOpen: false, type: 'drain' });
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  // Close Session Modal (Blind Close)
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closedResult, setClosedResult] = useState<CashSession | null>(null);

  const loadHistory = async () => {
    try {
      const history = await api.getCashSessions(0, 15);
      setSessionHistory(history);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    refreshCashSession();
    loadHistory();
  }, []);

  // Handle Open Cash
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(initialCash);
    if (isNaN(val) || val < 0) {
      toast.error('Informe um valor inicial válido.');
      return;
    }

    try {
      setLoading(true);
      await api.openCashSession(val, openNotes || undefined);
      toast.success('Turno de caixa aberto com sucesso!');
      await refreshCashSession();
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir caixa.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Cash Movement (Sangria / Suprimento)
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashSession) return;

    const val = parseFloat(movementAmount);
    if (isNaN(val) || val <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (!movementReason.trim()) {
      toast.error('A justificativa é obrigatória.');
      return;
    }

    try {
      setLoading(true);
      await api.createCashMovement(
        cashSession.id,
        movementModal.type,
        val,
        movementReason.trim()
      );
      toast.success(
        `${movementModal.type === 'drain' ? 'Sangria' : 'Suprimento'} de ${formatBRL(val)} efetuado!`
      );
      setMovementModal({ isOpen: false, type: 'drain' });
      setMovementAmount('');
      setMovementReason('');
      await refreshCashSession();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Blind Close
  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashSession) return;

    const val = parseFloat(countedCash);
    if (isNaN(val) || val < 0) {
      toast.error('Informe o valor físico contado.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.closeCashSession(cashSession.id, val, closeNotes || undefined);
      toast.success('Caixa fechado com sucesso!');
      setClosedResult(res);
      setCloseModalOpen(false);
      setCountedCash('');
      setCloseNotes('');
      await refreshCashSession();
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fechar caixa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            Controle de Frente de Caixa
          </h1>
          <p className="text-sm text-slate-400">
            Abertura, conferência cega, sangrias, suprimentos e histórico de turnos
          </p>
        </div>

        {cashSession && cashSession.status === 'open' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMovementModal({ isOpen: true, type: 'supply' })}
              className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Suprimento (Entrada)</span>
            </button>

            <button
              onClick={() => setMovementModal({ isOpen: true, type: 'drain' })}
              className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Sangria (Retirada)</span>
            </button>

            <button
              onClick={() => setCloseModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Lock className="w-4 h-4" />
              <span>Fechar Caixa</span>
            </button>
          </div>
        )}
      </div>

      {/* Case 1: Caixa Fechado -> Form para Abrir */}
      {(!cashSession || cashSession.status === 'closed') && (
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Nenhum Turno de Caixa Aberto</h2>
            <p className="text-xs text-slate-400 mt-1">
              Informe o fundo de troco em cédulas/moedas para iniciar os recebimentos no ponto de venda.
            </p>
          </div>

          <form onSubmit={handleOpenCash} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Fundo de Troco Inicial (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.00"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                placeholder="100.00"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-lg font-black text-white focus:outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Observações de Abertura (Opcional)
              </label>
              <input
                type="text"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Ex: Turno da manhã, notas de 10 e moedas..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Abrir Caixa Agora</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Case 2: Caixa Aberto -> Painel de Controle */}
      {cashSession && cashSession.status === 'open' && (
        <div className="space-y-6">
          {/* Active Session Info Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  Turno #{cashSession.id} Ativo • Aberto por {cashSession.opened_by_name || 'Operador'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Iniciado em: {formatDateTime(cashSession.opened_at)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Comandas Abertas em Circulação
              </span>
              <div className="text-lg font-black text-amber-400">
                {cashSession.open_orders_count} comanda(s)
              </div>
            </div>
          </div>

          {/* Money Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Fundo Inicial */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fundo de Troco Inicial
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {formatBRL(cashSession.initial_cash)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Cédulas na abertura</div>
            </div>

            {/* 2. Dinheiro em Caixa (Vendas Dinheiro) */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Entradas em Dinheiro Físico
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {formatBRL(cashSession.total_cash_payments)}
              </div>
              <div className="text-[11px] text-emerald-300 mt-1">Pagamentos em espécie</div>
            </div>

            {/* 3. Saldo Físico Esperado na Gaveta */}
            <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Dinheiro Físico Esperado
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {formatBRL(cashSession.expected_cash)}
              </div>
              <div className="text-[11px] text-amber-300 mt-1">
                (Fundo + Espécie + Suprimentos - Sangrias)
              </div>
            </div>

            {/* 4. Recebimentos Eletrônicos (Separados) */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                Eletrônicos (PIX / Cartões)
              </span>
              <div className="text-2xl font-black text-sky-400 mt-1">
                {formatBRL(cashSession.total_electronic_payments)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                PIX: {formatBRL(cashSession.total_pix_payments)} • Cartões:{' '}
                {formatBRL(
                  (parseFloat(String(cashSession.total_debit_payments)) || 0) +
                    (parseFloat(String(cashSession.total_credit_payments)) || 0)
                )}
              </div>
            </div>
          </div>

          {/* Cash Movements Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                Movimentações de Caixa (Sangrias e Suprimentos)
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                {cashSession.movements.length} registro(s)
              </span>
            </div>

            {cashSession.movements.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma sangria ou suprimento realizado neste turno até o momento.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {cashSession.movements.map((m) => {
                  const isDrain = m.movement_type === 'drain';
                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isDrain
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                          }`}
                        >
                          {isDrain ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">
                            {isDrain ? 'Sangria (Retirada)' : 'Suprimento (Reforço)'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Motivo: {m.reason} • por {m.user_name || 'Operador'} •{' '}
                            {formatDateTime(m.created_at)}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-black text-sm ${
                          isDrain ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isDrain ? '-' : '+'} {formatBRL(m.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History of Past Sessions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Histórico Recente de Turnos de Caixa
          </h3>
          <button
            onClick={loadHistory}
            className="text-xs text-slate-400 hover:text-amber-400 transition"
          >
            Atualizar
          </button>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Nenhum histórico disponível.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/50">
                <tr>
                  <th className="py-2.5 px-3">Turno</th>
                  <th className="py-2.5 px-3">Abertura</th>
                  <th className="py-2.5 px-3">Fechamento</th>
                  <th className="py-2.5 px-3">Fundo Inicial</th>
                  <th className="py-2.5 px-3">Esperado</th>
                  <th className="py-2.5 px-3">Contado</th>
                  <th className="py-2.5 px-3">Diferença (Quebra)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sessionHistory.map((s) => {
                  const diff = s.difference !== null && s.difference !== undefined ? parseFloat(String(s.difference)) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-200">#{s.id}</td>
                      <td className="py-2.5 px-3 text-slate-400">{formatDateTime(s.opened_at)}</td>
                      <td className="py-2.5 px-3 text-slate-400">{formatDateTime(s.closed_at)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{formatBRL(s.initial_cash)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{formatBRL(s.expected_cash)}</td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {s.final_cash_counted !== null ? formatBRL(s.final_cash_counted) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        {s.difference !== null ? (
                          <span
                            className={
                              diff === 0
                                ? 'text-emerald-400'
                                : diff > 0
                                ? 'text-sky-400'
                                : 'text-rose-400'
                            }
                          >
                            {diff > 0 ? '+' : ''}
                            {formatBRL(diff)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            s.status === 'open'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.status === 'open' ? 'Aberto' : 'Fechado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sangria / Suprimento Modal */}
      {movementModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                {movementModal.type === 'drain' ? (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-rose-400" />
                    <span>Registrar Sangria (Retirada de Dinheiro)</span>
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                    <span>Registrar Suprimento (Reforço de Troco)</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setMovementModal({ isOpen: false, type: 'drain' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Valor da Movimentação (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-base font-black text-white focus:outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Justificativa / Motivo <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={
                    movementModal.type === 'drain'
                      ? 'Ex: Recolhimento para cofre de segurança / Pagamento de fornecedor...'
                      : 'Ex: Troca de notas de 50 por notas de 5 e moedas...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModal({ isOpen: false, type: 'drain' })}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2 rounded-xl text-xs font-black shadow-lg transition ${
                    movementModal.type === 'drain'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  {loading ? 'Salvando...' : 'Confirmar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blind Close Modal (Fechamento Cego de Caixa) */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Fechamento Cego de Caixa</span>
              </h3>
              <button onClick={() => setCloseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Realize a contagem física das cédulas e moedas presentes na gaveta. O sistema
              comparará automaticamente com as entradas e sangrias para calcular a quebra de caixa.
            </p>

            <form onSubmit={handleCloseSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Valor Físico Total Contado na Gaveta (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-lg font-black text-white focus:outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observações do Fechamento (Opcional)
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ex: Turno encerrado sem incidentes..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {loading ? 'Processando Fechamento...' : 'Encerrar Turno de Caixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Closing Summary Report Modal with Print Option */}
      {closedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Extrato de Fechamento de Caixa</span>
              </h3>
              <button onClick={() => setClosedResult(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Turno de Caixa:</span>
                <span className="font-bold text-slate-200">#{closedResult.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Fundo de Troco Inicial:</span>
                <span className="font-bold text-slate-200">{formatBRL(closedResult.initial_cash)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Vendas Dinheiro:</span>
                <span className="font-bold text-emerald-400">{formatBRL(closedResult.total_cash_payments)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Dinheiro Físico Esperado:</span>
                <span className="font-bold text-amber-400">{formatBRL(closedResult.expected_cash)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Dinheiro Físico Contado:</span>
                <span className="font-black text-white">{formatBRL(closedResult.final_cash_counted)}</span>
              </div>
              <div className="flex justify-between py-1.5 pt-2">
                <span className="font-bold text-slate-300">Diferença / Quebra:</span>
                <span
                  className={`font-black text-sm ${
                    parseFloat(String(closedResult.difference || 0)) === 0
                      ? 'text-emerald-400'
                      : parseFloat(String(closedResult.difference || 0)) > 0
                      ? 'text-sky-400'
                      : 'text-rose-400'
                  }`}
                >
                  {parseFloat(String(closedResult.difference || 0)) > 0 ? '+' : ''}
                  {formatBRL(closedResult.difference)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClosedResult(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
