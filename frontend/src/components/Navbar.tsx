import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  UtensilsCrossed, 
  Search, 
  ShieldCheck, 
  UserCircle, 
  Coins, 
  AlertCircle,
  QrCode
} from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, cashSession } = useAuth();
  const navigate = useNavigate();
  const [quickCard, setQuickCard] = useState('');
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCard.trim()) return;

    setSearching(true);
    setErrorMsg('');
    try {
      const res = await api.queryCard(quickCard.trim());
      if (res.current_order_id) {
        // Comanda já está aberta -> vai para o PDV ou Pagamento
        navigate(`/pdv?card=${res.card.number}`);
      } else if (res.can_open_order) {
        // Cartão livre -> direciona para o PDV para abrir
        navigate(`/pdv?card=${res.card.number}`);
      } else {
        setErrorMsg(res.reason || 'Cartão indisponível.');
      }
      setQuickCard('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao consultar cartão.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
          <UtensilsCrossed className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
            Comanda<span className="text-amber-400 font-black">PRO</span>
          </span>
          <span className="text-[10px] text-slate-400 block -mt-1 uppercase tracking-wider font-semibold">
            Restaurante & PDV
          </span>
        </div>
      </div>

      {/* Quick Card / Barcode Scanner Search */}
      <form onSubmit={handleQuickLookup} className="hidden md:flex items-center relative w-72 lg:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Digitar ou Bipar Cartão (ex: 001)..."
          value={quickCard}
          onChange={(e) => setQuickCard(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/80 rounded-lg pl-9 pr-10 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
        />
        <button
          type="submit"
          disabled={searching}
          className="absolute right-1.5 px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition"
        >
          {searching ? '...' : 'Ir'}
        </button>
        {errorMsg && (
          <div className="absolute -bottom-8 left-0 right-0 bg-rose-950/90 border border-rose-800 text-rose-300 text-xs px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 z-40">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Right side: Cash Status & User Profile */}
      <div className="flex items-center gap-3">
        {/* Cash Register Status Indicator */}
        <button
          onClick={() => navigate('/caixa')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
            cashSession && cashSession.status === 'open'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-amber-950/60 border-amber-800/80 text-amber-300 hover:bg-amber-900/60'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Caixa:</span>
          <span className="font-bold">
            {cashSession && cashSession.status === 'open' ? 'Aberto' : 'Fechado'}
          </span>
          {cashSession && cashSession.status === 'open' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            {user?.role === 'admin' ? (
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            ) : (
              <UserCircle className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
              {user?.full_name}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              {user?.role === 'admin' ? 'Administrador' : 'Operador'}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sair do Sistema"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
