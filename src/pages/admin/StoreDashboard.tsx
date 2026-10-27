import React, { useState, useEffect } from 'react';
import { Order, Store, Product, StoreMetrics } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  ChefHat,
  AlertTriangle,
  ArrowUpRight,
  Bike,
  Store as StoreIcon,
  MessageCircle,
  Calendar,
  Download,
  Printer,
  Sparkles,
  PieChart,
  BarChart3,
  MapPin,
  Flame,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  store: Store;
  orders: Order[];
  products: Product[];
  onNavigateToTab: (tab: string) => void;
}

export const StoreDashboard: React.FC<Props> = ({ store, orders, products, onNavigateToTab }) => {
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'all'>('today');
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async (p = period) => {
    try {
      setLoading(true);
      const data = await api.getStoreMetrics(store.id, p);
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(period);
  }, [store.id, period, orders.length]);

  const pendingOrders = orders.filter((o) => o.status === 'aguardando_confirmacao').length;
  const inKitchenOrders = orders.filter((o) => o.status === 'em_preparo').length;
  const deliveryOrders = orders.filter((o) => o.status === 'saiu_para_entrega').length;

  const maxHourlyRevenue = metrics ? Math.max(...metrics.hourlySales.map((h) => h.revenue), 1) : 1;
  const maxWeekdayRevenue = metrics ? Math.max(...metrics.weekdaySales.map((w) => w.revenue), 1) : 1;

  const handleExportCSV = () => {
    if (!metrics) return;
    const rows = [
      ['Periodo', period],
      ['Faturamento Total', metrics.totalRevenue.toFixed(2)],
      ['Total Pedidos', metrics.totalOrders.toString()],
      ['Ticket Medio', metrics.averageTicket.toFixed(2)],
      ['Lucro Estimado', metrics.grossProfit.toFixed(2)],
      ['Taxa Cancelamento (%)', metrics.cancellationRate.toFixed(1)],
      [],
      ['Produto', 'Quantidade', 'Faturamento (R$)'],
      ...metrics.topProducts.map((p) => [p.name, p.quantity.toString(), p.revenue.toFixed(2)]),
      [],
      ['Canal', 'Pedidos', 'Faturamento (R$)'],
      ...metrics.channelBreakdown.map((c) => [c.label, c.orders.toString(), c.revenue.toFixed(2)]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `metricas-${store.slug}-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Pending Orders Action Banner */}
      {pendingOrders > 0 && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            <div>
              <p className="font-black text-sm">
                Atenção: Você tem {pendingOrders} {pendingOrders === 1 ? 'pedido novo aguardando' : 'pedidos novos aguardando'} confirmação!
              </p>
              <p className="text-xs opacity-90">Confirme para encaminhar para a tela da cozinha (KDS) ou impressora térmica.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('orders')}
            className="px-4 py-2 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-xs"
          >
            Ver Pedidos
          </button>
        </div>
      )}

      {/* Header & Period Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <h1 className="text-lg font-black text-slate-900">Dashboard de Métricas & Desempenho</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Análise consolidada de faturamento, volume de vendas, horários de pico e canais de atendimento
          </p>
        </div>

        {/* Action Controls & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${period === 'today' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${period === 'yesterday' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Ontem
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${period === '7days' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${period === '30days' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${period === 'this_month' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${period === 'all' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={() => fetchMetrics(period)}
            title="Atualizar Métricas"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            title="Exportar dados em planilha CSV"
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handlePrintSummary}
            title="Imprimir Resumo"
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Líquido</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(metrics?.totalRevenue ?? 0)}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              100% Real
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Total apurado no período selecionado</p>
        </div>

        {/* Pedidos Concluídos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pedidos Concluídos</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {metrics?.totalOrders ?? 0}
            </span>
            <span className="text-[11px] font-bold text-orange-600">
              {pendingOrders} pendentes hoje
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Vendas aprovadas sem cancelamentos</p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(metrics?.averageTicket ?? 0)}
            </span>
            <span className="text-[11px] font-bold text-slate-500">por cliente</span>
          </div>
          <p className="text-[11px] text-slate-400">Média de consumo por pedido</p>
        </div>

        {/* Lucro Bruto Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Margem Bruta (~68%)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(metrics?.grossProfit ?? 0)}
            </span>
            <span className="text-[11px] font-semibold text-purple-700">Estimado</span>
          </div>
          <p className="text-[11px] text-slate-400">Receita descontando CMV médio</p>
        </div>
      </div>

      {/* Charts Section: Peak Hours & Weekday Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Peak Hours Histogram (00h - 23h) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-black text-slate-900">Horários de Pico (Distribuição por Hora)</h2>
            </div>
            <span className="text-[11px] text-slate-400">Faturamento por faixa horária</span>
          </div>

          <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-100">
            {metrics?.hourlySales.map((item) => {
              const heightPercent = maxHourlyRevenue > 0 ? (item.revenue / maxHourlyRevenue) * 100 : 0;
              const isPeak = heightPercent > 70 && item.revenue > 0;
              return (
                <div key={item.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-950 text-white text-[10px] py-1 px-2 rounded-lg z-20 whitespace-nowrap shadow-md pointer-events-none">
                    <span className="font-bold">{item.label}: {formatCurrency(item.revenue)}</span>
                    <span className="text-slate-300">{item.orders} pedido(s)</span>
                  </div>

                  <div
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isPeak
                        ? 'bg-orange-600 shadow-xs'
                        : item.revenue > 0
                        ? 'bg-orange-300 hover:bg-orange-400'
                        : 'bg-slate-100'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 mt-1 scale-90 sm:scale-100">
                    {item.hour % 3 === 0 ? item.label : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                <span className="text-[11px]">Horário de Pico</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-300" />
                <span className="text-[11px]">Movimento Regular</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Passe o mouse sobre as barras para ver valores</span>
          </div>
        </div>

        {/* Weekday Distribution */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black text-slate-900">Vendas por Dia da Semana</h2>
            </div>
            <span className="text-[11px] text-slate-400">Volume</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {metrics?.weekdaySales.map((d) => {
              const pct = maxWeekdayRevenue > 0 ? (d.revenue / maxWeekdayRevenue) * 100 : 0;
              return (
                <div key={d.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{d.label}</span>
                    <span className="text-slate-900 font-black">{formatCurrency(d.revenue)} ({d.orders} ped)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(pct, 2)}%` }}
                      className={`h-full rounded-full ${d.day === 5 || d.day === 6 ? 'bg-orange-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Grid: Channel breakdown & Payment Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Channel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Canais de Atendimento</h2>
            <span className="text-[11px] text-slate-400">% Faturamento</span>
          </div>

          <div className="space-y-3">
            {metrics?.channelBreakdown.map((item) => (
              <div key={item.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{item.label}</span>
                  <span className="text-slate-900 font-black">
                    {formatCurrency(item.revenue)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    className={`h-full rounded-full ${
                      item.channel === 'cardapio_digital'
                        ? 'bg-orange-500'
                        : item.channel === 'whatsapp'
                        ? 'bg-emerald-500'
                        : item.channel === 'pdv_balcao'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{item.orders} pedido(s)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Métodos de Pagamento</h2>
            <span className="text-[11px] text-emerald-600 font-bold">Pix Automático</span>
          </div>

          <div className="space-y-3">
            {metrics?.paymentBreakdown.map((pm) => (
              <div key={pm.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{pm.label}</span>
                  <span className="text-slate-900 font-black">
                    {formatCurrency(pm.revenue)} ({pm.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${Math.max(pm.percentage, 3)}%` }}
                    className={`h-full rounded-full ${
                      pm.method === 'pix'
                        ? 'bg-emerald-500'
                        : pm.method.startsWith('card')
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{pm.orders} transações</span>
                </div>
              </div>
            ))}

            <button
              onClick={() => onNavigateToTab('history')}
              className="w-full mt-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Ver Histórico de Pedidos & Status</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Delivery Neighborhoods */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-black text-slate-900">Bairros de Maior Demanda</h2>
            </div>
            <span className="text-[11px] text-slate-400">Entrega</span>
          </div>

          <div className="space-y-2.5">
            {metrics?.topNeighborhoods && metrics.topNeighborhoods.length > 0 ? (
              metrics.topNeighborhoods.map((neigh, idx) => (
                <div
                  key={neigh.neighborhood}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800">{neigh.neighborhood}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{formatCurrency(neigh.revenue)}</div>
                    <div className="text-[10px] text-slate-400">{neigh.orders} entregas</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhum pedido de entrega registrado no período</p>
            )}
          </div>
        </div>
      </div>

      {/* Top 10 Best Sellers Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Top 10 Produtos Mais Vendidos</h2>
            <p className="text-xs text-slate-500">Ranking por faturamento e unidades comercializadas</p>
          </div>
          <button
            onClick={() => onNavigateToTab('catalog')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700"
          >
            Gerenciar Cardápio →
          </button>
        </div>

        {metrics?.topProducts && metrics.topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3 text-right">Qtd Vendida</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {metrics.topProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-400">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{p.quantity} un</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{formatCurrency(p.revenue)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${Math.max(p.percentage, 2)}%` }}
                            className="h-full bg-orange-500 rounded-full"
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-600 w-9">{p.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Nenhuma venda registrada no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
