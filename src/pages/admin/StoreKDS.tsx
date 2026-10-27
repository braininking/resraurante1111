import React, { useState, useEffect } from 'react';
import { Order, Store } from '../../types';
import { api } from '../../services/api';
import { playOrderAlertSound } from '../../utils/formatters';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Check,
  RefreshCw,
  Bell,
  UtensilsCrossed,
} from 'lucide-react';

interface Props {
  store: Store;
  orders: Order[];
  onRefreshOrders: () => void;
}

export const StoreKDS: React.FC<Props> = ({ store, orders, onRefreshOrders }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(Date.now());

  // Update clock every 10 seconds for real elapsed timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders that need kitchen preparation
  const kitchenOrders = orders
    .filter((o) => o.status === 'aguardando_confirmacao' || o.status === 'em_preparo')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleFinishKitchen = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, 'pronto', 'Finalizado pela cozinha (KDS)');
      playOrderAlertSound();
      onRefreshOrders();
    } catch (err) {
      alert('Erro ao atualizar KDS');
    }
  };

  const handleAcceptToKitchen = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, 'em_preparo', 'Iniciado preparo na cozinha');
      playOrderAlertSound();
      onRefreshOrders();
    } catch (err) {
      alert('Erro ao atualizar KDS');
    }
  };

  return (
    <div className="space-y-4">
      {/* KDS Header Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-base tracking-tight flex items-center gap-2">
              KDS · Cozinha & Produção em Tempo Real
            </h2>
            <p className="text-xs text-slate-400">
              {kitchenOrders.length} {kitchenOrders.length === 1 ? 'comanda ativa' : 'comandas ativas'} na chapa/forno
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playOrderAlertSound();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            Testar Alarme Sonoro
          </button>
          <button
            onClick={onRefreshOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg text-slate-800">Cozinha em Dia!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Todas as comandas foram preparadas. Novos pedidos aparecerão automaticamente nesta tela com alerta sonoro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitchenOrders.map((order) => {
            const elapsedMinutes = Math.floor(
              (now - new Date(order.createdAt).getTime()) / (1000 * 60)
            );

            // Severity coloring based on elapsed time
            let headerBg = 'bg-slate-800 text-white';
            let timerBadge = 'bg-slate-700 text-slate-200';
            let isDelayed = false;

            if (elapsedMinutes >= 25) {
              headerBg = 'bg-red-700 text-white animate-pulse';
              timerBadge = 'bg-red-950 text-red-200';
              isDelayed = true;
            } else if (elapsedMinutes >= 15) {
              headerBg = 'bg-amber-600 text-white';
              timerBadge = 'bg-amber-950 text-amber-200';
            }

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Comanda Header */}
                <div className={`p-3.5 flex items-center justify-between ${headerBg}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base">{order.displayId}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/30">
                        {order.type === 'delivery' ? 'Delivery' : order.type === 'takeaway' ? 'Retirada' : `Mesa ${order.customer.tableNumber || ''}`}
                      </span>
                    </div>
                    <span className="text-xs opacity-90 block mt-0.5">{order.customer.name}</span>
                  </div>

                  {/* Timer */}
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${timerBadge}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsedMinutes} min</span>
                  </div>
                </div>

                {/* Items Checklist for Chefs */}
                <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[360px]">
                  {order.items.map((item, idx) => {
                    const itemKey = `${order.id}-${idx}`;
                    const isChecked = checkedItems[itemKey];

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItem(itemKey)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 line-through opacity-70'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="flex-1">
                            <span className="font-black text-sm text-slate-900">
                              {item.quantity}x {item.name}
                            </span>

                            {/* Options */}
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="text-[11px] text-slate-700 mt-1 space-y-0.5 font-medium">
                                {item.selectedOptions.map((opt, oIdx) => (
                                  <p key={oIdx}>+ {opt.itemName}</p>
                                ))}
                              </div>
                            )}

                            {/* Removals */}
                            {item.removedIngredients && item.removedIngredients.length > 0 && (
                              <p className="text-[11px] font-bold text-red-600 mt-1">
                                [SEM: {item.removedIngredients.join(', ')}]
                              </p>
                            )}

                            {/* Obs */}
                            {item.observation && (
                              <div className="mt-1.5 p-1.5 rounded bg-amber-100/70 text-amber-900 text-[11px] font-bold">
                                OBS: {item.observation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                  {order.status === 'aguardando_confirmacao' ? (
                    <button
                      onClick={() => handleAcceptToKitchen(order.id)}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                    >
                      Iniciar Preparo
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFinishKitchen(order.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Pronto para Expedição
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
