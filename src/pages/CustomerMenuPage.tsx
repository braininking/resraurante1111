import React, { useEffect, useState } from 'react';
import { Store, Category, Product, Order } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { CartCheckoutDrawer, CartItem } from '../components/CartCheckoutDrawer';
import { OrderConfirmationModal } from '../components/OrderConfirmationModal';
import {
  Search,
  ShoppingBag,
  Clock,
  Bike,
  Sparkles,
  Phone,
  MessageCircle,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  currentStoreSlug?: string;
  onSelectStoreSlug?: (slug: string) => void;
}

export const CustomerMenuPage: React.FC<Props> = ({ currentStoreSlug = 'burger-co', onSelectStoreSlug }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals & Cart
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Load stores & catalog
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const stores = await api.getStores();
        setAllStores(stores);

        const current = stores.find((s) => s.slug === currentStoreSlug) || stores[0];
        if (current) {
          setStore(current);
          const catalog = await api.getCatalog(current.id);
          setCategories(catalog.categories);
          setProducts(catalog.products);
        }
      } catch (err) {
        console.error('Error loading menu', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentStoreSlug]);

  const handleAddToCart = (customizedItem: any) => {
    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: customizedItem.product.id,
      name: customizedItem.product.name,
      quantity: customizedItem.quantity,
      unitPrice: customizedItem.unitPrice,
      selectedOptions: customizedItem.selectedOptions,
      removedIngredients: customizedItem.removedIngredients,
      observation: customizedItem.observation,
      subtotal: customizedItem.subtotal,
    };

    setCart((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const unit = item.subtotal / item.quantity;
      item.quantity = newQty;
      item.subtotal = parseFloat((unit * newQty).toFixed(2));
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.available;
  });

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Carregando cardápio digital...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900 selection:bg-orange-100 selection:text-orange-900">


      {/* Hero Banner Header */}
      <div className="relative h-44 sm:h-56 w-full bg-slate-900 overflow-hidden">
        <img
          src={store.cover}
          alt={store.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
      </div>

      {/* Store Identity Card (overlapping banner) */}
      <div className="max-w-4xl mx-auto px-4 -mt-14 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src={store.logo}
              alt={store.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
            />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {store.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Aberto Agora
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{store.tagline}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span>{store.address}</span>
              </p>
            </div>

            {/* Quick Contact */}
            <a
              href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp da Loja</span>
            </a>
          </div>

          {/* Quick Stats Badges */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tempo Médio</span>
                <span className="font-bold">30 a 50 min</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Pedido Mínimo</span>
                <span className="font-bold">{formatCurrency(store.minOrderValue)}</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Horário Hoje</span>
                <span className="font-bold">18:00 às 23:59</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Container */}
      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar lanches, pizzas, bebidas ou sobremesas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
          />
        </div>

        {/* Categories Tab Strip (Sticky) */}
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-2 -mx-4 px-4 overflow-x-auto scrollbar-none flex items-center gap-1.5 border-b border-slate-200/60">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
              selectedCategoryId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Todos os Itens
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
            <p className="font-bold text-sm text-slate-700">Nenhum produto encontrado</p>
            <p className="text-xs text-slate-500">Tente buscar por outro termo ou mude a categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const displayPrice = product.promotionalPrice && product.promotionalPrice > 0
                ? product.promotionalPrice
                : product.price;

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md hover:border-orange-200 transition-all cursor-pointer flex gap-4 group"
                >
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition-colors leading-tight">
                          {product.name}
                        </h3>
                        {product.promotionalPrice && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            Oferta
                          </span>
                        )}
                        {product.isPizza && (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                            Meio a Meio
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(displayPrice)}
                        </span>
                        {product.promotionalPrice && (
                          <span className="text-xs line-through text-slate-400">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span>Adicionar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom duration-200">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between transition-all font-bold text-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">
                {cartItemsCount}
              </div>
              <span>Ver Minha Sacola</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{formatCurrency(cartSubtotal)}</span>
              <ChevronRight className="w-5 h-5 opacity-80" />
            </div>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        store={store}
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOrderSuccess={(order) => {
          setIsCartOpen(false);
          setConfirmedOrder(order);
        }}
      />

      {/* Order Confirmation & Live Tracker Modal */}
      {confirmedOrder && (
        <OrderConfirmationModal
          initialOrder={confirmedOrder}
          store={store}
          onClose={() => setConfirmedOrder(null)}
        />
      )}
    </div>
  );
};
