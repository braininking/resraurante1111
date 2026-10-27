import React, { useState, useEffect } from 'react';
import { Store, Order, Product, Category, Ingredient } from '../../types';
import { api } from '../../services/api';
import { StoreDashboard } from './StoreDashboard';
import { StoreOrdersManager } from './StoreOrdersManager';
import { StoreKDS } from './StoreKDS';
import { StorePOS } from './StorePOS';
import { StoreCatalogManager } from './StoreCatalogManager';
import { StoreInventory } from './StoreInventory';
import { StoreTablesManager } from './StoreTablesManager';
import { StoreWhatsAppBot } from './StoreWhatsAppBot';
import { StoreSettings } from './StoreSettings';
import { StoreOrderHistory } from './StoreOrderHistory';
import { StoreSubscriptionManager } from './StoreSubscriptionManager';
import {
  LayoutDashboard,
  ShoppingBag,
  History,
  ChefHat,
  DollarSign,
  Utensils,
  Boxes,
  UtensilsCrossed,
  MessageCircle,
  Settings,
  CreditCard,
  Zap,
  Store as StoreIcon,
  ExternalLink,
  Copy,
  CheckCircle2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface Props {
  currentStoreSlug?: string;
  onNavigateToCustomerMenu?: (slug: string) => void;
  onSelectStoreSlug?: (slug: string) => void;
  onLogout?: () => void;
}

export const StorePanelPage: React.FC<Props> = ({
  currentStoreSlug = 'burger-co',
  onNavigateToCustomerMenu,
  onSelectStoreSlug,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [store, setStore] = useState<Store | null>(null);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      const stores = await api.getStores();
      setAllStores(stores);

      const current = stores.find((s) => s.slug === currentStoreSlug) || stores[0];
      if (current) {
        setStore(current);
        const [ord, cat, inv] = await Promise.all([
          api.getOrders(current.id),
          api.getCatalog(current.id),
          api.getInventory(current.id),
        ]);
        setOrders(ord);
        setProducts(cat.products);
        setCategories(cat.categories);
        setIngredients(inv.ingredients);
      }
    } catch (err) {
      console.error('Error loading store panel', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, [currentStoreSlug]);

  const handleCopyMenuLink = () => {
    if (!store) return;
    const url = `${window.location.origin}/cardapio/${store.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenMenuNewTab = () => {
    if (!store) return;
    window.open(`/cardapio/${store.slug}`, '_blank', 'noopener,noreferrer');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Central de Pedidos',
      icon: ShoppingBag,
      badge: orders.filter((o) => o.status === 'aguardando_confirmacao').length,
    },
    {
      id: 'history',
      label: 'Histórico de Pedidos',
      icon: History,
    },
    {
      id: 'kds',
      label: 'Cozinha (KDS)',
      icon: ChefHat,
      badge: orders.filter((o) => o.status === 'em_preparo').length,
    },
    { id: 'pos', label: 'PDV / Caixa', icon: DollarSign },
    { id: 'catalog', label: 'Cardápio & Itens', icon: Utensils },
    { id: 'inventory', label: 'Estoque & Ficha', icon: Boxes },
    { id: 'tables', label: 'Mesas & Salão', icon: UtensilsCrossed },
    { id: 'whatsapp', label: 'Robô WhatsApp', icon: MessageCircle },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Carregando painel de gestão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-sm tracking-tight">{store.name}</span>
        </div>

        <button
          onClick={handleOpenMenuNewTab}
          className="text-xs font-semibold text-orange-400 flex items-center gap-1"
        >
          <span>Ver Cardápio</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 text-white z-50 flex flex-col justify-between p-4 transition-transform ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-5">
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-base shadow-sm">
              CP
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight leading-none text-white">CardapioPro</h1>
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                Painel do Lojista
              </span>
            </div>
          </div>

          {/* Store Info Card */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <img src={store.logo} alt={store.name} className="w-9 h-9 rounded-lg object-cover bg-white" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-xs text-white truncate block">{store.name}</span>
              <span className="text-[10px] text-slate-400 capitalize block">{store.segment}</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          {/* Visualizar Cardápio Público */}
          <button
            onClick={handleOpenMenuNewTab}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors border border-slate-700/60"
          >
            <div className="flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-orange-400" />
              <span>Visualizar Cardápio</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Copiar Link */}
          <button
            onClick={handleCopyMenuLink}
            className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors border border-slate-700/40"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </div>
            {copiedLink && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-2 px-3 text-red-400 hover:bg-red-950/30 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Top Bar for Desktop */}
          <div className="hidden md:flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <span className="font-black text-sm text-slate-900">{store.name}</span>
                <span className="text-xs text-slate-400 ml-2">Sistema Online</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopyMenuLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link do Cardápio'}</span>
              </button>

              <button
                onClick={handleOpenMenuNewTab}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <span>Visualizar Cardápio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sair da Conta"
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active View Component */}
          {activeTab === 'dashboard' && (
            <StoreDashboard
              store={store}
              orders={orders}
              products={products}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'orders' && (
            <StoreOrdersManager
              store={store}
              orders={orders}
              onRefreshOrders={loadStoreData}
            />
          )}

          {activeTab === 'history' && (
            <StoreOrderHistory
              store={store}
              orders={orders}
              onRefreshOrders={loadStoreData}
            />
          )}

          {activeTab === 'kds' && (
            <StoreKDS
              store={store}
              orders={orders}
              onRefreshOrders={loadStoreData}
            />
          )}

          {activeTab === 'pos' && (
            <StorePOS
              store={store}
              products={products}
              categories={categories}
              onOrderCreated={loadStoreData}
            />
          )}

          {activeTab === 'catalog' && (
            <StoreCatalogManager
              store={store}
              categories={categories}
              products={products}
              ingredients={ingredients}
              onRefreshCatalog={loadStoreData}
            />
          )}

          {activeTab === 'inventory' && (
            <StoreInventory store={store} />
          )}

          {activeTab === 'tables' && (
            <StoreTablesManager store={store} />
          )}

          {activeTab === 'whatsapp' && (
            <StoreWhatsAppBot
              store={store}
              onUpdateStore={(updated) => setStore(updated)}
            />
          )}

          {activeTab === 'settings' && (
            <StoreSettings
              store={store}
              onUpdateStore={(updated) => setStore(updated)}
            />
          )}
        </div>
      </main>
    </div>
  );
};
