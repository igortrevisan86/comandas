import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { AuditLog, FinancialReport } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL, formatDateTime } from '../utils/formatters';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  FileSpreadsheet,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const toast = useToast();

  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Compute ISO dates based on quick filter
  const getDates = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (dateFilter === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (dateFilter === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return { start: d7.toISOString(), end: now.toISOString() };
    } else if (dateFilter === '30days') {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      return { start: d30.toISOString(), end: now.toISOString() };
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      return {
        start: new Date(customStart).toISOString(),
        end: new Date(customEnd).toISOString(),
      };
    }
    return { start: undefined, end: undefined };
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDates();
      const [finData, auditData] = await Promise.all([
        api.getFinancialSummary(start, end),
        api.getAuditLogs(auditActionFilter || undefined, 0, 100),
      ]);
      setFinancial(finData);
      setAuditLogs(auditData);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados de relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [dateFilter, auditActionFilter]);

  // Payment Breakdown Percentages
  const paymentStats = useMemo(() => {
    if (!financial) return [];
    const total = financial.total_revenue || 0;
    const { cash, pix, debit, credit } = financial.payments_by_method;

    return [
      {
        method: 'Pix',
        key: 'pix',
        amount: pix,
        pct: total > 0 ? (pix / total) * 100 : 0,
        icon: QrCode,
        color: 'text-teal-400',
        bg: 'bg-teal-500/10 border-teal-500/20',
        barColor: 'bg-teal-400',
      },
      {
        method: 'Dinheiro',
        key: 'cash',
        amount: cash,
        pct: total > 0 ? (cash / total) * 100 : 0,
        icon: Banknote,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        barColor: 'bg-emerald-400',
      },
      {
        method: 'Cartão de Débito',
        key: 'debit',
        amount: debit,
        pct: total > 0 ? (debit / total) * 100 : 0,
        icon: CreditCard,
        color: 'text-sky-400',
        bg: 'bg-sky-500/10 border-sky-500/20',
        barColor: 'bg-sky-400',
      },
      {
        method: 'Cartão de Crédito',
        key: 'credit',
        amount: credit,
        pct: total > 0 ? (credit / total) * 100 : 0,
        icon: CreditCard,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        barColor: 'bg-amber-400',
      },
    ];
  }, [financial]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(auditSearch.toLowerCase())) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(auditSearch.toLowerCase()));
      return matchSearch;
    });
  }, [auditLogs, auditSearch]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Relatórios Financeiros & Trilha de Auditoria
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Métricas de faturamento em tempo real, fechamentos de turnos, produtos mais consumidos e log de conformidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReportData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition border border-slate-700 shadow-sm"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir Resumo</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Período:
          </span>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              dateFilter === 'today'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              dateFilter === 'yesterday'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ontem
          </button>
          <button
            onClick={() => setDateFilter('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              dateFilter === '7days'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setDateFilter('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              dateFilter === '30days'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Últimos 30 dias
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
            />
            <span className="text-slate-500 text-xs">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
            />
            <button
              onClick={loadReportData}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Faturamento Recebido
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">
            {formatBRL(financial?.total_revenue || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Valores pagos e compensados</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Comandas Atendidas
          </div>
          <div className="text-3xl font-black text-white mt-2 font-mono">
            {financial?.orders_summary.total || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">
              {financial?.orders_summary.closed || 0} encerradas
            </span>
            <span>•</span>
            <span className="text-amber-400 font-bold">
              {financial?.orders_summary.open || 0} abertas
            </span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ticket Médio
          </div>
          <div className="text-3xl font-black text-amber-400 mt-2 font-mono">
            {financial && financial.orders_summary.closed > 0
              ? formatBRL(financial.total_revenue / financial.orders_summary.closed)
              : 'R$ 0,00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Média por comanda encerrada
          </div>
        </div>

        {/* Cancellations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Itens Cancelados
          </div>
          <div className="text-3xl font-black text-rose-400 mt-2 font-mono">
            {financial?.cancellations.count || 0}
          </div>
          <div className="text-[11px] text-rose-300 mt-1 font-semibold">
            {formatBRL(financial?.cancellations.total_amount || 0)} estornados
          </div>
        </div>
      </div>

      {/* Grid: Payment Method Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="font-bold text-base text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span>Recebimentos por Forma de Pagamento</span>
            </div>
            <span className="text-xs text-slate-400">Total 100%</span>
          </div>

          <div className="space-y-4">
            {paymentStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                      <div className={`p-1.5 rounded-lg border ${item.bg}`}>
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span>{item.method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white">
                        {formatBRL(item.amount)}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-400 w-12 text-right">
                        {item.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, item.pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-base text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <span>Top Produtos Mais Vendidos</span>
              </div>
              <span className="text-xs text-slate-400">Por volume financeiro</span>
            </div>

            {financial?.top_products && financial.top_products.length > 0 ? (
              <div className="space-y-2.5">
                {financial.top_products.map((tp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 text-xs font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{tp.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {tp.quantity} unidades servidas
                        </div>
                      </div>
                    </div>

                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {formatBRL(tp.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                Nenhum produto registrado no período selecionado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Trail Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Trilha de Auditoria & Conformidade</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Histórico imutável de ações críticas: aberturas de turnos, sangrias, cancelamentos de itens e pagamentos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar no log..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition w-44"
              />
            </div>

            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
            >
              <option value="">Todas as Ações</option>
              <option value="cancel">Cancelamentos</option>
              <option value="cash">Caixa & Sangrias</option>
              <option value="payment">Pagamentos</option>
              <option value="order">Comandas</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Detalhes / Justificativa</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.map((log) => {
                  const isCancel = log.action.toLowerCase().includes('cancel');
                  const isCash = log.action.toLowerCase().includes('cash');

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-white whitespace-nowrap">
                        @{log.username}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            isCancel
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isCash
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 max-w-xs truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
