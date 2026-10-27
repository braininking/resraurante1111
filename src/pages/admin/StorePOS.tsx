import React, { useState, useEffect } from 'react';
import { Store, Product, Category, CashSession, Order } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, playOrderAlertSound } from '../../utils/formatters';
import { ThermalPrintReceipt } from '../../components/ThermalPrintReceipt';
import {
  DollarSign,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface Props {
  store: Store;
  products: Product[];
  categories: Category[];
  onOrderCreated: () => void;
}

export const StorePOS: React.FC<Props> = ({ store, products, categories, onOrderCreated }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Cash Session State
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [loadingCash, setLoadingCash] = useState(true);
  const [openCashModal, setOpenCashModal] = useState(false);
  const [initialAmountInput, setInitialAmountInput] = useState('150.00');
  const [operatorNameInput, setOperatorNameInput] = useState('Operador Balcão');

  // Sangria / Suprimento Modal
  const [cashEntryModal, setCashEntryModal] = useState<'sangria' | 'suprimento' | null>(null);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryReason, setEntryReason] = useState('');

  // POS Ticket State
  const [posItems, setPosItems] = useState<{ product: Product; quantity: number; subtotal: number }[]>([]);
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_delivery' | 'pix'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Fetch Cash session
  const refreshCash = async () => {
    try {
      setLoadingCash(true);
      const res = await api.getCash(store.id);
      setActiveSession(res.activeSession || null);
    } catch (err) {
      console.error('Error fetching cash', err);
    } finally {
      setLoadingCash(false);
    }
  };

  useEffect(() => {
    refreshCash();
  }, [store.id]);

  // Open Cash Register
  const handleOpenCash = async () => {
    try {
      await api.openCash(store.id, operatorNameInput, parseFloat(initialAmountInput) || 0);
      setOpenCashModal(false);
      refreshCash();
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir caixa');
    }
  };

  // Close Cash Register
  const handleCloseCash = async () => {
    if (!activeSession) return;
    const confirmClose = window.confirm('Deseja realmente fechar o caixa do turno atual?');
    if (!confirmClose) return;

    try {
      const currentTotal = activeSession.entries.reduce((sum, e) => {
        return e.type === 'sangria' ? sum - e.amount : sum + e.amount;
      }, 0);

      await api.closeCash(activeSession.id, currentTotal);
      refreshCash();
    } catch (err) {
      alert('Erro ao fechar caixa');
    }
  };

  // Add Sangria or Suprimento
  const handleAddCashEntry = async () => {
    if (!activeSession || !cashEntryModal) return;
    try {
      await api.addCashEntry(activeSession.id, {
        type: cashEntryModal,
        amount: parseFloat(entryAmount) || 0,
        reason: entryReason || (cashEntryModal === 'sangria' ? 'Retirada para cofre' : 'Reforço de troco'),
      });
      setCashEntryModal(null);
      setEntryAmount('');
      setEntryReason('');
      refreshCash();
    } catch (err) {
      alert('Erro ao registrar movimentação');
    }
  };

  // POS Ticket Handlers
  const handleAddItem = (prod: Product) => {
    setPosItems((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id
            ? { ...i, quantity: i.quantity + 1, subtotal: parseFloat(((i.quantity + 1) * prod.price).toFixed(2)) }
            : i
        );
      }
      return [...prev, { product: prod, quantity: 1, subtotal: prod.price }];
    });
  };

  const handleUpdateQty = (idx: number, delta: number) => {
    setPosItems((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== idx);
      }
      item.quantity = newQty;
      item.subtotal = parseFloat((newQty * item.product.price).toFixed(2));
      return copy;
    });
  };

  const handleClearPos = () => {
    setPosItems([]);
    setCashReceived('');
  };

  const total = posItems.reduce((sum, i) => sum + i.subtotal, 0);
  const receivedAmount = parseFloat(cashReceived) || 0;
  const change = Math.max(0, receivedAmount - total);

  // Submit Sale
  const handleFinalizeSale = async () => {
    if (posItems.length === 0) return;
    if (!activeSession) {
      alert('Abra o caixa antes de realizar vendas!');
      return;
    }

    try {
      const orderPayload = {
        storeId: store.id,
        channel: 'pdv_balcao',
        type: 'takeaway',
        customer: {
          name: customerName.trim() || 'Cliente Balcão',
          phone: '(11) 99999-9999',
        },
        items: posItems.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.product.price,
          selectedOptions: [],
          subtotal: i.subtotal,
        })),
        paymentMethod,
        changeFor: paymentMethod === 'cash' && receivedAmount > 0 ? receivedAmount : undefined,
      };

      const newOrder = await api.createOrder(orderPayload);

      // Register cash entry
      await api.addCashEntry(activeSession.id, {
        type: 'venda',
        amount: total,
        reason: `Venda PDV Pedido ${newOrder.displayId}`,
        paymentMethod,
      });

      playOrderAlertSound();
      setCompletedOrder(newOrder);
      handleClearPos();
      onOrderCreated();
      refreshCash();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar venda no PDV');
    }
  };

  // Filter catalog
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && p.available;
  });

  return (
    <div className="space-y-4">
      {/* Cash Status Ribbon */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeSession ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {activeSession ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {activeSession ? `Caixa Aberto · ${activeSession.operatorName}` : 'Caixa Fechado'}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  activeSession ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}
              >
                {activeSession ? 'Operacional' : 'Fechado'}
              </span>
            </div>
            {activeSession && (
              <p className="text-xs text-slate-400">
                Fundo Inicial: {formatCurrency(activeSession.initialAmount)} · {activeSession.entries.length} movimentações
              </p>
            )}
          </div>
        </div>

        {/* Cash action buttons */}
        <div className="flex items-center gap-2">
          {activeSession ? (
            <>
              <button
                onClick={() => setCashEntryModal('suprimento')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />
                Suprimento
              </button>
              <button
                onClick={() => setCashEntryModal('sangria')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
                Sangria
              </button>
              <button
                onClick={handleCloseCash}
                className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Fechar Caixa
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpenCashModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Abrir Caixa de Turno
            </button>
          )}
        </div>
      </div>

      {/* POS Grid: Catalog on Left (60%), Ticket on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Product Selector */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Busca rápida de itens para o caixa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
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
                {c.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleAddItem(p)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
              >
                <div className="space-y-1">
                  <p className="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-orange-600">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{categories.find((c) => c.id === p.categoryId)?.name}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="font-black text-xs text-slate-900">{formatCurrency(p.price)}</span>
                  <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    +
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active POS Ticket */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-sm text-slate-900">Comanda Balcão Atual</h3>
              </div>
              {posItems.length > 0 && (
                <button
                  onClick={handleClearPos}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>

            {/* Customer input */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Identificação do Cliente / Mesa</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: João Silva ou Balcão 02"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 font-medium"
              />
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 divide-y divide-slate-100">
              {posItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">
                  Nenhum item na comanda. Clique nos produtos à esquerda para adicionar.
                </p>
              ) : (
                posItems.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs gap-2">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 line-clamp-1">{item.product.name}</p>
                      <span className="text-[10px] text-slate-500">
                        {formatCurrency(item.product.price)} un.
                      </span>
                    </div>

                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-black text-slate-900 w-16 text-right">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment & Finalization */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            {/* Totals */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 text-xs">Total da Venda</span>
              <span className="font-black text-xl text-slate-900">{formatCurrency(total)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card_delivery')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'card_delivery'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Cartão</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <QrCode className="w-4 h-4 text-purple-600" />
                <span>Pix</span>
              </button>
            </div>

            {/* Change Calculator if Cash */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Valor Recebido:</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-24 text-right p-1 rounded border border-slate-300 font-bold"
                  />
                </div>
                {receivedAmount > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold">
                    <span>Troco a Devolver:</span>
                    <span className="text-emerald-700 font-black">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Finalize Button */}
            <button
              onClick={handleFinalizeSale}
              disabled={posItems.length === 0 || !activeSession}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir Venda e Imprimir Comanda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Open Cash Modal */}
      {openCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5 space-y-4">
            <h3 className="font-black text-base text-slate-900">Abertura de Caixa (Turno)</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nome do Operador</label>
                <input
                  type="text"
                  value={operatorNameInput}
                  onChange={(e) => setOperatorNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Fundo de Troco Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={initialAmountInput}
                  onChange={(e) => setInitialAmountInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-base"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setOpenCashModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenCash}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sangria / Suprimento Modal */}
      {cashEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5 space-y-4">
            <h3 className="font-black text-base text-slate-900 capitalize">
              Registrar {cashEntryModal}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-base"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Justificativa / Motivo</label>
                <input
                  type="text"
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  placeholder="Ex: Retirada para cofre / Adição de moedas"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setCashEntryModal(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCashEntry}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Registrar Movimentação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Receipt Print preview on Sale success */}
      {completedOrder && (
        <ThermalPrintReceipt
          order={completedOrder}
          store={store}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
};
