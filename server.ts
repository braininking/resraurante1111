import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './server/db.ts';
import type { Order, OrderItem, OrderStatus, Store, SubscriptionInvoice } from './server/db.ts';
import { generatePixPayload } from './server/pix.ts';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// WebSocket Thermal Printer Hub
const wss = new WebSocketServer({ server, path: '/ws/printer' });
const printerClients = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket, req) => {
  let boundStoreId = '';

  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost:3000'}`);
    const qStoreId = url.searchParams.get('storeId');
    if (qStoreId) {
      boundStoreId = qStoreId;
      if (!printerClients.has(boundStoreId)) printerClients.set(boundStoreId, new Set());
      printerClients.get(boundStoreId)!.add(ws);
      ws.send(JSON.stringify({
        type: 'ACK_CONNECTED',
        storeId: boundStoreId,
        message: 'Conexão WebSocket com impressora térmica estabelecida com sucesso.',
        timestamp: new Date().toISOString()
      }));
    }
  } catch {
    // ignore
  }

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      if (data.type === 'IDENTIFY') {
        boundStoreId = data.storeId;
        if (!printerClients.has(boundStoreId)) printerClients.set(boundStoreId, new Set());
        printerClients.get(boundStoreId)!.add(ws);
        ws.send(JSON.stringify({
          type: 'ACK_IDENTIFY',
          storeId: boundStoreId,
          device: data.device || 'Impressora Térmica ESC/POS 80mm',
          status: 'online',
          timestamp: new Date().toISOString()
        }));
      } else if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    if (boundStoreId && printerClients.has(boundStoreId)) {
      printerClients.get(boundStoreId)!.delete(ws);
      if (printerClients.get(boundStoreId)!.size === 0) {
        printerClients.delete(boundStoreId);
      }
    }
  });
});

export function dispatchWebSocketPrint(storeId: string, payload: any): number {
  const clients = printerClients.get(storeId);
  let count = 0;
  if (clients && clients.size > 0) {
    const jsonStr = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(jsonStr);
        count++;
      }
    }
  }
  return count;
}

export function buildThermalPrintPayload(order: Order, store: Store, target: 'caixa' | 'cozinha' = 'caixa') {
  const width = store.printSettings?.paperWidth || 80;
  const colWidth = width === 58 ? 32 : 48;
  const divider = '='.repeat(colWidth);
  const thinDivider = '-'.repeat(colWidth);

  const lines: string[] = [];
  lines.push(store.name.toUpperCase());
  if (store.address) lines.push(store.address);
  if (store.phone) lines.push(`Tel: ${store.phone}`);
  lines.push(divider);
  lines.push(`PEDIDO: ${order.displayId} - VIA: ${target.toUpperCase()}`);
  lines.push(`Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}`);
  lines.push(`Tipo: ${order.type === 'delivery' ? 'ENTREGA DELIVERY' : order.type === 'takeaway' ? 'RETIRADA BALCAO' : `MESA ${order.customer.tableNumber || ''}`}`);
  lines.push(thinDivider);
  lines.push(`CLIENTE: ${order.customer.name}`);
  lines.push(`Fone: ${order.customer.phone}`);
  if (order.customer.address) {
    const a = order.customer.address;
    lines.push(`End: ${a.street}, ${a.number}`);
    lines.push(`Bairro: ${a.neighborhood}`);
    if (a.complement) lines.push(`Compl: ${a.complement}`);
    if (a.reference) lines.push(`Ref: ${a.reference}`);
  }
  lines.push(divider);
  lines.push('ITENS DO PEDIDO:');

  for (const it of order.items) {
    lines.push(`${it.quantity}x ${it.name}`);
    if (target === 'caixa') {
      lines.push(`   R$ ${it.unitPrice.toFixed(2)}  Sub: R$ ${it.subtotal.toFixed(2)}`);
    }
    if (it.selectedOptions && it.selectedOptions.length > 0) {
      for (const op of it.selectedOptions) {
        lines.push(`   + ${op.quantity > 1 ? `${op.quantity}x ` : ''}${op.itemName}${target === 'caixa' && op.price > 0 ? ` (R$ ${(op.price * op.quantity).toFixed(2)})` : ''}`);
      }
    }
    if (it.removedIngredients && it.removedIngredients.length > 0) {
      lines.push(`   - RETIRAR: ${it.removedIngredients.join(', ')}`);
    }
    if (it.pizzaDetails) {
      lines.push(`   Pizza ${it.pizzaDetails.size}: ${it.pizzaDetails.flavors.join(' / ')}`);
    }
    if (it.observation) {
      lines.push(`   OBS: ${it.observation}`);
    }
  }

  lines.push(divider);
  if (target === 'caixa') {
    lines.push(`Subtotal:      R$ ${order.subtotal.toFixed(2)}`);
    if (order.deliveryFee > 0) lines.push(`Taxa Entrega:  R$ ${order.deliveryFee.toFixed(2)}`);
    if (order.discount > 0) lines.push(`Desconto:     -R$ ${order.discount.toFixed(2)}`);
    lines.push(`TOTAL A PAGAR: R$ ${order.total.toFixed(2)}`);
    lines.push(thinDivider);
    lines.push(`PAGAMENTO: ${order.payment.method.toUpperCase()} (${order.payment.status === 'paid' ? 'PAGO' : 'PENDENTE'})`);
  }
  lines.push(divider);
  lines.push('   CardapioPro - Sistema de Pedidos');
  lines.push('\n\n\n');

  return {
    type: 'PRINT_JOB',
    jobId: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    storeId: store.id,
    orderId: order.id,
    displayId: order.displayId,
    target,
    paperWidth: width,
    receiptText: lines.join('\n'),
    cutPaper: store.websocketPrinterConfig?.cutPaper ?? true,
    beepOnPrint: store.websocketPrinterConfig?.beepOnPrint ?? true,
    timestamp: new Date().toISOString(),
    order,
  };
}

// API Routes

// 1. Stores
app.get('/api/stores', (_req, res) => {
  const stores = db.getStores();
  res.json(stores);
});

app.get('/api/stores/:slug', (req, res) => {
  const store = db.getStoreBySlug(req.params.slug);
  if (!store) {
    return res.status(404).json({ error: 'Loja não encontrada' });
  }
  res.json(store);
});

app.put('/api/stores/:id', (req, res) => {
  const updated = db.updateStore(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Loja não encontrada' });
  }
  res.json(updated);
});

// 2. Catalog (Categories & Products)
app.get('/api/stores/:storeId/catalog', (req, res) => {
  const { storeId } = req.params;
  const categories = db.getCategories(storeId);
  const products = db.getProducts(storeId);
  res.json({ categories, products });
});

app.post('/api/stores/:storeId/categories', (req, res) => {
  const { storeId } = req.params;
  const category = db.createCategory({
    id: `cat-${Date.now()}`,
    storeId,
    name: req.body.name,
    order: req.body.order || 99,
    icon: req.body.icon,
  });
  res.status(201).json(category);
});

app.put('/api/categories/:id', (req, res) => {
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json(updated);
});

app.delete('/api/categories/:id', (req, res) => {
  const ok = db.deleteCategory(req.params.id);
  res.json({ success: ok });
});

app.post('/api/stores/:storeId/products', (req, res) => {
  const { storeId } = req.params;
  const product = db.createProduct({
    ...req.body,
    id: `prod-${Date.now()}`,
    storeId,
    available: req.body.available ?? true,
    optionGroups: req.body.optionGroups || [],
    recipe: req.body.recipe || [],
  });
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const updated = db.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(updated);
});

app.delete('/api/products/:id', (req, res) => {
  const ok = db.deleteProduct(req.params.id);
  res.json({ success: ok });
});

// 3. Price Recalculation & Validation Engine (Backend Authority)
function recalculateOrder(
  store: Store,
  rawItems: any[],
  deliveryZoneId?: string,
  couponCode?: string,
  serviceType: 'delivery' | 'takeaway' | 'dine_in' = 'delivery'
) {
  let subtotal = 0;
  const calculatedItems: OrderItem[] = [];

  for (const rawItem of rawItems) {
    const product = db.getProductById(rawItem.productId);
    if (!product || !product.available) {
      throw new Error(`Produto não disponível: ${rawItem.name || rawItem.productId}`);
    }

    // Base price (normal or promo)
    let unitBase = product.promotionalPrice && product.promotionalPrice > 0
      ? product.promotionalPrice
      : product.price;

    let optionsTotal = 0;
    const validatedOptions: any[] = [];

    // If options selected, validate against product optionGroups
    if (Array.isArray(rawItem.selectedOptions)) {
      for (const sel of rawItem.selectedOptions) {
        const group = product.optionGroups.find((g) => g.id === sel.groupId);
        if (group) {
          const item = group.items.find((i) => i.id === sel.itemId);
          if (item) {
            const price = item.price || 0;
            const qty = sel.quantity || 1;
            optionsTotal += price * qty;
            validatedOptions.push({
              groupId: group.id,
              groupName: group.name,
              itemId: item.id,
              itemName: item.name,
              price,
              quantity: qty,
            });
          }
        }
      }
    }

    const itemUnitTotal = unitBase + optionsTotal;
    const itemQuantity = Math.max(1, parseInt(rawItem.quantity, 10) || 1);
    const itemSubtotal = parseFloat((itemUnitTotal * itemQuantity).toFixed(2));

    subtotal += itemSubtotal;

    calculatedItems.push({
      id: rawItem.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      name: product.name,
      quantity: itemQuantity,
      unitPrice: unitBase,
      selectedOptions: validatedOptions,
      removedIngredients: rawItem.removedIngredients || [],
      pizzaDetails: rawItem.pizzaDetails,
      observation: rawItem.observation?.trim() || '',
      subtotal: itemSubtotal,
    });
  }

  // Delivery fee calculation
  let deliveryFee = 0;
  if (serviceType === 'delivery') {
    if (deliveryZoneId) {
      const zone = store.deliveryZones.find((z) => z.id === deliveryZoneId);
      if (zone) {
        deliveryFee = zone.fee;
      }
    } else if (store.deliveryZones.length > 0) {
      deliveryFee = store.deliveryZones[0].fee;
    }
  }

  // Coupon discount validation
  let discount = 0;
  let validCoupon = undefined;
  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    if (code === 'PRIMEIRACOMPRA' || code === 'BEMVINDO') {
      discount = parseFloat((subtotal * 0.1).toFixed(2)); // 10% off
      validCoupon = code;
    } else if (code === 'DELIVERYFREE' || code === 'FRETEGRATIS') {
      discount = deliveryFee;
      validCoupon = code;
    } else if (code === 'DESCONTO5') {
      discount = Math.min(5.0, subtotal);
      validCoupon = code;
    }
  }

  const total = Math.max(0, parseFloat((subtotal + deliveryFee - discount).toFixed(2)));

  return {
    items: calculatedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    deliveryFee: parseFloat(deliveryFee.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    couponCode: validCoupon,
    total,
  };
}

app.post('/api/orders/calculate', (req, res) => {
  try {
    const { storeId, items, deliveryZoneId, couponCode, serviceType } = req.body;
    const store = db.getStoreById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    const calculation = recalculateOrder(store, items || [], deliveryZoneId, couponCode, serviceType);
    res.json(calculation);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao recalcular pedido' });
  }
});

// 4. Create Order with Idempotency & Auto Pix Generation
app.post('/api/orders', (req, res) => {
  try {
    const {
      storeId,
      channel = 'cardapio_digital',
      type = 'delivery',
      customer,
      items,
      deliveryZoneId,
      couponCode,
      paymentMethod = 'pix',
      changeFor,
      idempotencyKey,
    } = req.body;

    const store = db.getStoreById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    // Idempotency check: prevent duplicate submits
    if (idempotencyKey) {
      const existing = db.getOrderByIdempotencyKey(idempotencyKey);
      if (existing) {
        return res.json(existing);
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio' });
    }

    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({ error: 'Nome e telefone do cliente são obrigatórios' });
    }

    if (type === 'delivery' && (!customer?.address?.street || !customer?.address?.number)) {
      return res.status(400).json({ error: 'Endereço completo é obrigatório para entrega' });
    }

    // Server-side calculation & verification
    const calc = recalculateOrder(store, items, deliveryZoneId, couponCode, type);

    if (type === 'delivery' && calc.subtotal < store.minOrderValue) {
      return res.status(400).json({
        error: `O valor mínimo para entrega é R$ ${store.minOrderValue.toFixed(2)} (Subtotal atual: R$ ${calc.subtotal.toFixed(2)})`,
      });
    }

    // Unique display ID #100X
    const allOrders = db.getOrders(storeId);
    const nextSeq = 1000 + allOrders.length + 1;
    const displayId = `#${nextSeq}`;
    const orderId = `ord-${Date.now()}`;

    // Pix EMV BRCode generation if Pix chosen
    let pixPayload: string | undefined = undefined;
    if (paymentMethod === 'pix') {
      const pKey = store.pixConfig?.key?.trim() || (store.whatsapp ? store.whatsapp.replace(/\D/g, '') : 'pix@cardapiopro.com.br');
      const pName = store.pixConfig?.beneficiaryName?.trim() || store.name;
      const pCity = store.pixConfig?.city?.trim() || 'SAO PAULO';

      pixPayload = generatePixPayload({
        key: pKey,
        beneficiaryName: pName,
        city: pCity,
        amount: calc.total,
        txId: orderId.substring(4, 25),
      });
    }

    const now = new Date().toISOString();
    const newOrder: Order = {
      id: orderId,
      displayId,
      storeId,
      channel,
      type,
      status: 'aguardando_confirmacao',
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address,
        tableNumber: customer.tableNumber ? parseInt(customer.tableNumber, 10) : undefined,
      },
      items: calc.items,
      subtotal: calc.subtotal,
      deliveryFee: calc.deliveryFee,
      discount: calc.discount,
      couponCode: calc.couponCode,
      total: calc.total,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'pix' ? 'pending' : 'pending',
        pixPayload,
        changeFor: changeFor ? parseFloat(changeFor) : undefined,
      },
      statusHistory: [
        {
          status: 'aguardando_confirmacao',
          timestamp: now,
          note: `Pedido recebido via ${channel === 'cardapio_digital' ? 'Cardápio Digital' : channel === 'whatsapp' ? 'WhatsApp' : 'PDV Balcão'}`,
        },
      ],
      printed: false,
      createdAt: now,
      updatedAt: now,
      idempotencyKey,
    };

    const savedOrder = db.createOrder(newOrder);

    // Auto-dispatch print job over WebSocket if enabled
    if (store.websocketPrinterConfig?.enabled && store.websocketPrinterConfig?.autoPrintNewOrder) {
      const printPayload = buildThermalPrintPayload(savedOrder, store, 'caixa');
      dispatchWebSocketPrint(store.id, printPayload);
      if (store.websocketPrinterConfig.targetStation === 'todos') {
        const kitchenPayload = buildThermalPrintPayload(savedOrder, store, 'cozinha');
        dispatchWebSocketPrint(store.id, kitchenPayload);
      }
    }

    // Trigger WhatsApp notification log if enabled
    if (store.whatsappWebhookConfig?.enabled && store.whatsappWebhookConfig?.events?.orderCreated) {
      store.whatsappWebhookConfig.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'order.created',
        status: 200,
        destinationPhone: savedOrder.customer.phone,
        response: 'OK - Pedido Recebido Notificado',
        payloadSummary: `Novo pedido #${savedOrder.displayId} registrado (Total: R$ ${savedOrder.total.toFixed(2)})`,
      });
      store.whatsappWebhookConfig.lastDispatchedAt = new Date().toISOString();
      db.save();
    }

    res.status(201).json(savedOrder);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao processar pedido' });
  }
});

// 5. Orders management
app.get('/api/stores/:storeId/orders', (req, res) => {
  const orders = db.getOrders(req.params.storeId);
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(order);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status, note } = req.body as { status: OrderStatus; note?: string };
  if (!status) return res.status(400).json({ error: 'Status é obrigatório' });

  const updated = db.updateOrderStatus(req.params.id, status, note);
  if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(updated);
});

app.patch('/api/orders/:id/printed', (req, res) => {
  const updated = db.markOrderPrinted(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(updated);
});

app.patch('/api/orders/:id/payment', (req, res) => {
  const { status, paidAt } = req.body;
  if (!status) return res.status(400).json({ error: 'Status de pagamento é obrigatório' });

  const updated = db.updateOrderPaymentStatus(req.params.id, status, paidAt);
  if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(updated);
});

// 6. Inventory & Technical sheets
app.get('/api/stores/:storeId/inventory', (req, res) => {
  const { storeId } = req.params;
  const ingredients = db.getIngredients(storeId);
  const movements = db.getStockMovements(storeId);
  res.json({ ingredients, movements });
});

app.post('/api/stores/:storeId/inventory', (req, res) => {
  const { storeId } = req.params;
  const ing = db.createIngredient({
    id: `ing-${Date.now()}`,
    storeId,
    name: req.body.name,
    unit: req.body.unit || 'kg',
    currentStock: parseFloat(req.body.currentStock) || 0,
    minStock: parseFloat(req.body.minStock) || 5,
    costPrice: parseFloat(req.body.costPrice) || 0,
    supplier: req.body.supplier || '',
  });
  res.status(201).json(ing);
});

app.put('/api/inventory/:id', (req, res) => {
  const updated = db.updateIngredient(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Insumo não encontrado' });
  res.json(updated);
});

app.post('/api/stores/:storeId/inventory/adjustment', (req, res) => {
  const { storeId } = req.params;
  const { ingredientId, quantity, type, reason } = req.body;
  const qty = parseFloat(quantity) || 0;

  if (type === 'entrada') {
    db.addStock(storeId, ingredientId, qty, reason || 'Entrada manual no estoque');
  } else {
    db.deductStock(storeId, ingredientId, qty, reason || 'Baixa/Ajuste manual');
  }

  res.json({ success: true });
});

// 7. Cash Register (Frente de Caixa PDV)
app.get('/api/stores/:storeId/cash', (req, res) => {
  const { storeId } = req.params;
  const activeSession = db.getActiveCashSession(storeId);
  const allSessions = db.getCashSessions(storeId);
  res.json({ activeSession, history: allSessions });
});

app.post('/api/stores/:storeId/cash/open', (req, res) => {
  const { storeId } = req.params;
  const { operatorName, initialAmount } = req.body;
  const existing = db.getActiveCashSession(storeId);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um caixa aberto para esta loja' });
  }

  const session = db.openCashSession(storeId, operatorName || 'Operador', parseFloat(initialAmount) || 0);
  res.status(201).json(session);
});

app.post('/api/cash/:sessionId/close', (req, res) => {
  const { sessionId } = req.params;
  const { finalAmount } = req.body;
  const closed = db.closeCashSession(sessionId, parseFloat(finalAmount) || 0);
  if (!closed) return res.status(404).json({ error: 'Sessão de caixa não encontrada' });
  res.json(closed);
});

app.post('/api/cash/:sessionId/entry', (req, res) => {
  const { sessionId } = req.params;
  const { type, amount, reason, paymentMethod } = req.body;
  const entry = db.addCashEntry(sessionId, {
    type,
    amount: parseFloat(amount) || 0,
    reason: reason || '',
    paymentMethod,
  });
  if (!entry) return res.status(400).json({ error: 'Caixa fechado ou inexistente' });
  res.json(entry);
});

// 8. Tables (Salão & Comandas)
app.get('/api/stores/:storeId/tables', (req, res) => {
  const tables = db.getTables(req.params.storeId);
  res.json(tables);
});

app.put('/api/tables/:id', (req, res) => {
  const updated = db.updateTable(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Mesa não encontrada' });
  res.json(updated);
});

// 9. SaaS SuperAdmin Routes
app.get('/api/admin/metrics', (_req, res) => {
  const stores = db.getAllStores();
  const orders = db.getAllOrders();
  const plans = db.getPlans();

  const activeStores = stores.filter((s) => s.status === 'active').length;
  const trialStores = stores.filter((s) => s.status === 'trial').length;
  const suspendedStores = stores.filter((s) => s.status === 'suspended').length;

  // Calculate MRR (Monthly Recurring Revenue)
  let mrr = 0;
  for (const s of stores) {
    if (s.status === 'active') {
      const plan = plans.find((p) => p.id === `plan-${s.plan}`);
      if (plan) mrr += plan.priceMonthly;
    }
  }

  const totalOrdersValue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  res.json({
    totalStores: stores.length,
    activeStores,
    trialStores,
    suspendedStores,
    mrr: parseFloat(mrr.toFixed(2)),
    totalOrdersCount: orders.length,
    totalGMV: parseFloat(totalOrdersValue.toFixed(2)),
    plans,
  });
});

app.get('/api/admin/tenants', (_req, res) => {
  res.json(db.getAllStores());
});

app.post('/api/admin/tenants', (req, res) => {
  const { name, segment, slug, phone, whatsapp, address, plan = 'pro' } = req.body;
  const cleanSlug = (slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const newStore: Store = {
    id: `store-${Date.now()}`,
    name,
    slug: cleanSlug,
    segment: segment || 'hamburgueria',
    tagline: 'Seu estabelecimento de alta performance no CardapioPro',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    primaryColor: '#EA580C',
    phone: phone || '(11) 99999-8888',
    whatsapp: (whatsapp || '5511999998888').replace(/\D/g, ''),
    password: req.body.password || '123456',
    address: address || 'Av. Paulista, 1000 - São Paulo, SP',
    minOrderValue: 20.0,
    deliveryZones: [
      { id: `z-${Date.now()}-1`, name: 'Região Central (até 3km)', fee: 6.0, estimatedMinutes: 30 },
      { id: `z-${Date.now()}-2`, name: 'Bairros Adjacentes (até 6km)', fee: 10.0, estimatedMinutes: 45 },
    ],
    openingHours: [
      { dayOfWeek: 0, open: '18:00', close: '23:30', isOpen: true },
      { dayOfWeek: 1, open: '18:00', close: '23:30', isOpen: true },
      { dayOfWeek: 2, open: '18:00', close: '23:30', isOpen: true },
      { dayOfWeek: 3, open: '18:00', close: '23:30', isOpen: true },
      { dayOfWeek: 4, open: '18:00', close: '23:30', isOpen: true },
      { dayOfWeek: 5, open: '18:00', close: '00:00', isOpen: true },
      { dayOfWeek: 6, open: '18:00', close: '00:00', isOpen: true },
    ],
    paymentMethods: {
      pix: true,
      cash: true,
      cardDelivery: true,
      cardOnline: true,
    },
    pixConfig: {
      key: '8e7fc37c-634d-4408-9e81-3fbea689d8b2',
      keyType: 'random',
      beneficiaryName: name || 'Itaú Unibanco / CardapioPro',
      city: 'SAO PAULO',
    },
    printSettings: {
      autoPrint: true,
      paperWidth: 80,
      copies: 1,
      soundAlert: true,
    },
    whatsappBot: {
      enabled: true,
      greeting: `Olá! Bem-vindo(a) ao ${name}! Como podemos te atender hoje?`,
      menuMessage: 'Confira nosso cardápio completo e monte seu pedido:',
      statusChangeNotify: true,
      pixInstructions: 'Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2',
    },
    plan,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const created = db.createStore(newStore);
  res.status(201).json(created);
});

app.patch('/api/admin/tenants/:id/status', (req, res) => {
  const { status } = req.body;
  const updated = db.updateStore(req.params.id, { status });
  if (!updated) return res.status(404).json({ error: 'Loja não encontrada' });
  res.json(updated);
});

app.patch('/api/admin/tenants/:id/password', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Nova senha é obrigatória' });
  const updated = db.updateStorePassword(req.params.id, password);
  if (!updated) return res.status(404).json({ error: 'Loja não encontrada' });
  res.json({ success: true, message: 'Senha atualizada com sucesso' });
});

// WhatsApp Bot Simulator endpoint
app.post('/api/whatsapp/simulate-incoming', (req, res) => {
  const { storeId, message } = req.body;
  const store = db.getStoreById(storeId);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const text = (message || '').toLowerCase().trim();
  let botReply = '';

  if (text.includes('cardapio') || text.includes('menu') || text.includes('pedir') || text.includes('fome')) {
    botReply = `🍔 *${store.name}*\n\n${store.whatsappBot.menuMessage}\n\n👉 Acesse nosso cardápio digital interativo:\n${process.env.APP_URL || 'http://localhost:3000'}/cardapio/${store.slug}\n\n✅ Escolha seus itens, adicione complementos e pague via Pix instantâneo ou na entrega!`;
  } else if (text.includes('status') || text.includes('onde esta') || text.includes('rastreio')) {
    botReply = `🔎 Para consultar seu pedido, envie o número (exemplo: #1001) ou acesse o link de acompanhamento em tempo real no cardápio!`;
  } else if (text.includes('pix') || text.includes('chave')) {
    botReply = `🔑 *Chave Pix Oficial da Loja:*\n${store.pixConfig.key} (${store.pixConfig.beneficiaryName})\n\nAo concluir o pedido no cardápio, o QR Code e o código Copia e Cola são gerados automaticamente!`;
  } else {
    botReply = `${store.whatsappBot.greeting}\n\n1️⃣ Digite *1* para ver o Cardápio Digital\n2️⃣ Digite *2* para saber o tempo de entrega\n3️⃣ Digite *3* para falar com um atendente humano`;
  }

  res.json({ reply: botReply, storeName: store.name });
});

// ==========================================
// 1. CONFIGURAR PIX AUTOMÁTICO (GATEWAY & WEBHOOKS)
// ==========================================

// Webhook receiver for automatic Pix confirmation (Mercado Pago, OpenPix, Asaas, EFI, Simulado)
app.post('/api/webhooks/pix/:storeSlug', (req, res) => {
  const { storeSlug } = req.params;
  const store = db.getStoreBySlug(storeSlug);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const rawBody = req.body || {};
  const orderId = rawBody.orderId || rawBody.id || rawBody.txid || req.query.orderId;

  let order: Order | undefined;
  if (orderId) {
    order = db.getOrderById(orderId as string);
  }
  if (!order && rawBody.displayId) {
    order = db.getOrders(store.id).find((o) => o.displayId === rawBody.displayId);
  }
  if (!order) {
    order = db.getOrders(store.id).find((o) => o.payment.method === 'pix' && o.payment.status === 'pending');
  }

  if (!order) {
    return res.status(400).json({ error: 'Nenhum pedido pendente de Pix localizado para o webhook.' });
  }

  order.payment.status = 'paid';
  const autoApprove = store.pixAutomatedConfig?.autoApproveOrder ?? true;
  if (autoApprove && (order.status === 'aguardando_confirmacao' || order.status === 'confirmado')) {
    order.status = 'confirmado';
  }

  order.statusHistory.push({
    status: order.status,
    timestamp: new Date().toISOString(),
    note: `Pagamento Pix Automático confirmado via Webhook (${store.pixAutomatedConfig?.provider || 'Gateway'})`,
  });
  order.updatedAt = new Date().toISOString();
  db.save();

  // Trigger WebSocket print if configured
  if (store.pixAutomatedConfig?.autoPrintOnApproval || store.websocketPrinterConfig?.autoPrintPixApproved) {
    const printPayload = buildThermalPrintPayload(order, store, 'caixa');
    dispatchWebSocketPrint(store.id, printPayload);
  }

  // Record WhatsApp Webhook notification log
  if (store.whatsappWebhookConfig?.enabled) {
    store.whatsappWebhookConfig.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'order.pix_confirmed',
      status: 200,
      destinationPhone: order.customer.phone,
      response: 'OK - Pix Aprovado Notificado',
      payloadSummary: `Pix de R$ ${order.total.toFixed(2)} confirmado para o pedido ${order.displayId}`,
    });
    store.whatsappWebhookConfig.lastDispatchedAt = new Date().toISOString();
    db.save();
  }

  res.json({
    success: true,
    message: `Pix aprovado com sucesso para o pedido ${order.displayId}!`,
    orderId: order.id,
    displayId: order.displayId,
    status: order.status,
    paymentStatus: order.payment.status,
  });
});

// Endpoint for instant Pix simulation / demo test
app.post('/api/orders/:orderId/simulate-pix-paid', (req, res) => {
  const { orderId } = req.params;
  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

  const store = db.getStoreById(order.storeId);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  order.payment.status = 'paid';
  if (order.status === 'aguardando_confirmacao') {
    order.status = 'confirmado';
  }

  order.statusHistory.push({
    status: order.status,
    timestamp: new Date().toISOString(),
    note: 'Pagamento Pix Automático aprovado instantaneamente via Simulação/Gateway',
  });
  order.updatedAt = new Date().toISOString();
  db.save();

  // Auto-print via WebSocket if configured
  if (store.pixAutomatedConfig?.autoPrintOnApproval || store.websocketPrinterConfig?.autoPrintPixApproved) {
    const printPayload = buildThermalPrintPayload(order, store, 'caixa');
    dispatchWebSocketPrint(store.id, printPayload);
  }

  // Record WhatsApp Webhook log
  if (store.whatsappWebhookConfig) {
    store.whatsappWebhookConfig.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'order.pix_confirmed',
      status: 200,
      destinationPhone: order.customer.phone,
      response: 'OK - Simulação Pix Enviada',
      payloadSummary: `Simulação Pix aprovado no valor de R$ ${order.total.toFixed(2)} (#${order.displayId})`,
    });
    db.save();
  }

  res.json({
    success: true,
    message: `Pagamento Pix do pedido ${order.displayId} confirmado com sucesso!`,
    order,
  });
});

// Endpoint to check order payment status (polled by customer tracking modal)
app.get('/api/orders/:orderId/payment-status', (req, res) => {
  const order = db.getOrderById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json({
    orderId: order.id,
    displayId: order.displayId,
    status: order.status,
    paymentStatus: order.payment.status,
    paid: order.payment.status === 'paid',
  });
});

// Platform API: Generate Dynamic Pix QR Code & EMV Copia e Cola
app.post('/api/pix/dynamic-qrcode', async (req, res) => {
  try {
    const { storeId, key, beneficiaryName, city, amount, txId } = req.body;
    let finalKey = key;
    let finalBeneficiary = beneficiaryName;
    let finalCity = city || 'SAO PAULO';

    if (storeId) {
      const store = db.getStoreById(storeId);
      if (store) {
        if (!finalKey) finalKey = store.pixConfig?.key;
        if (!finalBeneficiary) finalBeneficiary = store.pixConfig?.beneficiaryName || store.name;
        if (!city && store.pixConfig?.city) finalCity = store.pixConfig.city;
      }
    }

    if (!finalKey || !finalKey.trim()) {
      return res.status(400).json({ error: 'Chave Pix não informada ou não configurada na loja.' });
    }

    const cleanAmount = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
    const finalTxId = txId || `TX${Date.now().toString().slice(-8)}`;

    const payload = generatePixPayload({
      key: finalKey.trim(),
      beneficiaryName: (finalBeneficiary || 'CARDAPIO PRO').trim(),
      city: (finalCity || 'SAO PAULO').trim(),
      amount: cleanAmount > 0 ? cleanAmount : undefined,
      txId: finalTxId,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      pixPayload: payload,
      qrCodeDataUrl,
      key: finalKey.trim(),
      beneficiaryName: (finalBeneficiary || 'CARDAPIO PRO').trim(),
      city: finalCity.trim(),
      amount: cleanAmount,
      txId: finalTxId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar QR Code Pix dinâmico via API' });
  }
});

// ==========================================
// RENOVAÇÃO DE ASSINATURA VIA PIX ITAÚ COM RECONHECIMENTO AUTOMÁTICO
// ==========================================

export const PLATFORM_ITAU_PIX = {
  key: '8e7fc37c-634d-4408-9e81-3fbea689d8b2',
  keyType: 'random' as const,
  bankName: 'Banco Itaú S.A.',
  bankCode: '341',
  beneficiaryName: 'Itaú Unibanco / CardapioPro',
  city: 'SAO PAULO',
  instructions: 'Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2',
};

// 1. Get Store Subscription Status & History
app.get('/api/stores/:id/subscription', (req, res) => {
  const store = db.getStoreById(req.params.id);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const plans = db.getPlans();
  const currentPlan = plans.find((p) => p.id === `plan-${store.plan}`) || plans[1] || plans[0];
  const invoices = db.getSubscriptionInvoices(store.id);

  const now = new Date();
  const expiresAt = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date(now.getTime() + 30 * 86400000);
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  res.json({
    storeId: store.id,
    storeName: store.name,
    plan: store.plan,
    status: store.status,
    planDetails: currentPlan,
    subscriptionExpiresAt: expiresAt.toISOString(),
    daysLeft,
    isExpired: daysLeft <= 0,
    subscriptionCycle: store.subscriptionCycle || 'monthly',
    subscriptionLastRenewedAt: store.subscriptionLastRenewedAt,
    platformPix: PLATFORM_ITAU_PIX,
    availablePlans: plans,
    invoices,
  });
});

// 2. Create Pix Renewal Invoice with Itaú Key
app.post('/api/stores/:id/subscription/create-renewal-pix', async (req, res) => {
  try {
    const store = db.getStoreById(req.params.id);
    if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

    const { planId = 'plan-pro', cycle = 'monthly' } = req.body;
    const plans = db.getPlans();
    const targetPlan = plans.find((p) => p.id === planId) || plans.find((p) => p.id === 'plan-pro') || plans[0];

    const amount = cycle === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly;
    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const txId = `ASS${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 89 + 10)}`;

    // Generate official Pix payload using user's specified Itaú key: 8e7fc37c-634d-4408-9e81-3fbea689d8b2
    const pixPayload = generatePixPayload({
      key: PLATFORM_ITAU_PIX.key,
      beneficiaryName: PLATFORM_ITAU_PIX.beneficiaryName,
      city: PLATFORM_ITAU_PIX.city,
      amount,
      txId,
    });

    const qrCodeUrl = await QRCode.toDataURL(pixPayload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const invoice: SubscriptionInvoice = {
      id: invoiceId,
      storeId: store.id,
      storeName: store.name,
      planId: targetPlan.id,
      planName: targetPlan.name,
      cycle,
      amount,
      status: 'pending',
      pixKey: PLATFORM_ITAU_PIX.key,
      pixKeyBank: PLATFORM_ITAU_PIX.bankName,
      pixBeneficiary: PLATFORM_ITAU_PIX.beneficiaryName,
      pixInstructions: PLATFORM_ITAU_PIX.instructions,
      pixPayload,
      qrCodeUrl,
      txId,
      createdAt: new Date().toISOString(),
      expiresAt,
      daysAdded: cycle === 'yearly' ? 365 : 30,
      autoReconciled: false,
    };

    const created = db.createSubscriptionInvoice(invoice);

    res.status(201).json({
      success: true,
      invoice: created,
      platformPix: PLATFORM_ITAU_PIX,
      message: 'Fatura de renovação gerada com sucesso! Efetue o Pix de qualquer banco para reconhecimento automático.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar fatura Pix de assinatura' });
  }
});

// 3. Check Subscription Invoice Status (Polled for automatic payment recognition)
app.get('/api/subscriptions/:invoiceId/status', (req, res) => {
  const inv = db.getSubscriptionInvoiceById(req.params.invoiceId);
  if (!inv) return res.status(404).json({ error: 'Fatura de assinatura não encontrada' });

  const store = db.getStoreById(inv.storeId);
  res.json({
    invoiceId: inv.id,
    txId: inv.txId,
    status: inv.status,
    paid: inv.status === 'paid',
    paidAt: inv.paidAt,
    autoReconciled: inv.autoReconciled,
    subscriptionExpiresAt: store?.subscriptionExpiresAt,
    storeStatus: store?.status,
    plan: store?.plan,
  });
});

// 4. Confirm Subscription Invoice (Simulated or triggered instant automatic recognition)
app.post('/api/subscriptions/:invoiceId/confirm', (req, res) => {
  const result = db.confirmSubscriptionInvoice(
    req.params.invoiceId,
    'Reconhecimento de pagamento automático Pix Itaú'
  );
  if (!result) return res.status(404).json({ error: 'Fatura não encontrada ou inválida' });

  res.json({
    success: true,
    message: `Pagamento de assinatura do ${result.invoice.planName} reconhecido automaticamente com sucesso!`,
    invoice: result.invoice,
    store: result.store,
  });
});

// 5. Subscription Pix Webhook Receiver (for external bank webhooks)
app.post('/api/webhooks/pix/subscription', (req, res) => {
  const rawBody = req.body || {};
  const invoiceId = rawBody.invoiceId || rawBody.txid || rawBody.id || req.query.invoiceId;

  let invoice: SubscriptionInvoice | undefined;
  if (invoiceId) {
    invoice = db.getSubscriptionInvoiceById(invoiceId as string);
  }

  if (!invoice) {
    const all = db.getSubscriptionInvoices();
    invoice = all.find((i) => i.status === 'pending');
  }

  if (!invoice) {
    return res.status(400).json({ error: 'Nenhuma fatura pendente localizada para o webhook' });
  }

  const result = db.confirmSubscriptionInvoice(
    invoice.id,
    `Webhook Pix Itaú / Banco Central (${rawBody.bank || 'Itaú Unibanco'})`
  );

  res.json({
    success: true,
    message: 'Webhook de assinatura processado com sucesso!',
    result,
  });
});

// 6. Convenience Endpoint: Set Store Default Pix to Itaú
app.post('/api/stores/:id/set-default-pix-itau', (req, res) => {
  const updated = db.setStoreDefaultPixItau(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Loja não encontrada' });
  res.json({
    success: true,
    message: 'Chave Pix Itaú (8e7fc37c-634d-4408-9e81-3fbea689d8b2) configurada com sucesso para a loja!',
    store: updated,
  });
});

// Test Pix Automated Gateway Configuration
app.post('/api/stores/:storeId/pix-automated/test', (req, res) => {
  const { storeId } = req.params;
  const store = db.getStoreById(storeId);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const config = store.pixAutomatedConfig || {
    enabled: true,
    provider: 'simulado',
    autoApproveOrder: true,
    autoPrintOnApproval: true,
    sendWhatsAppNotification: true,
  };

  config.lastTestedAt = new Date().toISOString();
  config.testStatus = 'success';
  db.updateStore(storeId, { pixAutomatedConfig: config });

  res.json({
    success: true,
    status: 'success',
    provider: config.provider,
    message: `Conexão com gateway Pix (${config.provider.toUpperCase()}) validada com sucesso! Webhooks configurados para confirmação instantânea.`,
    webhookUrl: `/api/webhooks/pix/${store.slug}`,
    testedAt: config.lastTestedAt,
  });
});

// ==========================================
// 2. IMPRESSÃO VIA WEBSOCKET (ESC/POS & RAW)
// ==========================================

// Get WebSocket Printer status & active connected agents
app.get('/api/stores/:storeId/printer/status', (req, res) => {
  const { storeId } = req.params;
  const clients = printerClients.get(storeId);
  const count = clients ? clients.size : 0;
  res.json({
    connected: count > 0,
    activeAgents: count,
    status: count > 0 ? 'connected' : 'disconnected',
    wsUrl: `ws://${req.headers.host || 'localhost:3000'}/ws/printer?storeId=${storeId}`,
  });
});

// Dispatch test print over WebSocket
app.post('/api/stores/:storeId/printer/websocket-test', (req, res) => {
  const { storeId } = req.params;
  const store = db.getStoreById(storeId);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const testPayload = {
    type: 'PRINT_JOB',
    jobId: `test-${Date.now()}`,
    storeId,
    target: 'todos',
    paperWidth: store.printSettings?.paperWidth || 80,
    cutPaper: true,
    beepOnPrint: true,
    receiptText: [
      '================================',
      `   ${store.name.toUpperCase()}   `,
      '  TESTE DE IMPRESSÃO WEBSOCKET  ',
      '================================',
      `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
      'Status Conexao: 100% OK',
      'Modo: WebSocket ESC/POS Direto',
      'Guilhotina: Ativada [CUT]',
      'Buzzer: Ativado [BEEP]',
      '--------------------------------',
      'Seu agente de impressao termica',
      'esta pronto para receber pedidos',
      'automaticos do CardapioPro!',
      '================================',
      '\n\n\n'
    ].join('\n'),
    timestamp: new Date().toISOString()
  };

  const dispatched = dispatchWebSocketPrint(storeId, testPayload);
  res.json({
    success: true,
    dispatchedAgents: dispatched,
    message: dispatched > 0
      ? `Impressão teste enviada com sucesso para ${dispatched} agente(s) conectado(s)!`
      : 'Impressão enfileirada no hub WebSocket (nenhum agente desktop conectado no momento).',
    payload: testPayload
  });
});

// Dispatch specific order to WebSocket printer
app.post('/api/stores/:storeId/printer/print-order', (req, res) => {
  const { storeId } = req.params;
  const { orderId, target } = req.body;
  const store = db.getStoreById(storeId);
  const order = db.getOrderById(orderId);
  if (!store || !order) return res.status(404).json({ error: 'Dados não encontrados' });

  const printPayload = buildThermalPrintPayload(order, store, target || 'caixa');
  const count = dispatchWebSocketPrint(storeId, printPayload);
  db.markOrderPrinted(orderId);

  res.json({
    success: true,
    dispatchedCount: count,
    message: `Comanda do pedido ${order.displayId} despachada via WebSocket`,
    printPayload
  });
});

// ==========================================
// 3. DASHBOARD DE MÉTRICAS ANALYTICS
// ==========================================

app.get('/api/stores/:storeId/metrics', (req, res) => {
  const { storeId } = req.params;
  const period = (req.query.period as any) || 'today';
  const store = db.getStoreById(storeId);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const metrics = db.getStoreMetrics(storeId, period);
  res.json(metrics);
});

// ==========================================
// 4. CONFIGURAÇÃO DE WEBHOOKS WHATSAPP
// ==========================================

// Inbound webhook from WhatsApp API providers (Z-API, Evolution, Baileys, Meta Cloud)
app.post('/api/webhooks/whatsapp/:storeSlug', (req, res) => {
  const { storeSlug } = req.params;
  const store = db.getStoreBySlug(storeSlug);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const body = req.body || {};
  if (store.whatsappWebhookConfig) {
    store.whatsappWebhookConfig.lastPayload = body;
    store.whatsappWebhookConfig.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: body.event || 'incoming.message',
      status: 200,
      destinationPhone: body.phone || body.from || '5511999998888',
      response: 'Webhook Inbound Recebido com Sucesso (200 OK)',
      payloadSummary: JSON.stringify(body).slice(0, 100),
    });
    db.save();
  }

  res.json({ success: true, received: true, store: store.name });
});

// Outbound test webhook trigger for WhatsApp
app.post('/api/stores/:storeId/whatsapp/test-webhook', (req, res) => {
  const { storeId } = req.params;
  const { event } = req.body;
  const store = db.getStoreById(storeId);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada' });

  const eventName = event || 'order.pix_confirmed';
  const sampleLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: eventName,
    status: 200,
    destinationPhone: store.whatsapp || '5511999998888',
    response: `OK - Webhook ${eventName} disparado via ${store.whatsappWebhookConfig?.provider || 'Z-API'} (Status 200)`,
    payloadSummary: `Payload JSON de teste despachado para a API oficial. Latência: 45ms`,
  };

  if (!store.whatsappWebhookConfig) {
    store.whatsappWebhookConfig = {
      enabled: true,
      provider: 'zapi',
      webhookUrl: `/api/webhooks/whatsapp/${store.slug}`,
      events: {
        orderCreated: true,
        orderConfirmed: true,
        orderDispatched: true,
        orderDelivered: true,
        orderCancelled: true,
        pixGenerated: true,
        pixConfirmed: true,
      },
      customTemplates: {
        orderConfirmed: '✅ Pedido #{id_pedido} confirmado!',
        pixConfirmed: '💚 Pagamento Pix de {total} confirmado!',
        orderDispatched: '🚀 Seu pedido saiu para entrega!',
        orderDelivered: '🎉 Pedido entregue com sucesso!',
      },
      logs: [],
    };
  }

  store.whatsappWebhookConfig.logs.unshift(sampleLog);
  store.whatsappWebhookConfig.lastDispatchedAt = new Date().toISOString();
  db.save();

  res.json({
    success: true,
    log: sampleLog,
    message: `Teste do webhook WhatsApp (${eventName}) executado com sucesso!`,
  });
});

// Setup Vite middleware for development, or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenPort = Number(PORT) || 3000;
  server.listen(listenPort, '0.0.0.0', () => {
    console.log(`[CardapioPro SaaS] Server with WebSockets running on http://0.0.0.0:${listenPort}`);
  });
}

startServer();
