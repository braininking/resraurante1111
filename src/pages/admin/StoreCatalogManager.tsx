import React, { useState } from 'react';
import { Store, Product, Category, Ingredient } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Tag,
  DollarSign,
  Layers,
} from 'lucide-react';

interface Props {
  store: Store;
  categories: Category[];
  products: Product[];
  ingredients: Ingredient[];
  onRefreshCatalog: () => void;
}

export const StoreCatalogManager: React.FC<Props> = ({
  store,
  categories,
  products,
  ingredients,
  onRefreshCatalog,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [productModal, setProductModal] = useState<Product | 'new' | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Form State for Product
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState('');
  const [available, setAvailable] = useState(true);

  const openNewProduct = () => {
    setName('');
    setDescription('');
    setPrice('');
    setPromoPrice('');
    setCategoryId(categories[0]?.id || '');
    setImage('https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80');
    setAvailable(true);
    setProductModal('new');
  };

  const openEditProduct = (prod: Product) => {
    setName(prod.name);
    setDescription(prod.description);
    setPrice(prod.price.toString());
    setPromoPrice(prod.promotionalPrice ? prod.promotionalPrice.toString() : '');
    setCategoryId(prod.categoryId);
    setImage(prod.image);
    setAvailable(prod.available);
    setProductModal(prod);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Product> = {
        name,
        description,
        price: parseFloat(price) || 0,
        promotionalPrice: promoPrice ? parseFloat(promoPrice) : undefined,
        categoryId: categoryId || categories[0]?.id,
        image: image || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        available,
      };

      if (productModal === 'new') {
        await api.createProduct(store.id, payload);
      } else if (productModal && typeof productModal === 'object') {
        await api.updateProduct(productModal.id, payload);
      }

      setProductModal(null);
      onRefreshCatalog();
    } catch (err) {
      alert('Erro ao salvar produto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto do cardápio?')) return;
    try {
      await api.deleteProduct(id);
      onRefreshCatalog();
    } catch (err) {
      alert('Erro ao excluir produto');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory(store.id, newCatName.trim());
      setCategoryModal(false);
      setNewCatName('');
      onRefreshCatalog();
    } catch (err) {
      alert('Erro ao criar categoria');
    }
  };

  const handleToggleAvailability = async (prod: Product) => {
    try {
      await api.updateProduct(prod.id, { available: !prod.available });
      onRefreshCatalog();
    } catch (err) {
      alert('Erro ao alterar disponibilidade');
    }
  };

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-black text-slate-900">Gestão de Cardápio & Produtos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre itens, combos, pizzas meio a meio e organize suas categorias
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-slate-600" />
            Nova Categoria
          </button>
          <button
            onClick={openNewProduct}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Adicionar Produto
          </button>
        </div>
      </div>

      {/* Filter and Categories Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição do item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name} ({products.filter((p) => p.categoryId === c.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((prod) => (
          <div
            key={prod.id}
            className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
              prod.available ? 'border-slate-200 hover:border-orange-200' : 'border-slate-200 opacity-60 bg-slate-50'
            }`}
          >
            <div className="flex gap-3">
              <img
                src={prod.image}
                alt={prod.name}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1">{prod.name}</h4>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      prod.available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {prod.available ? 'Ativo' : 'Em Falta'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{prod.description}</p>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="font-black text-xs text-slate-900">
                    {formatCurrency(prod.promotionalPrice || prod.price)}
                  </span>
                  {prod.promotionalPrice && (
                    <span className="text-[10px] line-through text-slate-400">
                      {formatCurrency(prod.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => handleToggleAvailability(prod)}
                className={`text-[11px] font-bold ${
                  prod.available ? 'text-slate-500 hover:text-slate-900' : 'text-emerald-600 hover:underline'
                }`}
              >
                {prod.available ? 'Pausar Item' : 'Ativar Item'}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditProduct(prod)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(prod.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Edit / Create Modal */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-black text-base text-slate-900">
              {productModal === 'new' ? 'Novo Produto' : 'Editar Produto'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Burger Bacon BBQ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Descrição Comercial</label>
                <textarea
                  rows={2}
                  placeholder="Descreva os ingredientes de forma apetitosa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Preço Normal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Preço Promocional (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Deixe em branco se sem oferta"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">URL da Imagem</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-avail"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <label htmlFor="chk-avail" className="text-slate-800 font-bold cursor-pointer">
                  Produto Disponível para Venda no Cardápio
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setProductModal(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Modal */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
          >
            <h3 className="font-black text-base text-slate-900">Nova Categoria de Produtos</h3>
            <div className="text-xs">
              <label className="text-slate-600 block mb-1">Nome da Categoria</label>
              <input
                type="text"
                required
                placeholder="Ex: Entradas, Burgers Especiais, Sobremesas"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCategoryModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Adicionar Categoria
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
