import React, { useEffect, useState } from 'react';
import { Order, Store } from '../types';
import { formatCurrency, formatDate, buildWhatsAppOrderMessage, getStoreWhatsAppDirectLink } from '../utils/formatters';
import { api } from '../services/api';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Printer,
  Clock,
  Bike,
  PackageCheck,
  ChefHat,
  X,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { ThermalPrintReceipt } from './ThermalPrintReceipt';

interface Props {
  initialOrder: Order;
  store: Store;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<Props> = ({ initialOrder, store, onClose }) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const itauKey = store.pixConfig?.key || '8e7fc37c-634d-4408-9e81-3fbea689d8b2';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(itauKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Generate Pix QR Code if pix payload exists or via platform dynamic API
  useEffect(() => {
    if (order.payment.pixPayload) {
      QRCode.toDataURL(order.payment.pixPayload, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Error generating Pix QR code', err));
    } else if (order.payment.method === 'pix') {
      api.generateDynamicPixQrCode({
        storeId: store.id,
        amount: order.total,
        orderId: order.id,
        txId: order.id.replace(/\D/g, '').substring(0, 20) || 'PIX',
      })
        .then((res) => {
          if (res.qrCodeDataUrl) setQrCodeDataUrl(res.qrCodeDataUrl);
          if (res.pixPayload) {
            setOrder((prev) => ({
              ...prev,
              payment: {
                ...prev.payment,
                pixPayload: res.pixPayload,
              },
            }));
          }
        })
        .catch((err) => console.error('Error generating dynamic pix qr code', err));
    }
  }, [order.payment.pixPayload, order.payment.method, order.id, order.total, store.id]);

  const [simulatingPix, setSimulatingPix] = useState(false);

  // Live status polling every 3 seconds for Pix instant confirmation
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await api.getOrderById(order.id);
        if (fresh) {
          setOrder(fresh);
        }
      } catch (err) {
        console.warn('Failed to refresh order status', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [order.id]);

  const handleSimulatePixPayment = async () => {
    try {
      setSimulatingPix(true);
      const res = await api.simulatePixPaid(order.id);
      if (res.order) {
        setOrder(res.order);
      }
    } catch (err) {
      console.error('Error simulating Pix payment', err);
    } finally {
      setSimulatingPix(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      const fresh = await api.getOrderById(order.id);
      if (fresh) setOrder(fresh);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyPix = () => {
    if (!order.payment.pixPayload) return;
    navigator.clipboard.writeText(order.payment.pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const url = getStoreWhatsAppDirectLink(order, store);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Status step configuration
  const steps = [
    { key: 'aguardando_confirmacao', label: 'Recebido', icon: Clock },
    { key: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
    { key: 'em_preparo', label: 'Na Cozinha', icon: ChefHat },
    { key: 'saiu_para_entrega', label: 'Em Rota', icon: Bike },
    { key: 'entregue', label: 'Entregue', icon: PackageCheck },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'aguardando_confirmacao':
        return 0;
      case 'confirmado':
        return 1;
      case 'em_preparo':
        return 2;
      case 'pronto':
      case 'saiu_para_entrega':
        return 3;
      case 'entregue':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base">Pedido {order.displayId}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {order.channel === 'cardapio_digital' ? 'Cardápio Digital' : 'WhatsApp'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Criado em {formatDate(order.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              title="Atualizar status"
              className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Status Stepper */}
          {!isCancelled ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-800">Status do Pedido em Tempo Real</h4>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Sincronizado com a loja
                </span>
              </div>

              <div className="relative flex justify-between items-center">
                {/* Connecting track line */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 -z-0">
                  <div
                    className="h-full bg-orange-600 transition-all duration-500"
                    style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
                  ></div>
                </div>

                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                        } ${isCurrent ? 'ring-4 ring-orange-100 scale-110' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] mt-2 font-semibold text-center ${
                          isCurrent
                            ? 'text-orange-600 font-bold'
                            : isDone
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-1">
              <span className="text-sm font-bold text-red-700">Pedido Cancelado</span>
              <p className="text-xs text-red-600">Este pedido foi cancelado pelo estabelecimento.</p>
            </div>
          )}

          {/* Pix Payment Box if Pix */}
          {order.payment.method === 'pix' && order.payment.pixPayload && (
            <div className={`rounded-2xl p-4 space-y-3 transition-all ${
              order.payment.status === 'paid'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-emerald-50/70 border border-emerald-200'
            }`}>
              {order.payment.status === 'paid' ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">Pagamento Pix Aprovado Automaticamente! 🎉</h4>
                    <p className="text-xs text-emerald-100">
                      Identificamos o pagamento de {formatCurrency(order.total)}. Seu pedido já foi encaminhado para a cozinha!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Aguardando Pagamento Pix Automático · {formatCurrency(order.total)}
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Pague pelo app de qualquer banco. A confirmação é instantânea e automática!
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Aguardando
                    </span>
                  </div>

                  {/* Requisito explícito do usuário */}
                  <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-xl text-xs text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] flex items-center gap-1 text-emerald-900">
                        🏦 Banco Itaú S.A. (341) • Transferência Universal
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200 transition-colors flex items-center gap-1"
                      >
                        {copiedKey ? 'Chave Copiada!' : 'Copiar Chave'}
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-900">
                      "Você pode transferir de qualquer banco para minha chave Pix Itaú: <strong className="font-mono text-emerald-950">{itauKey}</strong>"
                    </p>
                  </div>

                  {/* QR Code image & copy paste */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-emerald-100">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Pix QR Code"
                        className="w-32 h-32 rounded-lg border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs shrink-0">
                        Gerando QR...
                      </div>
                    )}

                    <div className="flex-1 w-full space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Titular Recebedor:</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {store.pixConfig?.beneficiaryName || 'Itaú Unibanco / CardapioPro'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Chave Pix Itaú:</span>
                          <span className="font-mono text-[10px] text-slate-700 font-semibold truncate block">
                            {itauKey}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          {copiedPix ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                              Código Pix Copiado com Sucesso!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar Código Pix Copia e Cola
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                        >
                          {copiedKey ? 'Chave Itaú Copiada!' : `Copiar Chave Itaú (${itauKey.slice(0, 8)}...)`}
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400 text-center">
                        Abra o app do seu banco (Itaú, Nubank, Bradesco, etc.) e cole o código ou use a chave.
                      </p>
                    </div>
                  </div>

                  {/* Demo instant approval button for testing */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={handleSimulatePixPayment}
                      disabled={simulatingPix}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 flex items-center gap-1.5 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      {simulatingPix ? 'Confirmando no gateway...' : '⚡ Simular Aprovação Pix Instantânea (Teste)'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* WhatsApp Direct Action Button (Anota.ai style) */}
          <div className="space-y-2">
            <button
              onClick={handleOpenWhatsApp}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Enviar Pedido para o WhatsApp da Loja</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Abre seu WhatsApp com a mensagem formatada para agilizar o atendimento da cozinha.
            </p>
          </div>

          {/* Order Items Summary */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">Resumo dos Itens</h4>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1 text-[11px] text-orange-600 font-semibold hover:underline"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Comanda
              </button>
            </div>

            <div className="space-y-2 divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="pt-2 first:pt-0 space-y-0.5 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>

                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="text-[10px] text-slate-500 pl-2">
                      {item.selectedOptions.map((opt, oIdx) => (
                        <p key={oIdx}>
                          + {opt.itemName} {opt.price > 0 && `(${formatCurrency(opt.price)})`}
                        </p>
                      ))}
                    </div>
                  )}

                  {item.removedIngredients && item.removedIngredients.length > 0 && (
                    <p className="text-[10px] text-red-600 pl-2">
                      Sem: {item.removedIngredients.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de Entrega:</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Total:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Concluir & Voltar ao Cardápio
          </button>
        </div>
      </div>

      {/* Thermal Print Modal */}
      {showPrintModal && (
        <ThermalPrintReceipt
          order={order}
          store={store}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
