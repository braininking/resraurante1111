import React, { useState, useMemo } from 'react';
import { Order, Store } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { ThermalPrintReceipt } from '../../components/ThermalPrintReceipt';
import QRCode from 'qrcode';
import {
  Calendar,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  Download,
  Printer,
  Eye,
  Phone,
  MapPin,
  QrCode,
  CreditCard,
  Banknote,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  MessageCircle,
  X,
  AlertCircle,
  HelpCircle,
  User,
  UtensilsCrossed,
} from 'lucide-react';

interface Props {
  store: Store;
  orders: Order[];
  onRefreshOrders: () => void;
}

type PaymentStatusFilter = 'all' | 'pending' | 'paid' | 'cancelled';
type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom';

export const StoreOrderHistory: React.FC<Props> = ({ store, orders, onRefreshOrders }) => {
  // Filters
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Detail Modal & Actions
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Generate QR code whenever selectedOrder changes and is Pix
  React.useEffect(() => {
    if (selectedOrder?.payment?.pixPayload) {
      QRCode.toDataURL(selectedOrder.payment.pixPayload, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setModalQrCodeUrl(url))
        .catch(() => setModalQrCodeUrl(''));
    } else {
      setModalQrCodeUrl('');
    }
  }, [selectedOrder]);

  // Quick preset dates helper
  const handleSelectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 29);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Helper to determine normalized payment status
  const getOrderPaymentCategory = (order: Order): 'pending' | 'paid' | 'cancelled' => {
    if (order.status === 'cancelado') return 'cancelled';
    if (order.payment.status === 'cancelled' || order.payment.status === 'refunded') return 'cancelled';
    if (order.payment.status === 'paid') return 'paid';
    return 'pending';
  };

  // Filtered orders logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Payment Status filter (Pendente, Pago, Cancelado)
      const payCategory = getOrderPaymentCategory(order);
      if (paymentFilter !== 'all' && payCategory !== paymentFilter) {
        return false;
      }

      // 2. Date filtering
      if (startDate) {
        const orderDateStr = order.createdAt.split('T')[0];
        if (orderDateStr < startDate) return false;
      }
      if (endDate) {
        const orderDateStr = order.createdAt.split('T')[0];
        if (orderDateStr > endDate) return false;
      }

      // 3. Channel filter
      if (channelFilter !== 'all' && order.channel !== channelFilter) {
        return false;
      }

      // 4. Payment method filter
      if (methodFilter !== 'all' && order.payment.method !== methodFilter) {
        return false;
      }

      // 5. Search text (id, name, phone, item)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = order.displayId.toLowerCase().includes(term) || order.id.toLowerCase().includes(term);
        const matchesName = order.customer.name.toLowerCase().includes(term);
        const matchesPhone = order.customer.phone.toLowerCase().includes(term);
        const matchesItems = order.items.some((i) => i.name.toLowerCase().includes(term));
        if (!matchesId && !matchesName && !matchesPhone && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, paymentFilter, startDate, endDate, channelFilter, methodFilter, searchTerm]);

  // Aggregate metrics for filtered data
  const metrics = useMemo(() => {
    let totalCount = 0;
    let paidCount = 0;
    let paidTotal = 0;
    let pendingCount = 0;
    let pendingTotal = 0;
    let cancelledCount = 0;
    let cancelledTotal = 0;

    filteredOrders.forEach((order) => {
      totalCount++;
      const cat = getOrderPaymentCategory(order);
      if (cat === 'paid') {
        paidCount++;
        paidTotal += order.total;
      } else if (cat === 'pending') {
        pendingCount++;
        pendingTotal += order.total;
      } else if (cat === 'cancelled') {
        cancelledCount++;
        cancelledTotal += order.total;
      }
    });

    const averageTicket = paidCount > 0 ? paidTotal / paidCount : 0;

    return {
      totalCount,
      paidCount,
      paidTotal,
      pendingCount,
      pendingTotal,
      cancelledCount,
      cancelledTotal,
      averageTicket,
    };
  }, [filteredOrders]);

  // Counts across all orders (for status tabs counters)
  const statusCounters = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let cancelled = 0;
    orders.forEach((o) => {
      const cat = getOrderPaymentCategory(o);
      if (cat === 'pending') pending++;
      else if (cat === 'paid') paid++;
      else if (cat === 'cancelled') cancelled++;
    });
    return { all: orders.length, pending, paid, cancelled };
  }, [orders]);

  // Payment status update handler (Pendente -> Pago, or Cancelar/Estornar)
  const handleUpdatePaymentStatus = async (orderId: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    try {
      setUpdatingPaymentId(orderId);
      await api.updateOrderPaymentStatus(orderId, newStatus);
      showToast(
        newStatus === 'paid'
          ? 'Pagamento marcado como PAGO com sucesso!'
          : newStatus === 'cancelled'
          ? 'Pagamento cancelado.'
          : 'Pagamento reaberto como pendente.'
      );
      onRefreshOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                payment: {
                  ...prev.payment,
                  status: newStatus,
                  paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
                },
              }
            : null
        );
      }
    } catch (err: any) {
      alert(`Erro ao atualizar pagamento: ${err.message || 'Falha na comunicação'}`);
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // Export filtered orders to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Nenhum pedido no filtro atual para exportar.');
      return;
    }

    const headers = [
      'ID Pedido',
      'Data/Hora',
      'Cliente',
      'Telefone',
      'Canal',
      'Tipo Entrega',
      'Status Pedido',
      'Status Pagamento',
      'Forma Pagamento',
      'Qtd Itens',
      'Subtotal',
      'Taxa Entrega',
      'Desconto',
      'Total (R$)',
    ];

    const rows = filteredOrders.map((o) => [
      `#${o.displayId}`,
      formatDate(o.createdAt),
      `"${o.customer.name.replace(/"/g, '""')}"`,
      `"${o.customer.phone}"`,
      o.channel === 'cardapio_digital' ? 'Cardápio Digital' : o.channel === 'whatsapp' ? 'WhatsApp' : o.channel === 'pdv_balcao' ? 'PDV Balcão' : 'Mesa',
      o.type === 'delivery' ? 'Entrega' : o.type === 'takeaway' ? 'Retirada' : 'Mesa',
      o.status,
      getOrderPaymentCategory(o) === 'paid' ? 'Pago' : getOrderPaymentCategory(o) === 'cancelled' ? 'Cancelado' : 'Pendente',
      o.payment.method.toUpperCase(),
      o.items.reduce((acc, i) => acc + i.quantity, 0),
      o.subtotal.toFixed(2),
      o.deliveryFee.toFixed(2),
      o.discount.toFixed(2),
      o.total.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico-pedidos-${store.slug}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório CSV exportado com sucesso!');
  };

  const handleCopyPixCode = () => {
    if (!selectedOrder?.payment.pixPayload) return;
    navigator.clipboard.writeText(selectedOrder.payment.pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'pix':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <QrCode className="w-3 h-3 text-emerald-600" />
            Pix
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
            <Banknote className="w-3 h-3 text-amber-600" />
            Dinheiro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
            <CreditCard className="w-3 h-3 text-blue-600" />
            Cartão
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (order: Order) => {
    const cat = getOrderPaymentCategory(order);
    if (cat === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Pago
        </span>
      );
    }
    if (cat === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-black text-xs">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs">
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
        Pendente
      </span>
    );
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'cardapio_digital':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
            Cardápio Digital
          </span>
        );
      case 'whatsapp':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            WhatsApp
          </span>
        );
      case 'pdv_balcao':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
            PDV Balcão
          </span>
        );
      case 'mesa':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
            Mesa Salão
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
            {channel}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Histórico de Pedidos</h2>
              <p className="text-xs text-slate-500">
                Consulta completa, conciliação e filtros por data e status de pagamento (Pendente, Pago, Cancelado).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshOrders}
            title="Atualizar lista"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards summary for the current filtered view */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de Pedidos</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalCount}</p>
          <span className="text-[10px] text-slate-400 block">No filtro aplicado</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faturamento Pago</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{formatCurrency(metrics.paidTotal)}</p>
          <span className="text-[10px] text-emerald-600 font-semibold block">{metrics.paidCount} pedidos pagos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pendente</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800">{formatCurrency(metrics.pendingTotal)}</p>
          <span className="text-[10px] text-amber-700 font-semibold block">{metrics.pendingCount} aguardando</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cancelados</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-700">{formatCurrency(metrics.cancelledTotal)}</p>
          <span className="text-[10px] text-red-600 font-semibold block">{metrics.cancelledCount} cancelados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Médio</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(metrics.averageTicket)}</p>
          <span className="text-[10px] text-slate-400 block">Por pedido pago</span>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: STATUS DE PAGAMENTO TABS (Pendente, Pago, Cancelado) */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-orange-600" />
            <span>Filtrar por Status de Pagamento:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Todos */}
            <button
              type="button"
              onClick={() => setPaymentFilter('all')}
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                paymentFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Todos</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  paymentFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {statusCounters.all}
              </span>
            </button>

            {/* Pendente */}
            <button
              type="button"
              onClick={() => setPaymentFilter('pending')}
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                paymentFilter === 'pending'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Pendente</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  paymentFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {statusCounters.pending}
              </span>
            </button>

            {/* Pago */}
            <button
              type="button"
              onClick={() => setPaymentFilter('paid')}
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                paymentFilter === 'paid'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pago</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  paymentFilter === 'paid' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {statusCounters.paid}
              </span>
            </button>

            {/* Cancelado */}
            <button
              type="button"
              onClick={() => setPaymentFilter('cancelled')}
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                paymentFilter === 'cancelled'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-red-50/70 hover:bg-red-100 text-red-900 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelado</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  paymentFilter === 'cancelled' ? 'bg-red-700 text-white' : 'bg-red-200 text-red-900'
                }`}
              >
                {statusCounters.cancelled}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: DATA PRESETS & DATE PICKERS */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Filtrar por Período de Data:</span>
            </label>
            {(startDate || endDate || datePreset !== 'all') && (
              <button
                onClick={() => handleSelectDatePreset('all')}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold"
              >
                Limpar datas
              </button>
            )}
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Todo o Histórico' },
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: '7days', label: 'Últimos 7 dias' },
              { id: '30days', label: 'Últimos 30 dias' },
              { id: 'this_month', label: 'Este Mês' },
              { id: 'custom', label: 'Personalizado' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectDatePreset(p.id as DatePreset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  datePreset === p.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Data Inicial (De):</span>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Data Final (Até):</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: SEARCH & EXTRA FILTERS */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, telefone, #ID ou item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">Todos os Canais de Venda</option>
              <option value="cardapio_digital">Cardápio Digital</option>
              <option value="whatsapp">Robô WhatsApp</option>
              <option value="pdv_balcao">PDV Balcão</option>
              <option value="mesa">Mesas & Salão</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">Todas as Formas de Pagamento</option>
              <option value="pix">Pix (QR Code / Copia e Cola)</option>
              <option value="cash">Dinheiro</option>
              <option value="card_delivery">Cartão na Entrega</option>
              <option value="card_online">Cartão Online</option>
            </select>
          </div>
        </div>
      </div>

      {/* ORDERS LIST / TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800">
              Pedidos Encontrados ({filteredOrders.length})
            </span>
            {paymentFilter !== 'all' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Filtro: {paymentFilter === 'paid' ? 'Pago' : paymentFilter === 'pending' ? 'Pendente' : 'Cancelado'}
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-500">
            Ordenado do mais recente para o mais antigo
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Nenhum pedido encontrado para estes filtros.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente alterar o período de data selecionado ou o status de pagamento (Pendente, Pago, Cancelado).
            </p>
            <button
              onClick={() => {
                setPaymentFilter('all');
                handleSelectDatePreset('all');
                setSearchTerm('');
                setChannelFilter('all');
                setMethodFilter('all');
              }}
              className="mt-2 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold rounded-xl transition-colors"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Pedido / Canal</th>
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Resumo dos Itens</th>
                  <th className="py-3 px-4">Forma Pagto</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Status Pagamento</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const payCat = getOrderPaymentCategory(order);
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* ID & Canal */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="font-mono font-black text-slate-900 block">
                              #{order.displayId}
                            </span>
                            {getChannelBadge(order.channel)}
                          </div>
                        </td>

                        {/* Data e Hora */}
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <span className="font-medium block">{formatDate(order.createdAt)}</span>
                          <span className="text-[10px] text-slate-400">
                            {order.type === 'delivery' ? '🛵 Entrega' : order.type === 'takeaway' ? '🥡 Retirada' : '🍽️ Mesa'}
                          </span>
                        </td>

                        {/* Cliente */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{order.customer.name}</span>
                            <span className="text-[11px] text-slate-500 block">{order.customer.phone}</span>
                            {order.customer.address && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                {order.customer.address.street}, {order.customer.address.number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Resumo de Itens */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 max-w-[200px]">
                            <span className="text-slate-800 font-medium block truncate">
                              {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                            </span>
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
                            >
                              <span>{isExpanded ? 'Ocultar detalhes' : `Ver ${order.items.length} itens`}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        {/* Forma Pagto */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getMethodBadge(order.payment.method)}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-black text-slate-900 text-sm block">
                            {formatCurrency(order.total)}
                          </span>
                          {order.payment.method === 'cash' && order.payment.changeFor && (
                            <span className="text-[10px] text-slate-500 block">
                              Troco p/ {formatCurrency(order.payment.changeFor)}
                            </span>
                          )}
                        </td>

                        {/* Status Pagamento (Pendente, Pago, Cancelado) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getPaymentStatusBadge(order)}
                            {order.payment.paidAt && (
                              <span className="text-[9px] text-emerald-700 block font-medium">
                                Pago em: {formatDate(order.payment.paidAt)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Fast toggle payment status button */}
                            {payCat === 'pending' ? (
                              <button
                                onClick={() => handleUpdatePaymentStatus(order.id, 'paid')}
                                disabled={updatingPaymentId === order.id}
                                title="Marcar como Pago"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Marcar Pago</span>
                              </button>
                            ) : payCat === 'paid' ? (
                              <button
                                onClick={() => handleUpdatePaymentStatus(order.id, 'pending')}
                                disabled={updatingPaymentId === order.id}
                                title="Reverter para Pendente"
                                className="px-2 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <span>Pendente</span>
                              </button>
                            ) : null}

                            {/* View detail button */}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              title="Ver Detalhes do Pedido"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Print receipt button */}
                            <button
                              onClick={() => setPrintingOrder(order)}
                              title="Imprimir Cupom / Comanda"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row with item details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-100">
                          <td colSpan={8} className="py-3 px-6">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                              <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                                Composição Detalhada do Pedido #{order.displayId}
                              </span>
                              <div className="divide-y divide-slate-100">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="py-1.5 flex items-start justify-between text-xs">
                                    <div>
                                      <span className="font-bold text-slate-900">
                                        {item.quantity}x {item.name}
                                      </span>
                                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <div className="text-[11px] text-slate-500 pl-3">
                                          {item.selectedOptions.map((o, oidx) => (
                                            <span key={oidx} className="block">
                                              + {o.itemName} (R$ {o.price.toFixed(2)})
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {item.observation && (
                                        <span className="text-[10px] text-amber-700 block pl-3 italic">
                                          Obs: {item.observation}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-slate-900">
                                      {formatCurrency(item.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600">
                                <div>
                                  <span>Subtotal: {formatCurrency(order.subtotal)}</span>
                                  {order.deliveryFee > 0 && (
                                    <span className="ml-3">Entrega: {formatCurrency(order.deliveryFee)}</span>
                                  )}
                                  {order.discount > 0 && (
                                    <span className="ml-3 text-emerald-600">
                                      Desconto: -{formatCurrency(order.discount)}
                                    </span>
                                  )}
                                </div>
                                <span className="font-black text-slate-900 text-sm">
                                  Total: {formatCurrency(order.total)}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES COMPLETOS DO PEDIDO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-xs">
                  #{selectedOrder.displayId}
                </div>
                <div>
                  <h3 className="font-black text-sm">Detalhes do Pedido #{selectedOrder.displayId}</h3>
                  <span className="text-[11px] text-slate-400">
                    Realizado em {formatDate(selectedOrder.createdAt)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Payment Summary Box */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  getOrderPaymentCategory(selectedOrder) === 'paid'
                    ? 'bg-emerald-50 border-emerald-200'
                    : getOrderPaymentCategory(selectedOrder) === 'cancelled'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Status de Pagamento
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {getPaymentStatusBadge(selectedOrder)}
                      <span className="font-black text-slate-900 text-sm">
                        {formatCurrency(selectedOrder.total)}
                      </span>
                    </div>
                  </div>

                  {/* Actions for payment */}
                  <div className="flex items-center gap-2">
                    {getOrderPaymentCategory(selectedOrder) !== 'paid' && (
                      <button
                        onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'paid')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar Pagamento</span>
                      </button>
                    )}

                    {getOrderPaymentCategory(selectedOrder) === 'paid' && (
                      <button
                        onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'cancelled')}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar Pagamento</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PIX Details in Modal if Pix */}
                {selectedOrder.payment.method === 'pix' && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 bg-white p-3 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-slate-900">
                          Dados do Pix (Gerado Dinamicamente para o Pedido)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Chave do lojista: {store.pixConfig?.key || 'Cadastrada em Configurações'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {modalQrCodeUrl ? (
                        <img
                          src={modalQrCodeUrl}
                          alt="QR Code Pix"
                          className="w-24 h-24 rounded-lg border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px] shrink-0">
                          Sem QR Code
                        </div>
                      )}

                      <div className="flex-1 w-full space-y-1.5">
                        <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-500 block text-[10px]">Titular da Chave:</span>
                          <span className="font-bold text-slate-900 block truncate">
                            {store.pixConfig?.beneficiaryName || store.name}
                          </span>
                        </div>

                        {selectedOrder.payment.pixPayload && (
                          <button
                            onClick={handleCopyPixCode}
                            className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {copiedPix ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Código Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Chave Copia e Cola</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Info Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
                  Dados do Cliente & Entrega
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Nome:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Telefone / WhatsApp:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.customer.phone}</span>
                  </div>
                  {selectedOrder.customer.address && (
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10px] block">Endereço de Entrega:</span>
                      <span className="text-slate-700">
                        {selectedOrder.customer.address.street}, {selectedOrder.customer.address.number}
                        {selectedOrder.customer.address.neighborhood ? ` - ${selectedOrder.customer.address.neighborhood}` : ''}
                        {selectedOrder.customer.address.complement ? ` (${selectedOrder.customer.address.complement})` : ''}
                      </span>
                    </div>
                  )}
                  {selectedOrder.customer.tableNumber && (
                    <div>
                      <span className="text-slate-400 text-[10px] block">Mesa no Salão:</span>
                      <span className="font-bold text-slate-900">Mesa #{selectedOrder.customer.tableNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
                  Itens do Pedido ({selectedOrder.items.length})
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-start justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">
                          {item.quantity}x {item.name}
                        </span>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="text-[11px] text-slate-500 pl-3">
                            {item.selectedOptions.map((o, oidx) => (
                              <span key={oidx} className="block">
                                + {o.itemName} (R$ {o.price.toFixed(2)})
                              </span>
                            ))}
                          </div>
                        )}
                        {item.observation && (
                          <span className="text-[10px] text-amber-700 block pl-3 italic">
                            Obs: {item.observation}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Taxa de Entrega:</span>
                    <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Desconto ({selectedOrder.couponCode || 'Cupom'}):</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total do Pedido:</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setPrintingOrder(selectedOrder)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Thermal Modal */}
      {printingOrder && (
        <ThermalPrintReceipt
          order={printingOrder}
          store={store}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};
