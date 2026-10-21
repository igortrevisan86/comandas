import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Category, Product } from '../types';
import { useToast } from '../context/ToastContext';
import { formatBRL } from '../utils/formatters';
import {
  Package,
  Plus,
  Edit2,
  FolderPlus,
  CheckCircle,
  XCircle,
  Search,
  Tag,
  DollarSign,
  X,
} from 'lucide-react';

export const ProductsAdminPage: React.FC = () => {
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<number | 'all'>('all');

  // New Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Product Modal (Create or Edit)
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCatId, setProdCatId] = useState<number>(0);
  const [prodPrice, setProdPrice] = useState<string>('');
  const [prodActive, setProdActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
      ]);
      setCategories(cats);
      setProducts(prods);
      if (cats.length > 0 && prodCatId === 0) {
        setProdCatId(cats[0].id);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar dados do cardápio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdActive(true);
    if (categories.length > 0) setProdCatId(categories[0].id);
    setProdModalOpen(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDesc(prod.description || '');
    setProdCatId(prod.category_id);
    setProdPrice(String(prod.price));
    setProdActive(prod.is_active);
    setProdModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseFloat(prodPrice);
    if (!prodName.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }
    if (isNaN(priceVal) || priceVal <= 0) {
      toast.error('Informe um preço válido maior que zero.');
      return;
    }
    if (!prodCatId) {
      toast.error('Selecione uma categoria.');
      return;
    }

    try {
      setSaving(true);
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: prodName.trim(),
          description: prodDesc.trim() || undefined,
          category_id: prodCatId,
          price: priceVal,
          is_active: prodActive,
        });
        toast.success(`Produto "${prodName}" atualizado com sucesso!`);
      } else {
        await api.createProduct({
          name: prodName.trim(),
          description: prodDesc.trim() || undefined,
          category_id: prodCatId,
          price: priceVal,
          is_active: prodActive,
        });
        toast.success(`Produto "${prodName}" cadastrado com sucesso!`);
      }
      setProdModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('Informe o nome da categoria.');
      return;
    }

    try {
      setSaving(true);
      await api.createCategory(catName.trim(), catDesc.trim() || undefined);
      toast.success(`Categoria "${catName}" criada com sucesso!`);
      setCatName('');
      setCatDesc('');
      setCatModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar categoria.');
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (prod: Product) => {
    try {
      await api.updateProduct(prod.id, { is_active: !prod.is_active });
      toast.success(
        `Produto "${prod.name}" ${!prod.is_active ? 'ativado' : 'desativado'} com sucesso!`
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCatFilter === 'all' || p.category_id === selectedCatFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            Cardápio & Cadastro de Produtos
          </h1>
          <p className="text-sm text-slate-400">
            Gerenciamento do catálogo de itens, categorias e precificação
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCatModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span>Nova Categoria</span>
          </button>

          <button
            onClick={openCreateProduct}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do produto..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCatFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              selectedCatFilter === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todas Categorias
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                selectedCatFilter === c.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs">Carregando catálogo...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Nenhum produto cadastrado com os filtros informados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/50">
                <tr>
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Preço Atual</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-200 text-sm">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400">{p.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-[10px]">
                        {p.category_name || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-sm text-white">
                      {formatBRL(p.price)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          p.is_active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => openEditProduct(p)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        title="Editar produto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleProductStatus(p)}
                        className={`p-1.5 rounded-lg transition ${
                          p.is_active
                            ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300'
                        }`}
                        title={p.is_active ? 'Inativar produto' : 'Ativar produto'}
                      >
                        {p.is_active ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {prodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
              </h3>
              <button onClick={() => setProdModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome do Produto <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Coca-Cola Lata 350ml"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-sm text-white focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoria <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={prodCatId}
                    onChange={(e) => setProdCatId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white focus:outline-none transition"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preço (R$) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-sm font-bold text-white focus:outline-none transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Ex: Bebida refrigerante tradicional gelada..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prodActive"
                  checked={prodActive}
                  onChange={(e) => setProdActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-800"
                />
                <label htmlFor="prodActive" className="text-xs font-semibold text-slate-300">
                  Produto ativo para venda no PDV
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProdModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <span>Nova Categoria</span>
              </h3>
              <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome da Categoria <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Sobremesas Artesanais"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-sm text-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Ex: Doces, tortas e pudins"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {saving ? 'Criando...' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
