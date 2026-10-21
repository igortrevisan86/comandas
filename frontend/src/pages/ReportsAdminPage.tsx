import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuditLog, FinancialReport } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL, formatDateTime } from '../utils/formatters';
import {
  BarChart3,
  ShieldCheck,
  Calendar,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  Ban,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

export const ReportsAdminPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'financial' | 'audit'>('financial');

  // Financial Report State
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchFinancial = async () => {
    try {
      setLoadingFinancial(true);
      const data = await api.getFinancialSummary(startDate || undefined, endDate || undefined);
      setReport(data);
    } catch (err: any) {
      toast.error('Erro ao carregar relatório financeiro.');
    } finally {
      setLoadingFinancial(false);
    }
  };

  const fetchAudit = async () => {
    try {
      setLoadingAudit(true);
      const data = await api.getAuditLogs(actionFilter || undefined, 0, 100);
      setAuditLogs(data);
    } catch (err: any) {
      toast.error('Erro ao carregar trilha de auditoria.');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchFinancial();
    fetchAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Relatórios e Auditoria de Segurança
          </h1>
          <p className="text-sm text-slate-400">
            Faturamento, métodos de pagamento, produtos líderes e rastreamento imutável de ações
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'financial') fetchFinancial();
              else fetchAudit();
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('financial')}
          className={`pb-3 transition flex items-center gap-2 border-b-2 ${
            activeTab === 'financial'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Extrato Financeiro & Vendas</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 transition flex items-center gap-2 border-b-2 ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Trilha de Auditoria Imutável</span>
        </button>
      </div>

      {/* TAB 1: Financial Report */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Filtrar por Período:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <span className="text-xs text-slate-500">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <button
                onClick={fetchFinancial}
                disabled={loadingFinancial}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
              >
                Filtrar
              </button>
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setTimeout(fetchFinancial, 0);
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition"
              >
                Limpar Período
              </button>
            )}
          </div>

          {loadingFinancial || !report ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Consolidando métricas financeiras...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Financial KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Faturamento Total Recebido
                  </span>
                  <div className="text-3xl font-black text-emerald-400 mt-2">
                    {formatBRL(report.total_revenue)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {report.orders_summary.total} comanda(s) no total
                  </div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recebimento via PIX
                  </span>
                  <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-400" />
                    <span>{formatBRL(report.payments_by_method.pix)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Instantâneo sem taxa de maquininha</div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dinheiro em Espécie
                  </span>
                  <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <span>{formatBRL(report.payments_by_method.cash)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Entradas físicas na gaveta</div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cartões (Débito e Crédito)
                  </span>
                  <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    <span>
                      {formatBRL(
                        report.payments_by_method.debit + report.payments_by_method.credit
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Débito: {formatBRL(report.payments_by_method.debit)} • Crédito:{' '}
                    {formatBRL(report.payments_by_method.credit)}
                  </div>
                </div>
              </div>

              {/* Secondary Metrics & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cancellations & Orders Summary (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                    <h3 className="font-bold text-sm text-slate-100">Situação das Comandas</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Total Aberto no Período:</span>
                        <span className="font-bold text-white">{report.orders_summary.total}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Comandas Finalizadas:</span>
                        <span className="font-bold text-emerald-400">{report.orders_summary.closed}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Atualmente em Aberto:</span>
                        <span className="font-bold text-amber-400">{report.orders_summary.open}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-5 shadow-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <Ban className="w-4 h-4" />
                      <span>Perdas e Cancelamentos</span>
                    </div>
                    <div className="text-2xl font-black text-rose-400">
                      {formatBRL(report.cancellations.total_amount)}
                    </div>
                    <p className="text-[11px] text-rose-300">
                      {report.cancellations.count} item(ns) cancelado(s) com justificativa registrada.
                    </p>
                  </div>
                </div>

                {/* Top Products Table (8 cols) */}
                <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      Produtos Líderes de Consumo (Mais Vendidos)
                    </h3>
                  </div>

                  {report.top_products.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum item faturado no período.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/50">
                          <tr>
                            <th className="py-2.5 px-3">Ranking</th>
                            <th className="py-2.5 px-3">Produto</th>
                            <th className="py-2.5 px-3 text-center">Quantidade Vendida</th>
                            <th className="py-2.5 px-3 text-right">Faturamento Gerado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {report.top_products.map((tp, idx) => (
                            <tr key={idx} className="hover:bg-slate-850/50 transition">
                              <td className="py-2.5 px-3 font-black text-amber-400">
                                #{idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-200">
                                {tp.name}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-white">
                                {tp.quantity} un.
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                                {formatBRL(tp.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Immutable Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="Filtrar por ação (ex: ITEM_CANCELLED)..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition uppercase font-mono"
              />
            </div>

            <button
              onClick={fetchAudit}
              disabled={loadingAudit}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
            >
              Aplicar Filtro
            </button>
          </div>

          {loadingAudit ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Carregando trilha de auditoria...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/50">
                  <tr>
                    <th className="py-3 px-3">Data e Hora</th>
                    <th className="py-3 px-3">Operador</th>
                    <th className="py-3 px-3">Ação</th>
                    <th className="py-3 px-3">Entidade</th>
                    <th className="py-3 px-3">IP</th>
                    <th className="py-3 px-3">Detalhes / Justificativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLogs.map((log) => {
                    const isAlert =
                      log.action.includes('CANCEL') || log.action.includes('DRAIN');
                    return (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200">
                          {log.username}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                              isAlert
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                          {log.ip_address || 'local'}
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={log.details || ''}>
                          {log.details || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
