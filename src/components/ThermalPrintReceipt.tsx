import React from 'react';
import { Order, Store } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Printer, Check, X } from 'lucide-react';

interface Props {
  order: Order;
  store: Store;
  onClose?: () => void;
  onPrinted?: () => void;
}

export const ThermalPrintReceipt: React.FC<Props> = ({ order, store, onClose, onPrinted }) => {
  const paperWidth = store.printSettings?.paperWidth || 80;

  const handlePrint = () => {
    window.print();
    if (onPrinted) onPrinted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Action Header (hidden in print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-semibold text-sm">Impressão Térmica de Comanda</h3>
              <p className="text-xs text-slate-400">Padrão {paperWidth}mm (Cozinha & Entrega)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Thermal Ticket Content */}
        <div className="p-6 overflow-y-auto bg-amber-50/40 flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white border border-slate-300 shadow-sm p-4 font-mono text-slate-900 leading-tight text-xs print:p-0 print:border-none print:shadow-none print:w-full ${
              paperWidth === 58 ? 'w-[260px]' : 'w-[340px]'
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h2 className="text-base font-black tracking-tight uppercase">{store.name}</h2>
              <p className="text-[11px] text-slate-600">{store.phone}</p>
              <p className="text-[10px] text-slate-500">{store.address}</p>
            </div>

            {/* Order Identifiers */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-center">
              <span className="text-xl font-black block tracking-wider">PEDIDO {order.displayId}</span>
              <div className="flex justify-between text-[11px] mt-1 font-semibold">
                <span>{formatDate(order.createdAt)}</span>
                <span className="uppercase text-orange-700">
                  {order.type === 'delivery' ? '🛵 DELIVERY' : order.type === 'takeaway' ? '🛍️ RETIRADA' : `🍽️ MESA ${order.customer.tableNumber || ''}`}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
              <p className="font-bold">CLIENTE: {order.customer.name}</p>
              <p className="text-[11px]">TEL: {order.customer.phone}</p>
              {order.type === 'delivery' && order.customer.address && (
                <div className="mt-1 text-[11px]">
                  <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
                  <p>{order.customer.address.street}, {order.customer.address.number}</p>
                  {order.customer.address.complement && <p>Compl: {order.customer.address.complement}</p>}
                  <p>Bairro: {order.customer.address.neighborhood}</p>
                  {order.customer.address.reference && (
                    <p className="italic text-slate-700">Ref: {order.customer.address.reference}</p>
                  )}
                </div>
              )}
            </div>

            {/* Items Section */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
              <p className="font-bold text-[11px] mb-1">=== ITENS DO PEDIDO ===</p>
              {order.items.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between font-bold text-xs">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>

                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="pl-2 text-[10px] text-slate-700">
                      {item.selectedOptions.map((opt, i) => (
                        <div key={i} className="flex justify-between">
                          <span>+ {opt.itemName}</span>
                          {opt.price > 0 && <span>{formatCurrency(opt.price * (opt.quantity || 1))}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.removedIngredients && item.removedIngredients.length > 0 && (
                    <div className="pl-2 text-[10px] text-red-700 font-semibold">
                      [SEM: {item.removedIngredients.join(', ')}]
                    </div>
                  )}

                  {item.observation && (
                    <div className="pl-2 text-[10px] font-bold text-slate-800 bg-amber-100/60 p-0.5 mt-0.5">
                      OBS: {item.observation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-xs space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Taxa Entrega:</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Desconto ({order.couponCode || 'Cupom'}):</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-xs">
              <p className="font-bold">
                PAGAMENTO:{' '}
                {order.payment.method === 'pix'
                  ? 'PIX ONLINE'
                  : order.payment.method === 'cash'
                  ? 'DINHEIRO'
                  : 'CARTÃO NA ENTREGA'}
              </p>
              {order.payment.changeFor && (
                <p className="text-[11px]">
                  Troco para {formatCurrency(order.payment.changeFor)} (Levar {formatCurrency(order.payment.changeFor - order.total)})
                </p>
              )}
              <p className="text-[10px] text-slate-600 mt-0.5">
                Status: {order.payment.status === 'paid' ? 'CONFIRMADO / PAGO' : 'AGUARDANDO PAGAMENTO'}
              </p>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 pt-1">
              <p>CardapioPro SaaS · Automação Comercial</p>
              <p className="mt-1">*** FIM DA COMANDA ***</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Fechar
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            Concluir Impressão
          </button>
        </div>
      </div>
    </div>
  );
};
