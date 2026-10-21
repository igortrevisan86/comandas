import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Category, Product } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Package,
  Layers,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Filter,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Utensils,
  Coffee,
  AlertCircle,
} from 'lucide-react';

export const MenuAdminPage: React.FC = () => {
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals for Products
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: 0,
    price: '',
    is_active: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Modals for Categories
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [savingCat, setSavingCat] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
      ]);
      setCategories(cats);
      setProducts(prods);
      if (cats.length > 0 && productForm.category_id === 0) {
        setProductForm((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados do cardápio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);

      return matchCat && matchSearch && matchStatus;
    });
  }, [products, selectedCategory, search, statusFilter]);

  // Product Counts by Category
  const productCountByCat = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Handlers for Products
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      category_id: categories.length > 0 ? categories[0].id : 0,
      price: '',
      is_active: true,
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      description: prod.description || '',
      category_id: prod.category_id,
      price: String(prod.price),
      is_active: prod.is_active,
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      toast.warning('O nome do produto é obrigatório.');
      return;
    }
    const numPrice = parseFloat(productForm.price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.warning('Informe um preço válido maior que zero.');
      return;
    }
    if (!productForm.category_id) {
      toast.warning('Selecione uma categoria.');
      return;
    }

    try {
      setSavingProduct(true);
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: productForm.name.trim(),
          description: productForm.description.trim() || undefined,
          category_id: productForm.category_id,
          price: numPrice,
          is_active: productForm.is_active,
        });
        toast.success(`Produto "${productForm.name}" atualizado com sucesso!`);
      } else {
        await api.createProduct({
          name: productForm.name.trim(),
          description: productForm.description.trim() || undefined,
          category_id: productForm.category_id,
          price: numPrice,
          is_active: productForm.is_active,
        });
        toast.success(`Produto "${productForm.name}" criado com sucesso!`);
      }
      setProductModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar produto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductStatus = async (prod: Product) => {
    try {
      const nextStatus = !prod.is_active;
      await api.updateProduct(prod.id, { is_active: nextStatus });
      toast.info(`Produto "${prod.name}" marcado como ${nextStatus ? 'Ativo' : 'Inativo'}.`);
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, is_active: nextStatus } : p))
      );
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status do produto.');
    }
  };

  // Handlers for Categories
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatForm({
      name: '',
      description: '',
      is_active: true,
    });
    setCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      description: cat.description || '',
      is_active: cat.is_active,
    });
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      toast.warning('O nome da categoria é obrigatório.');
      return;
    }
    try {
      setSavingCat(true);
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: catForm.name.trim(),
          description: catForm.description.trim() || undefined,
          is_active: catForm.is_active,
        });
        toast.success(`Categoria "${catForm.name}" atualizada!`);
      } else {
        await api.createCategory(catForm.name.trim(), catForm.description.trim() || undefined);
        toast.success(`Categoria "${catForm.name}" cadastrada!`);
      }
      setCatModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar categoria.');
    } finally {
      setSavingCat(false);
    }
  };

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            Gestão de Cardápio & Produtos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre, edite e configure produtos, preços oficiais e categorias de atendimento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateCategory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition border border-slate-700 shadow-sm"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Gerenciar Categorias</span>
          </button>

          <button
            onClick={handleOpenCreateProduct}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total de Produtos
            </div>
            <div className="text-2xl font-black text-white mt-1">{totalProducts}</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Produtos Ativos
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{activeProducts}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Categorias Cadastradas
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">{categories.length}</div>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({totalProducts})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'active'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ativos ({activeProducts})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'inactive'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inativos ({totalProducts - activeProducts})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Todas Categorias
          </button>
          {categories.map((c) => {
            const count = productCountByCat[c.id] || 0;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <span>{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === c.id ? 'bg-slate-950/20 text-slate-900 font-extrabold' : 'bg-slate-900 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table/List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Item & Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Preço Unitário</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Carregando cardápio...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          <span>{p.name}</span>
                          {!p.is_active && (
                            <span className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30">
                              Inativo
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                          <Tag className="w-3 h-3 text-amber-400" />
                          {p.category_name || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-emerald-400 text-base">
                          {formatBRL(p.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleProductStatus(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                            p.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                          }`}
                        >
                          {p.is_active ? (
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
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition border border-slate-700 shadow-sm"
                          title="Editar Produto"
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

      {/* Modal Criar/Editar Produto */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto no Cardápio'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Coxinha de Frango Especial"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Categoria *
              </label>
              <select
                value={productForm.category_id}
                onChange={(e) =>
                  setProductForm({ ...productForm, category_id: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Preço Oficial (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 12.50"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Descrição / Ingredientes
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Massa leve com recheio cremoso de catupiry e peito desfiado."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="is_active_prod"
              checked={productForm.is_active}
              onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-800"
            />
            <label htmlFor="is_active_prod" className="text-sm font-semibold text-slate-300">
              Produto disponível para venda (Ativo)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingProduct}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              {savingProduct ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Gerenciador de Categorias */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Gerenciar Categorias'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-6">
          {/* Form */}
          <form onSubmit={handleSaveCategory} className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {editingCategory ? 'Editando Categoria' : 'Cadastrar Nova Categoria'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nome (ex: Sobremesas)"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Descrição breve (opcional)"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat_active"
                  checked={catForm.is_active}
                  onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                />
                <label htmlFor="cat_active" className="text-xs text-slate-300 font-semibold">
                  Categoria Ativa
                </label>
              </div>

              <div className="flex items-center gap-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatForm({ name: '', description: '', is_active: true });
                    }}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingCat}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  {savingCat ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </form>

          {/* List existing */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Categorias Existentes ({categories.length})
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span>{c.name}</span>
                      {!c.is_active && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 py-0.2 rounded font-bold">
                          Inativa
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <div className="text-xs text-slate-500">{c.description}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {productCountByCat[c.id] || 0} produtos
                    </span>
                    <button
                      onClick={() => handleOpenEditCategory(c)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
