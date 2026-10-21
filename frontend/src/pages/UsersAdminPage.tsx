import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Edit2,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const UsersAdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'operator'>('all');

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    full_name: '',
    role: 'operator' as UserRole,
    password: '',
    is_active: true,
  });
  const [creating, setCreating] = useState(false);

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'operator' as UserRole,
    password: '',
    is_active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const operators = users.filter((u) => u.role === 'operator').length;
    const active = users.filter((u) => u.is_active).length;
    return { total, admins, operators, active };
  }, [users]);

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username.trim() || createForm.username.length < 3) {
      toast.warning('O nome de usuário deve ter no mínimo 3 caracteres.');
      return;
    }
    if (!createForm.full_name.trim()) {
      toast.warning('O nome completo é obrigatório.');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.warning('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setCreating(true);
      await api.createUser({
        username: createForm.username.trim().toLowerCase(),
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        password: createForm.password,
        is_active: createForm.is_active,
      });
      toast.success(`Usuário "${createForm.username}" cadastrado com sucesso!`);
      setCreateModalOpen(false);
      setCreateForm({
        username: '',
        full_name: '',
        role: 'operator',
        password: '',
        is_active: true,
      });
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit User
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      password: '',
      is_active: user.is_active,
    });
    setEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.full_name.trim()) {
      toast.warning('O nome completo é obrigatório.');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.warning('Se for alterar a senha, digite pelo menos 6 caracteres.');
      return;
    }

    if (currentUser?.id === editingUser.id && !editForm.is_active) {
      toast.warning('Você não pode desativar seu próprio usuário em sessão.');
      return;
    }

    try {
      setSavingEdit(true);
      const updateData: any = {
        full_name: editForm.full_name.trim(),
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password.trim()) {
        updateData.password = editForm.password.trim();
      }

      await api.updateUser(editingUser.id, updateData);
      toast.success(`Usuário "${editingUser.username}" atualizado com sucesso!`);
      setEditModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar dados do usuário.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Toggle Active
  const handleToggleUserActive = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.warning('Você não pode desativar sua própria conta ativa.');
      return;
    }

    const nextStatus = !user.is_active;
    try {
      await api.updateUser(user.id, { is_active: nextStatus });
      toast.info(`Usuário "${user.username}" ${nextStatus ? 'ativado' : 'desativado'}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
      );
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alternar status do operador.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            Operadores & Acessos do Sistema
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre caixas, operadores e gerentes com permissões de acesso e auditoria vinculada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Operador</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total de Usuários
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Administradores
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.admins}</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Operadores de Caixa
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">{stats.operators}</div>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contas Ativas
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por login ou nome completo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              roleFilter === 'all'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              roleFilter === 'admin'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admins ({stats.admins})
          </button>
          <button
            onClick={() => setRoleFilter('operator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              roleFilter === 'operator'
                ? 'bg-sky-950/60 text-sky-300 border border-sky-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Operadores ({stats.operators})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Nome Completo</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Cadastrado em</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Carregando operadores do sistema...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum operador encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="font-mono text-amber-300">@{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                              Você
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">{u.full_name}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isAdmin
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {isAdmin ? 'Administrador' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleUserActive(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                          } ${isSelf ? 'opacity-70 cursor-not-allowed' : ''}`}
                          title={isSelf ? 'Não é possível desativar a própria conta' : 'Alternar status'}
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Inativo</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition border border-slate-700 shadow-sm"
                          title="Editar Usuário"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Operador */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Cadastrar Novo Operador"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Login de Usuário *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: joao.silva"
              value={createForm.username}
              onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João da Silva Santos"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Perfil de Acesso *
            </label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
            >
              <option value="operator">Operador (Atendimento, PDV & Caixa)</option>
              <option value="admin">Administrador (Acesso Total + Relatórios + Gestão)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Senha de Acesso (mínimo 6 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="is_active_create"
              checked={createForm.is_active}
              onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800"
            />
            <label htmlFor="is_active_create" className="text-sm font-semibold text-slate-300">
              Usuário ativo e autorizado para login
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              {creating ? 'Cadastrando...' : 'Cadastrar Operador'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Operador */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Editar Usuário @${editingUser?.username || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Perfil de Acesso *
            </label>
            <select
              value={editForm.role}
              disabled={currentUser?.id === editingUser?.id}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition text-sm font-semibold disabled:opacity-60"
            >
              <option value="operator">Operador (Atendimento, PDV & Caixa)</option>
              <option value="admin">Administrador (Acesso Total + Relatórios + Gestão)</option>
            </select>
            {currentUser?.id === editingUser?.id && (
              <span className="text-[11px] text-amber-400 mt-1 block">
                Você não pode alterar seu próprio nível de privilégio.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nova Senha (deixe em branco para não alterar)
            </label>
            <input
              type="password"
              minLength={6}
              placeholder="Preencha apenas se for redefinir a senha"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={editForm.is_active}
              disabled={currentUser?.id === editingUser?.id}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800"
            />
            <label htmlFor="is_active_edit" className="text-sm font-semibold text-slate-300">
              Usuário ativo no sistema
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
