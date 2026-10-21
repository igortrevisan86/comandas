import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  ShoppingCart,
  Banknote,
  Coins,
  Package,
  Layers,
  Users,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
      isActive
        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
      <div className="space-y-6">
        {/* Operação Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Operação de Atendimento
          </div>
          <nav className="space-y-1">
            <NavLink to="/comandas" className={navItemClass}>
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Painel de Cartões</span>
            </NavLink>

            <NavLink to="/pdv" className={navItemClass}>
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>PDV & Lançamento</span>
            </NavLink>

            <NavLink to="/checkout" className={navItemClass}>
              <Banknote className="w-4 h-4 shrink-0" />
              <span>Pagamento & Divisão</span>
            </NavLink>

            <NavLink to="/caixa" className={navItemClass}>
              <Coins className="w-4 h-4 shrink-0" />
              <span>Frente de Caixa</span>
            </NavLink>
          </nav>
        </div>

        {/* Gestão / Admin Section */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Administração</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded">
                ADMIN
              </span>
            </div>
            <nav className="space-y-1">
              <NavLink to="/cardapio" className={navItemClass}>
                <Package className="w-4 h-4 shrink-0" />
                <span>Cardápio & Produtos</span>
              </NavLink>

              <NavLink to="/cartoes" className={navItemClass}>
                <Layers className="w-4 h-4 shrink-0" />
                <span>Gestão de Cartões</span>
              </NavLink>

              <NavLink to="/usuarios" className={navItemClass}>
                <Users className="w-4 h-4 shrink-0" />
                <span>Operadores do Sistema</span>
              </NavLink>

              <NavLink to="/relatorios" className={navItemClass}>
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Relatórios & Auditoria</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ComandaPRO v1.0</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Ponto de Venda e Gestão de Comandas Físicas com Isolamento Seguro.
        </p>
      </div>
    </aside>
  );
};
