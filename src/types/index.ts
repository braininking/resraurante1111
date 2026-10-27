export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimatedMinutes: number;
}

export interface StoreOpeningHours {
  dayOfWeek: number;
  open: string;
  close: string;
  isOpen: boolean;
}

export interface PixAutomatedConfig {
  enabled: boolean;
  provider: 'mercadopago' | 'openpix' | 'asaas' | 'efi' | 'simulado';
  accessToken?: string;
  publicKey?: string;
  webhookSecret?: string;
  autoApproveOrder: boolean;
  autoPrintOnApproval: boolean;
  sendWhatsAppNotification: boolean;
  lastTestedAt?: string;
  testStatus?: 'success' | 'failed' | 'untested';
}

export interface WebSocketPrinterConfig {
  enabled: boolean;
  mode: 'cloud_hub' | 'local_agent';
  agentUrl: string;
  targetStation: 'todos' | 'caixa' | 'cozinha';
  autoPrintNewOrder: boolean;
  autoPrintPixApproved: boolean;
  copies: number;
  paperWidth: 58 | 80;
  cutPaper: boolean;
  beepOnPrint: boolean;
  lastConnectedAt?: string;
  status: 'connected' | 'disconnected' | 'connecting';
}

export interface WhatsAppWebhookLog {
  id: string;
  timestamp: string;
  event: string;
  status: number;
  destinationPhone: string;
  response: string;
  payloadSummary?: string;
}

export interface WhatsAppWebhookConfig {
  enabled: boolean;
  provider: 'zapi' | 'evolution' | 'baileys' | 'meta_cloud';
  webhookUrl: string;
  apiEndpoint?: string;
  apiToken?: string;
  webhookSecret?: string;
  events: {
    orderCreated: boolean;
    orderConfirmed: boolean;
    orderDispatched: boolean;
    orderDelivered: boolean;
    orderCancelled: boolean;
    pixGenerated: boolean;
    pixConfirmed: boolean;
  };
  customTemplates: {
    orderConfirmed: string;
    pixConfirmed: string;
    orderDispatched: string;
    orderDelivered: string;
  };
  lastPayload?: any;
  lastDispatchedAt?: string;
  logs: WhatsAppWebhookLog[];
}

export interface StoreMetrics {
  period: 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'all';
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  grossProfit: number;
  deliveryFeesTotal: number;
  cancelledOrders: number;
  cancellationRate: number;
  hourlySales: { hour: number; label: string; orders: number; revenue: number }[];
  weekdaySales: { day: number; label: string; orders: number; revenue: number }[];
  channelBreakdown: {
    channel: string;
    label: string;
    orders: number;
    revenue: number;
    percentage: number;
  }[];
  paymentBreakdown: {
    method: string;
    label: string;
    orders: number;
    revenue: number;
    percentage: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    category?: string;
    percentage: number;
  }[];
  topNeighborhoods: {
    neighborhood: string;
    orders: number;
    revenue: number;
  }[];
  timeline: {
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  segment: 'hamburgueria' | 'pizzaria' | 'acaiteria' | 'restaurante' | 'cafeteria' | 'marmitaria' | 'japonesa' | 'padaria';
  tagline: string;
  logo: string;
  cover: string;
  primaryColor: string;
  phone: string;
  whatsapp: string;
  address: string;
  minOrderValue: number;
  deliveryZones: DeliveryZone[];
  openingHours: StoreOpeningHours[];
  paymentMethods: {
    pix: boolean;
    cash: boolean;
    cardDelivery: boolean;
    cardOnline: boolean;
  };
  pixConfig: {
    key: string;
    keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    beneficiaryName: string;
    city: string;
  };
  pixAutomatedConfig?: PixAutomatedConfig;
  printSettings: {
    autoPrint: boolean;
    paperWidth: 58 | 80;
    copies: number;
    soundAlert: boolean;
  };
  websocketPrinterConfig?: WebSocketPrinterConfig;
  whatsappBot: {
    enabled: boolean;
    greeting: string;
    menuMessage: string;
    pixInstructions: string;
  };
  whatsappWebhookConfig?: WhatsAppWebhookConfig;
  plan: 'essencial' | 'starter' | 'pro' | 'enterprise';
  subscriptionExpiresAt?: string;
  subscriptionCycle?: 'monthly' | 'yearly';
  subscriptionLastRenewedAt?: string;
  subscriptionAutoRenew?: boolean;
  password?: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
}

export interface OptionItem {
  id: string;
  name: string;
  price: number;
  maxQuantity?: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  description?: string;
  min: number;
  max: number;
  required: boolean;
  items: OptionItem[];
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  promotionalPrice?: number;
  image: string;
  available: boolean;
  isPizza?: boolean;
  pizzaSizes?: {
    name: string;
    slices: number;
    maxFlavors: number;
    basePrice: number;
  }[];
  removableIngredients?: string[];
  optionGroups: OptionGroup[];
  recipe?: RecipeIngredient[];
  trackStock?: boolean;
  currentStock?: number;
  minStock?: number;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  order: number;
  icon?: string;
}

export interface Ingredient {
  id: string;
  storeId: string;
  name: string;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'un';
  currentStock: number;
  minStock: number;
  costPrice: number;
  supplier: string;
}

export interface StockMovement {
  id: string;
  storeId: string;
  ingredientId: string;
  ingredientName: string;
  type: 'entrada' | 'saida_venda' | 'ajuste' | 'perda' | 'estorno';
  quantity: number;
  unit: string;
  reason: string;
  orderId?: string;
  timestamp: string;
}

export interface OrderItemOption {
  groupId: string;
  groupName: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: OrderItemOption[];
  removedIngredients?: string[];
  pizzaDetails?: {
    size: string;
    flavors: string[];
    crust?: string;
  };
  observation?: string;
  subtotal: number;
}

export type OrderStatus =
  | 'aguardando_confirmacao'
  | 'confirmado'
  | 'em_preparo'
  | 'pronto'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado';

export interface Order {
  id: string;
  displayId: string;
  storeId: string;
  channel: 'cardapio_digital' | 'whatsapp' | 'pdv_balcao' | 'mesa';
  type: 'delivery' | 'takeaway' | 'dine_in';
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    address?: {
      street: string;
      number: string;
      neighborhood: string;
      complement?: string;
      reference?: string;
    };
    tableNumber?: number;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  total: number;
  payment: {
    method: 'pix' | 'cash' | 'card_delivery' | 'card_online';
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    pixPayload?: string;
    changeFor?: number;
    paidAt?: string;
  };
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  printed: boolean;
  createdAt: string;
  updatedAt: string;
  idempotencyKey?: string;
}

export interface CashEntry {
  id: string;
  type: 'suprimento' | 'sangria' | 'venda';
  amount: number;
  paymentMethod?: string;
  reason: string;
  timestamp: string;
  orderId?: string;
}

export interface CashSession {
  id: string;
  storeId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  initialAmount: number;
  finalAmount?: number;
  status: 'open' | 'closed';
  entries: CashEntry[];
}

export interface TableItem {
  id: string;
  storeId: string;
  number: number;
  capacity: number;
  status: 'livre' | 'ocupada' | 'aguardando_conta' | 'reservada';
  activeOrderId?: string;
  openedAt?: string;
}

export interface SaaSPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxOrdersPerMonth: number;
  features: string[];
}

export interface SubscriptionInvoice {
  id: string;
  storeId: string;
  storeName: string;
  planId: string;
  planName: string;
  cycle: 'monthly' | 'yearly';
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  pixKey: string;
  pixKeyBank: string;
  pixBeneficiary: string;
  pixInstructions: string;
  pixPayload: string;
  qrCodeUrl?: string;
  txId: string;
  createdAt: string;
  paidAt?: string;
  expiresAt: string;
  daysAdded: number;
  autoReconciled: boolean;
  notes?: string;
}
