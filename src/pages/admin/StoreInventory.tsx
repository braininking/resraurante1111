import React, { useState, useEffect } from 'react';
import { Store, Ingredient, StockMovement } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  History,
  Scale,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  store: Store;
}

export const StoreInventory: React.FC<Props> = ({ store }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState<Ingredient | null>(null);

  // New Ingredient Form
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<'kg' | 'g' | 'l' | 'ml' | 'un'>('kg');
  const [newCurrentStock, setNewCurrentStock] = useState('');
  const [newMinStock, setNewMinStock] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  // Adjustment Form
  const [adjType, setAdjType] = useState<'entrada' | 'perda' | 'ajuste'>('entrada');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory(store.id);
      setIngredients(res.ingredients);
      setMovements(res.movements);
    } catch (err) {
      console.error('Error loading inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store.id]);

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createIngredient(store.id, {
        name: newName,
        unit: newUnit,
        currentStock: parseFloat(newCurrentStock) || 0,
        minStock: parseFloat(newMinStock) || 5,
        costPrice: parseFloat(newCostPrice) || 0,
        supplier: newSupplier,
      });
      setAddModalOpen(false);
      setNewName('');
      setNewCurrentStock('');
      setNewMinStock('');
      setNewCostPrice('');
      setNewSupplier('');
      loadData();
    } catch (err) {
      alert('Erro ao cadastrar ingrediente');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalOpen) return;
    try {
      await api.adjustStock(store.id, {
        ingredientId: adjustModalOpen.id,
        quantity: parseFloat(adjQuantity) || 0,
        type: adjType,
        reason: adjReason || 'Ajuste manual de estoque',
      });
      setAdjustModalOpen(null);
      setAdjQuantity('');
      setAdjReason('');
      loadData();
    } catch (err) {
      alert('Erro ao ajustar estoque');
    }
  };

  const filteredIngredients = ingredients.filter(
    (i) =>
      !search.trim() ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStock).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-black text-slate-900">Estoque & Fichas Técnicas</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de insumos com baixa automática por venda e alerta de estoque mínimo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Insumo
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Warning for low stock */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 font-semibold">
              Existem {lowStockCount} {lowStockCount === 1 ? 'insumo com estoque abaixo' : 'insumos com estoque abaixo'} do mínimo recomendado para a operação!
            </p>
          </div>
        </div>
      )}

      {/* Ingredients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar insumo ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">{ingredients.length} itens cadastrados</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Insumo</th>
              <th className="p-3.5">Unidade</th>
              <th className="p-3.5">Estoque Atual</th>
              <th className="p-3.5">Estoque Mínimo</th>
              <th className="p-3.5">Custo Unitário</th>
              <th className="p-3.5">Fornecedor</th>
              <th className="p-3.5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIngredients.map((ing) => {
              const isLow = ing.currentStock <= ing.minStock;
              return (
                <tr key={ing.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{ing.name}</td>
                  <td className="p-3.5 text-slate-600 uppercase font-semibold">{ing.unit}</td>
                  <td className="p-3.5">
                    <span
                      className={`font-black text-sm ${
                        isLow ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {ing.currentStock} {ing.unit}
                    </span>
                    {isLow && (
                      <span className="block text-[10px] text-red-500 font-bold">Reposição Urgente</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {ing.minStock} {ing.unit}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800">
                    {formatCurrency(ing.costPrice)}
                  </td>
                  <td className="p-3.5 text-slate-600">{ing.supplier || '-'}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setAdjustModalOpen(ing)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors"
                    >
                      Ajustar / Lançar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Movements Audit Log */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">Histórico de Movimentações Auditáveis</h3>
          </div>
          <span className="text-[11px] text-slate-400">Últimas operações</span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto divide-y divide-slate-100">
          {movements.slice(0, 15).map((m) => {
            const isEntry = m.type === 'entrada';
            return (
              <div key={m.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isEntry ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {isEntry ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{m.ingredientName}</span>
                    <span className="text-[11px] text-slate-400 block">{m.reason}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-black ${
                      isEntry ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {isEntry ? '+' : '-'}{m.quantity} {m.unit}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{formatDate(m.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateIngredient} className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="font-black text-base text-slate-900">Novo Insumo / Ingrediente</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nome do Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Queijo Cheddar Inglês, Pão Brioche"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1">Unidade de Medida</label>
                  <select
                    value={newUnit}
                    onChange={(e: any) => setNewUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="g">g (Gramas)</option>
                    <option value="un">un (Unidades)</option>
                    <option value="l">l (Litros)</option>
                    <option value="ml">ml (Mililitros)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Custo Estimado Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0"
                    value={newCurrentStock}
                    onChange={(e) => setNewCurrentStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Fornecedor Principal</label>
                <input
                  type="text"
                  placeholder="Ex: Frigorífico Boi Nobre, Distribuidora Food"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Salvar Insumo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleAdjustStock} className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="font-black text-base text-slate-900">
              Movimentar: {adjustModalOpen.name}
            </h3>
            <p className="text-xs text-slate-500">
              Estoque atual: {adjustModalOpen.currentStock} {adjustModalOpen.unit}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Tipo de Movimentação</label>
                <select
                  value={adjType}
                  onChange={(e: any) => setAdjType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="entrada">Entrada (Compra / Reposição de Fornecedor)</option>
                  <option value="perda">Saída por Perda / Descarte / Avaria</option>
                  <option value="ajuste">Ajuste / Acerto de Inventário Físico</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Quantidade ({adjustModalOpen.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 10"
                  value={adjQuantity}
                  onChange={(e) => setAdjQuantity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-base"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Justificativa / Nota Fiscal</label>
                <input
                  type="text"
                  placeholder="Ex: Nota Fiscal #4982 ou Quebra na chapa"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Confirmar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
