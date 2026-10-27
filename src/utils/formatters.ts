import { Order, Store } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Builds standard WhatsApp message ticket for orders
 */
export function buildWhatsAppOrderMessage(order: Order, store: Store): string {
  const lines: string[] = [];

  lines.push(`🔔 *NOVO PEDIDO ${order.displayId}*`);
  lines.push(`🏪 *${store.name}*`);
  lines.push(`📅 ${formatDate(order.createdAt)}`);
  lines.push('────────────────────────');
  lines.push(`👤 *Cliente:* ${order.customer.name}`);
  lines.push(`📱 *Telefone:* ${order.customer.phone}`);

  if (order.type === 'delivery' && order.customer.address) {
    const addr = order.customer.address;
    lines.push(`🛵 *Entrega em:*`);
    lines.push(`   ${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}`);
    lines.push(`   Bairro: ${addr.neighborhood}`);
    if (addr.reference) lines.push(`   Ref: ${addr.reference}`);
  } else if (order.type === 'takeaway') {
    lines.push(`🛍️ *Tipo:* Retirada no Balcão`);
  } else if (order.type === 'dine_in') {
    lines.push(`🍽️ *Tipo:* Consumo no Local (Mesa ${order.customer.tableNumber || '-'})`);
  }

  lines.push('────────────────────────');
  lines.push('📋 *ITENS DO PEDIDO:*');

  order.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. *${item.quantity}x ${item.name}* - ${formatCurrency(item.subtotal)}`);

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach((opt) => {
        lines.push(`   + ${opt.itemName} ${opt.price > 0 ? `(${formatCurrency(opt.price)})` : ''}`);
      });
    }

    if (item.removedIngredients && item.removedIngredients.length > 0) {
      lines.push(`   - ${item.removedIngredients.join(', ')}`);
    }

    if (item.observation) {
      lines.push(`   📝 Obs: _${item.observation}_`);
    }
  });

  lines.push('────────────────────────');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    lines.push(`Taxa de Entrega: ${formatCurrency(order.deliveryFee)}`);
  }
  if (order.discount > 0) {
    lines.push(`Desconto (${order.couponCode || 'Cupom'}): -${formatCurrency(order.discount)}`);
  }
  lines.push(`*TOTAL: ${formatCurrency(order.total)}*`);
  lines.push('────────────────────────');

  const payMap: Record<string, string> = {
    pix: '⚡ Pix (Online/Copia e Cola)',
    cash: `💵 Dinheiro ${order.payment.changeFor ? `(Troco para ${formatCurrency(order.payment.changeFor)})` : '(Sem troco)'}`,
    card_delivery: '💳 Cartão na Entrega (Maquininha)',
    card_online: '💳 Cartão Online',
  };
  lines.push(`💳 *Forma de Pagamento:* ${payMap[order.payment.method] || order.payment.method}`);
  lines.push(`Status do Pagamento: ${order.payment.status === 'paid' ? '✅ PAGO' : '⏳ PENDENTE'}`);

  if (order.payment.method === 'pix' && order.payment.status !== 'paid') {
    lines.push('────────────────────────');
    lines.push('🔑 *INSTRUÇÕES DE PAGAMENTO PIX:*');
    lines.push('Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2');
    lines.push(`Banco: Banco Itaú S.A. (341)`);
    lines.push(`Titular: ${store.pixConfig?.beneficiaryName || 'Itaú Unibanco / CardapioPro'}`);
    if (order.payment.pixPayload) {
      lines.push('📋 *Pix Copia e Cola:*');
      lines.push(order.payment.pixPayload);
    }
  }

  lines.push('────────────────────────');
  lines.push(`📲 *Acompanhe seu pedido em tempo real:*`);
  const baseUrl = window.location.origin;
  lines.push(`${baseUrl}/cardapio/${store.slug}/pedido/${order.id}`);

  return lines.join('\n');
}

/**
 * Builds direct WhatsApp URL specifically targeting the store's configured phone number
 */
export function getStoreWhatsAppDirectLink(order: Order, store: Store): string {
  const message = buildWhatsAppOrderMessage(order, store);
  let cleanNumber = (store.whatsapp || '').replace(/\D/g, '');
  if (cleanNumber.length === 10 || cleanNumber.length === 11) {
    cleanNumber = `55${cleanNumber}`;
  }
  return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`;
}

/**
 * Web Audio API synthesizer for crisp kitchen and new order chimes
 */
export function playOrderAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Two-tone friendly chime (880Hz then 1320Hz)
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.18); // D6
    gain2.gain.setValueAtTime(0.35, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio alert not permitted or supported yet', err);
  }
}
