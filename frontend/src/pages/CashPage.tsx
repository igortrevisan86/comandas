import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CashSession } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  History,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const CashPage: React.FC = () => {
  const { cashSession, refreshCashSession } = useAuth();
  const [sessionsHistory, setSessionsHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Abertura
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState('100.00');
  const [openNotes, setOpenNotes] = useState('Abertura de turno normal');

  // Modal Movimentação (Suprimento / Sangria)
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'supply' | 'drain'>('supply');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Modal Fechamento
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const list = await api.getCashSessions(0, 15);
      setSessionsHistory(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCashSession();
    loadHistory();
  }, []);

  // Abertura de Caixa
  const handleOpenSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    try {
      await api.openCashSession(Number(initialCashInput) || 0, openNotes);
      await refreshCashSession();
      await loadHistory();
      setOpenModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao abrir caixa.');
    } finally {
      setActionLoading(false);
    }
  };

  // Movimentação (Suprimento / Sangria)
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashSession) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await api.createCashMovement(
        cashSession.id,
        movementType,
        Number(movementAmount) || 0,
        movementReason
      );
      await refreshCashSession();
      await loadHistory();
      setMovementModalOpen(false);
      setMovementAmount('');
      setMovementReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao registrar movimentação.');
    } finally {
      setActionLoading(false);
    }
  };

  // Fechamento de Caixa
  const handleCloseSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashSession) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await api.closeCashSession(cashSession.id, Number(countedCash) || 0, closeNotes);
      await refreshCashSession();
      await loadHistory();
      setCloseModalOpen(false);
      setCountedCash('');
      setCloseNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao fechar caixa.');
    } finally {
      setActionLoading(false);
    }
  };

  const countedNumber = Number(countedCash) || 0;
  const expectedCashNumber = Number(cashSession?.expected_cash || 0);
  const closingDifference = countedNumber - expectedCashNumber;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-amber-500" />
            <span>Frente de Caixa & Controle de Gaveta</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de fundo de troco, suprimentos, sangrias de segurança e conciliação de fechamento cego.
          </p>
        </div>

        {/* Action button: Open or Close */}
        <div>
          {cashSession && cashSession.status === 'open' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMovementType('supply');
                  setMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-600/50 text-emerald-400 font-bold text-xs rounded-xl transition"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Suprimento</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('drain');
                  setMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-rose-600/50 text-rose-400 font-bold text-xs rounded-xl transition"
              >
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <span>Sangria</span>
              </button>

              <button
                onClick={() => {
                  setCountedCash(expectedCashNumber.toFixed(2));
                  setCloseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition"
              >
                <Lock className="w-4 h-4" />
                <span>Encerrar Turno de Caixa</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setOpenModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Sessão de Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Cash Session Details */}
      {cashSession && cashSession.status === 'open' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="font-extrabold text-base text-white">
                  Sessão Ativa #{cashSession.id}
                </span>
                <span className="text-xs text-slate-400 block">
                  Aberta por {cashSession.opened_by_name || 'Operador'} em{' '}
                  {new Date(cashSession.opened_at).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">
                Físico Esperado na Gaveta:
              </span>
              <span className="text-3xl font-black text-emerald-400 font-mono">
                R$ {Number(cashSession.expected_cash).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Fundo Inicial</div>
              <div className="text-base font-extrabold text-white mt-0.5">
                R$ {Number(cashSession.initial_cash).toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
              <div className="text-[10px] font-bold text-emerald-400 uppercase">Vendas Dinheiro</div>
              <div className="text-base font-extrabold text-emerald-300 mt-0.5">
                +R$ {Number(cashSession.total_cash_payments).toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
              <div className="text-[10px] font-bold text-sky-400 uppercase">Vendas Pix</div>
              <div className="text-base font-extrabold text-sky-300 mt-0.5">
                R$ {Number(cashSession.total_pix_payments).toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
              <div className="text-[10px] font-bold text-purple-400 uppercase">Cartões (TEF)</div>
              <div className="text-base font-extrabold text-purple-300 mt-0.5">
                R${' '}
                {(
                  Number(cashSession.total_debit_payments) +
                  Number(cashSession.total_credit_payments)
                ).toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
              <div className="text-[10px] font-bold text-amber-400 uppercase">Suprimentos</div>
              <div className="text-base font-extrabold text-amber-300 mt-0.5">
                +R${' '}
                {cashSession.movements
                  .filter((m) => m.movement_type === 'supply')
                  .reduce((a, b) => a + Number(b.amount), 0)
                  .toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
              <div className="text-[10px] font-bold text-rose-400 uppercase">Sangrias</div>
              <div className="text-base font-extrabold text-rose-300 mt-0.5">
                -R${' '}
                {cashSession.movements
                  .filter((m) => m.movement_type === 'drain')
                  .reduce((a, b) => a + Number(b.amount), 0)
                  .toFixed(2)}
              </div>
            </div>
          </div>

          {/* Movements Timeline */}
          {cashSession.movements.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Movimentações Manuais Desta Sessão
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cashSession.movements.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          m.movement_type === 'supply'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {m.movement_type === 'supply' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-white block">
                          {m.movement_type === 'supply' ? 'Suprimento (Entrada)' : 'Sangria (Retirada)'}
                        </span>
                        <span className="text-[11px] text-slate-400">{m.reason}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-sm ${
                          m.movement_type === 'supply' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.movement_type === 'supply' ? '+' : '-'} R$ {Number(m.amount).toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {new Date(m.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-white">Nenhum Caixa Aberto no Momento</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Abra o caixa informando o valor de troco inicial disponível na gaveta para iniciar a operação.
          </p>
          <button
            onClick={() => setOpenModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition inline-flex items-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Abrir Caixa Agora</span>
          </button>
        </div>
      )}

      {/* Sessions History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <History className="w-4 h-4 text-amber-400" />
            <span>Histórico de Sessões de Caixa Anteriores</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                <th className="py-2.5 px-3">Sessão #</th>
                <th className="py-2.5 px-3">Operador Abertura</th>
                <th className="py-2.5 px-3">Fundo Inicial</th>
                <th className="py-2.5 px-3">Esperado Físico</th>
                <th className="py-2.5 px-3">Apurado na Gaveta</th>
                <th className="py-2.5 px-3">Diferença</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sessionsHistory.map((s) => {
                const diffNum = Number(s.difference || 0);
                return (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold">#{s.id}</td>
                    <td className="py-3 px-3">{s.opened_by_name || 'Operador'}</td>
                    <td className="py-3 px-3 font-mono">R$ {Number(s.initial_cash).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      R$ {Number(s.expected_cash || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {s.final_cash_counted !== null && s.final_cash_counted !== undefined
                        ? `R$ ${Number(s.final_cash_counted).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {s.status === 'closed' ? (
                        diffNum === 0 ? (
                          <span className="text-emerald-400">R$ 0,00 (Exato)</span>
                        ) : diffNum > 0 ? (
                          <span className="text-sky-400">+R$ {diffNum.toFixed(2)} (Sobra)</span>
                        ) : (
                          <span className="text-rose-400">-R$ {Math.abs(diffNum).toFixed(2)} (Quebra)</span>
                        )
                      ) : (
                        <span className="text-amber-400">Em aberto</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          s.status === 'open'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {s.status === 'open' ? 'Aberto' : 'Encerrado'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Abertura de Caixa */}
      <Modal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Abertura de Caixa & Fundo de Troco"
      >
        <form onSubmit={handleOpenSessionSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Fundo de Troco Inicial (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              value={initialCashInput}
              onChange={(e) => setInitialCashInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-black text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Observações
            </label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              {actionLoading ? 'Abrindo...' : 'Confirmar Abertura'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Movimentação (Suprimento ou Sangria) */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={movementType === 'supply' ? 'Registro de Suprimento (Entrada de Troco)' : 'Registro de Sangria (Retirada de Segurança)'}
      >
        <form onSubmit={handleMovementSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Valor da Movimentação (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              autoFocus
              placeholder="Ex: 50.00"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-lg font-black text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Justificativa Obrigatória
            </label>
            <input
              type="text"
              required
              minLength={3}
              placeholder={movementType === 'supply' ? 'Ex: Troco extra de moedas de 1 real' : 'Ex: Retirada de notas de 100 para o cofre'}
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMovementModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading || !movementAmount || !movementReason.trim()}
              className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-lg transition ${
                movementType === 'supply'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              {actionLoading ? 'Registrando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Fechamento de Caixa */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Fechamento & Conferência de Caixa"
      >
        <form onSubmit={handleCloseSessionSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <p className="text-xs text-slate-300">
            Realize a contagem das cédulas e moedas físicas na gaveta e informe o valor total apurado.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Total Físico Contado na Gaveta (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-xl font-black text-white focus:outline-none"
            />
          </div>

          {/* Real-time conference comparison */}
          {countedCash && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Esperado pelo Sistema:</span>
                <span className="font-bold text-white font-mono">
                  R$ {expectedCashNumber.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Contado pelo Operador:</span>
                <span className="font-bold text-white font-mono">
                  R$ {countedNumber.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 font-extrabold text-sm">
                <span>Diferença / Apuração:</span>
                <span
                  className={
                    closingDifference === 0
                      ? 'text-emerald-400'
                      : closingDifference > 0
                      ? 'text-sky-400'
                      : 'text-rose-400'
                  }
                >
                  {closingDifference === 0
                    ? 'R$ 0,00 (Conferência Exata)'
                    : closingDifference > 0
                    ? `+R$ ${closingDifference.toFixed(2)} (Sobra)`
                    : `-R$ ${Math.abs(closingDifference).toFixed(2)} (Quebra / Falta)`}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Observações do Fechamento
            </label>
            <input
              type="text"
              placeholder="Ex: Turno encerrado com sucesso"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCloseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading || !countedCash}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition"
            >
              {actionLoading ? 'Fechando...' : 'Confirmar Fechamento de Caixa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
