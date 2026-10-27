import React, { useState } from 'react';
import { Store, Order } from '../types';
import { formatCurrency, getStoreWhatsAppDirectLink } from '../utils/formatters';
import { api } from '../services/api';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: any[];
  removedIngredients?: string[];
  observation?: string;
  subtotal: number;
}

interface Props {
  store: Store;
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartCheckoutDrawer: React.FC<Props> = ({
  store,
  cart,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [serviceType, setServiceType] = useState<'delivery' | 'takeaway' | 'dine_in'>('delivery');

  // Customer state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState(store.deliveryZones[0]?.id || '');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');
  const [tableNumber, setTableNumber] = useState('1');

  // Payment & coupon state
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card_delivery'>('pix');
  const [changeFor, setChangeFor] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Calculate client subtotal
  const rawSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Delivery fee
  const selectedZone = store.deliveryZones.find((z) => z.id === selectedZoneId);
  const deliveryFee = serviceType === 'delivery' ? (selectedZone?.fee || 0) : 0;

  // Apply simple coupon logic on client preview
  const handleApplyCoupon = () => {
    setErrorMessage('');
    const code = couponCode.trim().toUpperCase();
    if (code === 'PRIMEIRACOMPRA' || code === 'BEMVINDO') {
      const disc = parseFloat((rawSubtotal * 0.1).toFixed(2));
      setCouponDiscount(disc);
      setAppliedCoupon(code);
    } else if (code === 'FRETEGRATIS' || code === 'DELIVERYFREE') {
      setCouponDiscount(deliveryFee);
      setAppliedCoupon(code);
    } else if (code === 'DESCONTO5') {
      setCouponDiscount(5.0);
      setAppliedCoupon(code);
    } else {
      setErrorMessage('Cupom inválido ou expirado.');
    }
  };

  const total = Math.max(0, rawSubtotal + deliveryFee - couponDiscount);
  const isBelowMin = serviceType === 'delivery' && rawSubtotal < store.minOrderValue;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (cart.length === 0) {
      setErrorMessage('Seu carrinho está vazio.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome.');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Por favor, informe seu telefone / WhatsApp.');
      return;
    }

    if (serviceType === 'delivery' && (!street.trim() || !number.trim())) {
      setErrorMessage('Informe a rua e o número para a entrega.');
      return;
    }

    if (isBelowMin) {
      setErrorMessage(`O pedido mínimo para entrega é ${formatCurrency(store.minOrderValue)}.`);
      return;
    }

    try {
      setLoading(true);
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const payload = {
        storeId: store.id,
        channel: 'cardapio_digital',
        type: serviceType,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          address: serviceType === 'delivery' ? {
            street: street.trim(),
            number: number.trim(),
            neighborhood: selectedZone?.name || 'Centro',
            complement: complement.trim(),
            reference: reference.trim(),
          } : undefined,
          tableNumber: serviceType === 'dine_in' ? parseInt(tableNumber, 10) : undefined,
        },
        items: cart,
        deliveryZoneId: serviceType === 'delivery' ? selectedZoneId : undefined,
        couponCode: appliedCoupon || undefined,
        paymentMethod,
        changeFor: paymentMethod === 'cash' && changeFor ? changeFor : undefined,
        idempotencyKey,
      };

      const createdOrder = await api.createOrder(payload);
      onClearCart();
      // Generate dynamic WhatsApp link targeting exclusively this store's WhatsApp
      const whatsappUrl = getStoreWhatsAppDirectLink(createdOrder, store);
      try {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // In case popup blocked, OrderConfirmationModal still has direct button
      }
      onOrderSuccess(createdOrder);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {step === 'cart' ? `Sua Sacola (${cart.length})` : 'Finalizar Pedido'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 p-3 text-xs text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 'cart' ? (
            <>
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800">Sua sacola está vazia</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Nenhum item adicionado ainda. Escolha produtos no cardápio para começar seu pedido!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-slate-100">
                  {cart.map((item, index) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                          <span className="text-xs font-semibold text-orange-600">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                        {/* Quantity controller */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-l-lg transition-colors"
                          >
                            {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-r-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Options breakdown */}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="text-[11px] text-slate-500 pl-1 space-y-0.5">
                          {item.selectedOptions.map((opt: any, optIdx: number) => (
                            <p key={optIdx}>
                              + {opt.itemName} {opt.price > 0 && `(${formatCurrency(opt.price)})`}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Removals & Obs */}
                      {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <p className="text-[10px] text-red-600 pl-1">
                          Sem: {item.removedIngredients.join(', ')}
                        </p>
                      )}
                      {item.observation && (
                        <p className="text-[10px] text-slate-500 italic pl-1 bg-slate-50 p-1 rounded">
                          "{item.observation}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Checkout Form Step */
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
              {/* Service Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Como prefere receber?</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setServiceType('delivery')}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                      serviceType === 'delivery'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛵 Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('takeaway')}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                      serviceType === 'takeaway'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛍️ Retirada
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('dine_in')}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                      serviceType === 'dine_in'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🍽️ Na Mesa
                  </button>
                </div>
              </div>

              {/* Identification */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Seus Dados</h4>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="WhatsApp / Telefone (ex: 11 98888-7777)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Delivery Address if Delivery */}
              {serviceType === 'delivery' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    Endereço de Entrega
                  </h4>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-slate-500">Região / Bairro de Entrega</label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                      >
                        {store.deliveryZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} - Taxa: {formatCurrency(z.fee)} (~{z.estimatedMinutes} min)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Rua / Avenida"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Número"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Complemento (Apto, Bloco)"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Ponto de Referência"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Table number if Dine In */}
              {serviceType === 'dine_in' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800">Número da sua Mesa</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-32 text-xs p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              )}

              {/* Coupon input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Cupom de Desconto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: PRIMEIRACOMPRA ou BEMVINDO"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cupom {appliedCoupon} aplicado com sucesso! (-{formatCurrency(couponDiscount)})
                  </p>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800">Forma de Pagamento</h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {store.paymentMethods?.pix && (
                    <div
                      onClick={() => setPaymentMethod('pix')}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        paymentMethod === 'pix'
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <QrCode className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Pix Instantâneo (QR Code Dinâmico)</span>
                            <span className="block text-[10px] text-slate-500">
                              Gerado automaticamente pela API com o valor exato
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Aprovação Imediata
                        </span>
                      </div>

                      {paymentMethod === 'pix' && (
                        <div className="bg-white/95 border border-emerald-200 p-3 rounded-xl text-[11px] text-emerald-950 space-y-2">
                          <div className="bg-emerald-50 border border-emerald-200/80 p-2 rounded-lg text-[10px] text-emerald-900 font-medium">
                            <span className="font-bold block text-emerald-950">💡 Transferência Universal via Pix Itaú:</span>
                            "Você pode transferir de qualquer banco para minha chave Pix Itaú: {store.pixConfig?.key || '8e7fc37c-634d-4408-9e81-3fbea689d8b2'}"
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Banco:</span>
                            <span className="font-bold text-slate-800">Banco Itaú S.A. (341)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Titular Recebedor:</span>
                            <span className="font-bold text-slate-900">
                              {store.pixConfig?.beneficiaryName || 'Itaú Unibanco / CardapioPro'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Chave Pix:</span>
                            <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {store.pixConfig?.key || '8e7fc37c-634d-4408-9e81-3fbea689d8b2'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                            <span className="text-slate-500 font-medium">Total a Pagar:</span>
                            <span className="font-black text-emerald-700 text-sm">
                              {formatCurrency(total)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 text-center">
                            Ao finalizar, o QR Code dinâmico e o código Copia e Cola com o valor exato serão gerados para aprovação automática instantânea.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {store.paymentMethods?.cardDelivery && (
                    <label
                      onClick={() => setPaymentMethod('card_delivery')}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        paymentMethod === 'card_delivery'
                          ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-bold text-slate-900">Cartão na Entrega</span>
                          <span className="block text-[10px] text-slate-500">
                            Entregador leva a maquininha (Débito/Crédito)
                          </span>
                        </div>
                      </div>
                    </label>
                  )}

                  {store.paymentMethods?.cash && (
                    <div
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        paymentMethod === 'cash'
                          ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-amber-600" />
                          <span className="font-bold text-slate-900">Dinheiro</span>
                        </div>
                      </div>
                      {paymentMethod === 'cash' && (
                        <div className="pt-1">
                          <label className="text-[10px] text-slate-600 block mb-1">
                            Precisa de troco para quanto? (Deixe em branco se não precisar)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 50.00 ou 100.00"
                            value={changeFor}
                            onChange={(e) => setChangeFor(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Bottom Bar (Financial summary + action) */}
        {cart.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
            {/* Price breakdown */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(rawSubtotal)}</span>
              </div>
              {serviceType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Desconto ({appliedCoupon})</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Total a Pagar</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Min order alert if delivery */}
            {isBelowMin && (
              <p className="text-[11px] text-red-600 font-medium text-center">
                Valor mínimo para entrega: {formatCurrency(store.minOrderValue)} (Faltam {formatCurrency(store.minOrderValue - rawSubtotal)})
              </p>
            )}

            {/* Step buttons */}
            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white font-bold rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-sm transition-all"
              >
                <span>Avançar para o Fechamento</span>
                <span className="flex items-center gap-1 font-semibold">
                  {formatCurrency(total)}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || isBelowMin}
                  className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirmando pedido...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Pedido · {formatCurrency(total)}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
