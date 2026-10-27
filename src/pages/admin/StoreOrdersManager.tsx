import React, { useState } from 'react';
import { Order, OrderStatus, Store } from '../../types';
import { formatCurrency, formatDate, playOrderAlertSound } from '../../utils/formatters';
import { api } from '../../services/api';
import { ThermalPrintReceipt } from '../../components/ThermalPrintReceipt';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  XCircle,
  Printer,
  Search,
  Filter,
  Eye,
  Volume2,
  VolumeX,
  AlertCircle,
  Phone,
  MapPin,
  Kanban,
  List,
} from 'lucide-react';

interface Props {
  store: Store;
  orders: Order[];
  onRefreshOrders: () => void;
}

export const StoreOrdersManager: React.FC<Props> = ({ store, orders, onRefreshOrders }) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [printingWsId, setPrintingWsId] = useState<string | null>(null);

  // Handle direct WebSocket printer dispatch
  const handlePrintWebSocket = async (orderToPrint: Order) => {
    try {
      setPrintingWsId(orderToPrint.id);
      await api.printOrderWebSocket(store.id, orderToPrint.id, 'caixa');
      onRefreshOrders();
    } catch (err: any) {
      alert(`Erro ao imprimir via WebSocket: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setTimeout(() => setPrintingWsId(null), 1200);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus, note);
      if (soundEnabled) playOrderAlertSound();
      onRefreshOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      alert('Erro ao atualizar status do pedido');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      await api.updateOrderStatus(cancelModalOrder.id, 'cancelado', cancelReason || 'Cancelado pelo operador');
      setCancelModalOrder(null);
      setCancelReason('');
      onRefreshOrders();
    } catch (err) {
      alert('Erro ao cancelar pedido');
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesChannel = channelFilter === 'all' || o.channel === channelFilter;
    const matchesSearch =
      !search.trim() ||
      o.displayId.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.phone.includes(search);
    return matchesChannel && matchesSearch;
  });

  const columns: { key: OrderStatus; label: string; icon: any; color: string }[] = [
    { key: 'aguardando_confirmacao', label: 'Novos Pedidos', icon: Clock, color: 'border-amber-400 bg-amber-50/50' },
    { key: 'em_preparo', label: 'Na Cozinha', icon: ChefHat, color: 'border-blue-400 bg-blue-50/50' },
    { key: 'pronto', label: 'Prontos / Expedição', icon: CheckCircle2, color: 'border-purple-400 bg-purple-50/50' },
    { key: 'saiu_para_entrega', label: 'Em Entrega', icon: Bike, color: 'border-orange-400 bg-orange-50/50' },
    { key: 'entregue', label: 'Entregues / Concluídos', icon: PackageCheck, color: 'border-emerald-400 bg-emerald-50/50' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Filter and View Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por #pedido, cliente ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">Todos os Canais</option>
            <option value="cardapio_digital">Cardápio Digital</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="pdv_balcao">PDV Balcão</option>
            <option value="mesa">Mesas</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound alert toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playOrderAlertSound();
            }}
            title={soundEnabled ? 'Sons ativados' : 'Sons silenciados'}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
          </button>

          {/* Kanban / List Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Kanban */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
          {columns.map((col) => {
            const colOrders = filteredOrders.filter((o) => {
              if (col.key === 'pronto') {
                return o.status === 'pronto';
              }
              return o.status === col.key;
            });

            return (
              <div
                key={col.key}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 min-w-[260px] flex flex-col space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800">{col.label}</span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-white text-slate-700 text-[11px] font-black flex items-center justify-center shadow-xs">
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders Cards */}
                <div className="space-y-2.5 min-h-[300px]">
                  {colOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2.5"
                    >
                      {/* Top Bar: ID + Channel + Time */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900">{order.displayId}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(order.createdAt).split(' ')[1]}</span>
                      </div>

                      {/* Customer info */}
                      <div>
                        <p className="font-bold text-xs text-slate-800 line-clamp-1">{order.customer.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {order.customer.phone}
                        </p>
                        {order.type === 'delivery' && order.customer.address && (
                          <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                            📍 {order.customer.address.neighborhood}
                          </p>
                        )}
                      </div>

                      {/* Items preview */}
                      <div className="border-t border-slate-100 pt-1.5 text-[11px] text-slate-600 space-y-0.5">
                        {order.items.slice(0, 2).map((item, i) => (
                          <p key={i} className="line-clamp-1">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-[10px] text-slate-400">+{order.items.length - 2} outros itens</p>
                        )}
                      </div>

                      {/* Value and Payment */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <span className="font-black text-slate-900">{formatCurrency(order.total)}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                          {order.payment.method}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        {order.status === 'aguardando_confirmacao' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'em_preparo', 'Pedido aceito e enviado para cozinha')}
                            className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Aceitar
                          </button>
                        )}

                        {order.status === 'em_preparo' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'pronto', 'Pedido finalizado na cozinha')}
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Marcar Pronto
                          </button>
                        )}

                        {order.status === 'pronto' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, order.type === 'delivery' ? 'saiu_para_entrega' : 'entregue')}
                            className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            {order.type === 'delivery' ? 'Despachar Motoboy' : 'Entregar ao Cliente'}
                          </button>
                        )}

                        {order.status === 'saiu_para_entrega' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'entregue', 'Entrega confirmada pelo motoboy')}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Finalizar Entrega
                          </button>
                        )}

                        {/* WebSocket Direct Print */}
                        <button
                          onClick={() => handlePrintWebSocket(order)}
                          title="Imprimir direto via WebSocket (ESC/POS)"
                          disabled={printingWsId === order.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            printingWsId === order.id
                              ? 'bg-orange-600 text-white animate-pulse'
                              : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                          }`}
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Thermal Print Preview Modal */}
                        <button
                          onClick={() => setPrintingOrder(order)}
                          title="Visualizar Comanda Térmica"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* View full details */}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          title="Ver detalhes completos"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Reject / Cancel */}
                        {order.status !== 'entregue' && order.status !== 'cancelado' && (
                          <button
                            onClick={() => setCancelModalOrder(order)}
                            title="Recusar ou cancelar pedido"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {colOrders.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Nenhum pedido nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Pedido</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Tipo / Canal</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-black text-slate-900">{order.displayId}</td>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{order.customer.name}</p>
                    <p className="text-[11px] text-slate-400">{order.customer.phone}</p>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-700 capitalize">
                      {order.type === 'delivery' ? '🛵 Delivery' : order.type === 'takeaway' ? '🛍️ Retirada' : '🍽️ Mesa'}
                    </span>
                    <span className="block text-[10px] text-slate-400 capitalize">{order.channel.replace('_', ' ')}</span>
                  </td>
                  <td className="p-3 font-bold text-slate-900">{formatCurrency(order.total)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => setPrintingOrder(order)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Detalhes do Pedido {selectedOrder.displayId}</h3>
                <p className="text-xs text-slate-500">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">Cliente: {selectedOrder.customer.name}</p>
                <p className="text-slate-600">WhatsApp: {selectedOrder.customer.phone}</p>
                {selectedOrder.customer.address && (
                  <p className="text-slate-600">
                    Endereço: {selectedOrder.customer.address.street}, {selectedOrder.customer.address.number} - {selectedOrder.customer.address.neighborhood}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Itens Solicitados:</h4>
                <div className="space-y-2 divide-y divide-slate-100">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="pt-2 first:pt-0">
                      <div className="flex justify-between font-bold">
                        <span>{it.quantity}x {it.name}</span>
                        <span>{formatCurrency(it.subtotal)}</span>
                      </div>
                      {it.selectedOptions?.map((o, oi) => (
                        <p key={oi} className="text-[11px] text-slate-500 pl-2">
                          + {o.itemName} ({formatCurrency(o.price)})
                        </p>
                      ))}
                      {it.removedIngredients && it.removedIngredients.length > 0 && (
                        <p className="text-[10px] text-red-600 pl-2">
                          Sem: {it.removedIngredients.join(', ')}
                        </p>
                      )}
                      {it.observation && (
                        <p className="text-[10px] italic text-amber-700 pl-2">Obs: {it.observation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de Entrega:</span>
                  <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => selectedOrder && handlePrintWebSocket(selectedOrder)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir via WebSocket
              </button>
              <button
                onClick={() => {
                  setPrintingOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Visualizar Comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Cancelar Pedido {cancelModalOrder.displayId}?
            </h3>
            <p className="text-xs text-slate-500">
              O cancelamento reverterá automaticamente os insumos baixados do estoque e atualizará o cliente.
            </p>
            <input
              type="text"
              placeholder="Motivo (ex: cliente solicitou, fora de entrega)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Modal */}
      {printingOrder && (
        <ThermalPrintReceipt
          order={printingOrder}
          store={store}
          onClose={() => setPrintingOrder(null)}
          onPrinted={async () => {
            await api.markOrderPrinted(printingOrder.id);
            setPrintingOrder(null);
            onRefreshOrders();
          }}
        />
      )}
    </div>
  );
};
