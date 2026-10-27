import {
  Category,
  Ingredient,
  Order,
  OrderStatus,
  Product,
  SaaSPlan,
  Store,
  TableItem,
  CashSession,
  StoreMetrics,
  SubscriptionInvoice,
} from '../types';

export const api = {
  // Stores
  async getStores(): Promise<Store[]> {
    const res = await fetch('/api/stores');
    if (!res.ok) throw new Error('Falha ao carregar lojas');
    return res.json();
  },

  async getStoreBySlug(slug: string): Promise<Store> {
    const res = await fetch(`/api/stores/${slug}`);
    if (!res.ok) throw new Error('Loja não encontrada');
    return res.json();
  },

  async updateStore(id: string, partial: Partial<Store>): Promise<Store> {
    const res = await fetch(`/api/stores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) throw new Error('Falha ao atualizar dados da loja');
    return res.json();
  },

  // Catalog
  async getCatalog(storeId: string): Promise<{ categories: Category[]; products: Product[] }> {
    const res = await fetch(`/api/stores/${storeId}/catalog`);
    if (!res.ok) throw new Error('Falha ao carregar cardápio');
    return res.json();
  },

  async createCategory(storeId: string, name: string): Promise<Category> {
    const res = await fetch(`/api/stores/${storeId}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Falha ao criar categoria');
    return res.json();
  },

  async createProduct(storeId: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/stores/${storeId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Falha ao criar produto');
    return res.json();
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Falha ao atualizar produto');
    return res.json();
  },

  async deleteProduct(id: string): Promise<boolean> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // Orders
  async calculateOrder(payload: {
    storeId: string;
    items: any[];
    deliveryZoneId?: string;
    couponCode?: string;
    serviceType?: string;
  }): Promise<{
    items: any[];
    subtotal: number;
    deliveryFee: number;
    discount: number;
    couponCode?: string;
    total: number;
  }> {
    const res = await fetch('/api/orders/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro no cálculo do pedido');
    }
    return res.json();
  },

  async createOrder(payload: any): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao finalizar pedido');
    }
    return res.json();
  },

  async getOrders(storeId: string): Promise<Order[]> {
    const res = await fetch(`/api/stores/${storeId}/orders`);
    if (!res.ok) throw new Error('Falha ao buscar pedidos');
    return res.json();
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await fetch(`/api/orders/${id}`);
    if (!res.ok) throw new Error('Pedido não encontrado');
    return res.json();
  },

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar status');
    return res.json();
  },

  async markOrderPrinted(id: string): Promise<Order> {
    const res = await fetch(`/api/orders/${id}/printed`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Falha ao marcar comanda impressa');
    return res.json();
  },

  async updateOrderPaymentStatus(
    id: string,
    status: 'pending' | 'paid' | 'cancelled' | 'refunded',
    paidAt?: string
  ): Promise<Order> {
    const res = await fetch(`/api/orders/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, paidAt }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar status de pagamento');
    return res.json();
  },

  // Inventory
  async getInventory(storeId: string): Promise<{ ingredients: Ingredient[]; movements: any[] }> {
    const res = await fetch(`/api/stores/${storeId}/inventory`);
    if (!res.ok) throw new Error('Falha ao buscar estoque');
    return res.json();
  },

  async createIngredient(storeId: string, data: Partial<Ingredient>): Promise<Ingredient> {
    const res = await fetch(`/api/stores/${storeId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar insumo');
    return res.json();
  },

  async adjustStock(storeId: string, payload: { ingredientId: string; quantity: number; type: string; reason: string }): Promise<void> {
    const res = await fetch(`/api/stores/${storeId}/inventory/adjustment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao ajustar estoque');
  },

  // Cash Register
  async getCash(storeId: string): Promise<{ activeSession?: CashSession; history: CashSession[] }> {
    const res = await fetch(`/api/stores/${storeId}/cash`);
    if (!res.ok) throw new Error('Falha ao buscar caixa');
    return res.json();
  },

  async openCash(storeId: string, operatorName: string, initialAmount: number): Promise<CashSession> {
    const res = await fetch(`/api/stores/${storeId}/cash/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorName, initialAmount }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao abrir caixa');
    }
    return res.json();
  },

  async closeCash(sessionId: string, finalAmount: number): Promise<CashSession> {
    const res = await fetch(`/api/cash/${sessionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalAmount }),
    });
    if (!res.ok) throw new Error('Falha ao fechar caixa');
    return res.json();
  },

  async addCashEntry(sessionId: string, entry: { type: string; amount: number; reason: string; paymentMethod?: string }): Promise<any> {
    const res = await fetch(`/api/cash/${sessionId}/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Falha ao lançar movimentação no caixa');
    return res.json();
  },

  // Tables
  async getTables(storeId: string): Promise<TableItem[]> {
    const res = await fetch(`/api/stores/${storeId}/tables`);
    if (!res.ok) throw new Error('Falha ao buscar mesas');
    return res.json();
  },

  async updateTable(id: string, partial: Partial<TableItem>): Promise<TableItem> {
    const res = await fetch(`/api/tables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) throw new Error('Falha ao atualizar mesa');
    return res.json();
  },

  // WhatsApp Simulation
  async simulateWhatsAppBot(storeId: string, message: string): Promise<{ reply: string; storeName: string }> {
    const res = await fetch('/api/whatsapp/simulate-incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, message }),
    });
    if (!res.ok) throw new Error('Falha no simulador do bot');
    return res.json();
  },

  // SaaS SuperAdmin
  async getAdminMetrics(): Promise<{
    totalStores: number;
    activeStores: number;
    trialStores: number;
    suspendedStores: number;
    mrr: number;
    totalOrdersCount: number;
    totalGMV: number;
    plans: SaaSPlan[];
  }> {
    const res = await fetch('/api/admin/metrics');
    if (!res.ok) throw new Error('Falha ao carregar métricas SaaS');
    return res.json();
  },

  async getAdminTenants(): Promise<Store[]> {
    const res = await fetch('/api/admin/tenants');
    if (!res.ok) throw new Error('Falha ao listar estabelecimentos');
    return res.json();
  },

  async createTenant(data: Partial<Store>): Promise<Store> {
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar estabelecimento');
    return res.json();
  },

  async updateTenantStatus(id: string, status: string): Promise<Store> {
    const res = await fetch(`/api/admin/tenants/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Falha ao alterar status da empresa');
    return res.json();
  },

  async updateTenantPassword(id: string, password: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/tenants/${id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar senha do lojista');
    return res.json();
  },

  // 1. Pix Automático
  async simulatePixPaid(orderId: string): Promise<any> {
    const res = await fetch(`/api/orders/${orderId}/simulate-pix-paid`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao simular pagamento Pix');
    }
    return res.json();
  },

  async getOrderPaymentStatus(orderId: string): Promise<{ orderId: string; displayId: string; status: string; paymentStatus: string; paid: boolean }> {
    const res = await fetch(`/api/orders/${orderId}/payment-status`);
    if (!res.ok) throw new Error('Falha ao consultar status de pagamento');
    return res.json();
  },

  async testPixAutomated(storeId: string): Promise<any> {
    const res = await fetch(`/api/stores/${storeId}/pix-automated/test`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao testar gateway Pix');
    return res.json();
  },

  // 2. Impressão via WebSocket
  async getPrinterStatus(storeId: string): Promise<{ connected: boolean; activeAgents: number; status: string; wsUrl: string }> {
    const res = await fetch(`/api/stores/${storeId}/printer/status`);
    if (!res.ok) throw new Error('Falha ao verificar status da impressora');
    return res.json();
  },

  async testWebSocketPrinter(storeId: string): Promise<any> {
    const res = await fetch(`/api/stores/${storeId}/printer/websocket-test`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao enviar impressão de teste via WebSocket');
    return res.json();
  },

  async printOrderWebSocket(storeId: string, orderId: string, target: 'caixa' | 'cozinha' = 'caixa'): Promise<any> {
    const res = await fetch(`/api/stores/${storeId}/printer/print-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, target }),
    });
    if (!res.ok) throw new Error('Falha ao imprimir comanda via WebSocket');
    return res.json();
  },

  // 3. Dashboard de Métricas
  async getStoreMetrics(storeId: string, period: string = 'today'): Promise<StoreMetrics> {
    const res = await fetch(`/api/stores/${storeId}/metrics?period=${period}`);
    if (!res.ok) throw new Error('Falha ao carregar métricas da loja');
    return res.json();
  },

  // 4. Webhooks WhatsApp
  async testWhatsAppWebhook(storeId: string, event?: string): Promise<any> {
    const res = await fetch(`/api/stores/${storeId}/whatsapp/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    });
    if (!res.ok) throw new Error('Falha ao testar webhook WhatsApp');
    return res.json();
  },

  // 5. Plataforma Pix Dinâmico API
  async generateDynamicPixQrCode(params: {
    storeId?: string;
    orderId?: string;
    key?: string;
    beneficiaryName?: string;
    city?: string;
    amount?: number;
    txId?: string;
  }): Promise<{
    success: boolean;
    pixPayload: string;
    qrCodeDataUrl: string;
    key: string;
    beneficiaryName: string;
    city: string;
    amount: number;
    txId: string;
  }> {
    const res = await fetch('/api/pix/dynamic-qrcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao gerar QR Code Pix dinâmico via API');
    }
    return res.json();
  },

  // 6. Assinaturas e Renovação Pix Itaú com Reconhecimento Automático
  async getStoreSubscription(storeId: string): Promise<{
    storeId: string;
    storeName: string;
    plan: string;
    status: string;
    planDetails: SaaSPlan;
    subscriptionExpiresAt: string;
    daysLeft: number;
    isExpired: boolean;
    subscriptionCycle: 'monthly' | 'yearly';
    subscriptionLastRenewedAt?: string;
    platformPix: {
      key: string;
      keyType: string;
      bankName: string;
      bankCode: string;
      beneficiaryName: string;
      city: string;
      instructions: string;
    };
    availablePlans: SaaSPlan[];
    invoices: SubscriptionInvoice[];
  }> {
    const res = await fetch(`/api/stores/${storeId}/subscription`);
    if (!res.ok) throw new Error('Falha ao carregar dados da assinatura');
    return res.json();
  },

  async createRenewalPix(
    storeId: string,
    params: { planId?: string; cycle?: 'monthly' | 'yearly' }
  ): Promise<{
    success: boolean;
    invoice: SubscriptionInvoice;
    platformPix: any;
    message: string;
  }> {
    const res = await fetch(`/api/stores/${storeId}/subscription/create-renewal-pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao gerar cobrança Pix de renovação');
    }
    return res.json();
  },

  async checkSubscriptionInvoiceStatus(invoiceId: string): Promise<{
    invoiceId: string;
    txId: string;
    status: string;
    paid: boolean;
    paidAt?: string;
    autoReconciled: boolean;
    subscriptionExpiresAt?: string;
    storeStatus?: string;
    plan?: string;
  }> {
    const res = await fetch(`/api/subscriptions/${invoiceId}/status`);
    if (!res.ok) throw new Error('Falha ao verificar status do pagamento');
    return res.json();
  },

  async confirmSubscriptionInvoice(invoiceId: string): Promise<{
    success: boolean;
    message: string;
    invoice: SubscriptionInvoice;
    store: Store;
  }> {
    const res = await fetch(`/api/subscriptions/${invoiceId}/confirm`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao confirmar pagamento da assinatura');
    }
    return res.json();
  },

  async setStoreDefaultPixItau(storeId: string): Promise<{
    success: boolean;
    message: string;
    store: Store;
  }> {
    const res = await fetch(`/api/stores/${storeId}/set-default-pix-itau`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao vincular chave Pix Itaú');
    }
    return res.json();
  },
};
