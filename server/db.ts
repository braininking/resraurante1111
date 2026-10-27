import fs from 'fs';
import path from 'path';

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimatedMinutes: number;
}

export interface StoreOpeningHours {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  open: string;      // "18:00"
  close: string;     // "23:30"
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
    statusChangeNotify?: boolean;
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

export interface DatabaseSchema {
  stores: Store[];
  categories: Category[];
  products: Product[];
  ingredients: Ingredient[];
  stockMovements: StockMovement[];
  orders: Order[];
  cashSessions: CashSession[];
  tables: TableItem[];
  plans: SaaSPlan[];
  subscriptionInvoices: SubscriptionInvoice[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initial robust seed data
function getInitialData(): DatabaseSchema {
  const stores: Store[] = [
    {
      id: 'store-1',
      name: 'Burger & Co. Artesanal',
      slug: 'burger-co',
      segment: 'hamburgueria',
      tagline: 'Smash burgers, brioche artesanal e batatas rústicas',
      logo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
      primaryColor: '#EA580C', // Orange 600
      phone: '(11) 98765-4321',
      whatsapp: '5511987654321',
      address: 'Rua Augusta, 1420 - Consolação, São Paulo - SP',
      minOrderValue: 25.0,
      deliveryZones: [
        { id: 'z1', name: 'Centro / Consolação', fee: 5.0, estimatedMinutes: 30 },
        { id: 'z2', name: 'Bela Vista / Jardins', fee: 8.0, estimatedMinutes: 40 },
        { id: 'z3', name: 'Pinheiros / Vila Madalena', fee: 12.0, estimatedMinutes: 50 },
        { id: 'z4', name: 'Outros bairros (até 7km)', fee: 15.0, estimatedMinutes: 60 },
      ],
      openingHours: [
        { dayOfWeek: 0, open: '18:00', close: '23:59', isOpen: true },
        { dayOfWeek: 1, open: '18:00', close: '23:30', isOpen: true },
        { dayOfWeek: 2, open: '18:00', close: '23:30', isOpen: true },
        { dayOfWeek: 3, open: '18:00', close: '23:30', isOpen: true },
        { dayOfWeek: 4, open: '18:00', close: '23:30', isOpen: true },
        { dayOfWeek: 5, open: '18:00', close: '01:00', isOpen: true },
        { dayOfWeek: 6, open: '18:00', close: '01:00', isOpen: true },
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
        beneficiaryName: 'Itaú Unibanco / CardapioPro',
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
        greeting: 'Olá! Bem-vindo à Burger & Co. Artesanal! 🍔 Como podemos ajudar hoje?',
        menuMessage: 'Acesse nosso cardápio digital interativo e faça seu pedido sem filas:',
        statusChangeNotify: true,
        pixInstructions: 'Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2',
      },
      plan: 'pro',
      status: 'active',
      createdAt: '2026-01-10T10:00:00.000Z',
    },
    {
      id: 'store-2',
      name: 'Bella Napoli Pizzas & Calzones',
      slug: 'bella-napoli',
      segment: 'pizzaria',
      tagline: 'Massa de fermentação natural 48h e forno a lenha',
      logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?w=1200&auto=format&fit=crop&q=80',
      primaryColor: '#DC2626', // Red 600
      phone: '(11) 97654-3210',
      whatsapp: '5511976543210',
      address: 'Alameda dos Anapurus, 890 - Moema, São Paulo - SP',
      minOrderValue: 35.0,
      deliveryZones: [
        { id: 'nz1', name: 'Moema / Indianópolis', fee: 6.0, estimatedMinutes: 35 },
        { id: 'nz2', name: 'Vila Nova Conceição / Itaim', fee: 10.0, estimatedMinutes: 45 },
        { id: 'nz3', name: 'Campo Belo / Brooklin', fee: 12.0, estimatedMinutes: 50 },
      ],
      openingHours: [
        { dayOfWeek: 0, open: '18:30', close: '23:30', isOpen: true },
        { dayOfWeek: 1, open: '18:30', close: '23:00', isOpen: false },
        { dayOfWeek: 2, open: '18:30', close: '23:30', isOpen: true },
        { dayOfWeek: 3, open: '18:30', close: '23:30', isOpen: true },
        { dayOfWeek: 4, open: '18:30', close: '23:30', isOpen: true },
        { dayOfWeek: 5, open: '18:30', close: '00:30', isOpen: true },
        { dayOfWeek: 6, open: '18:30', close: '00:30', isOpen: true },
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
        beneficiaryName: 'Itaú Unibanco / CardapioPro',
        city: 'SAO PAULO',
      },
      printSettings: {
        autoPrint: true,
        paperWidth: 80,
        copies: 2,
        soundAlert: true,
      },
      whatsappBot: {
        enabled: true,
        greeting: 'Buonasera! Bem-vindo à Bella Napoli Pizzaria 🍕',
        menuMessage: 'Cardápio de pizzas napolitanas com opção meio a meio:',
        statusChangeNotify: true,
        pixInstructions: 'Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2',
      },
      plan: 'pro',
      status: 'active',
      createdAt: '2026-02-01T12:00:00.000Z',
    },
    {
      id: 'store-3',
      name: 'Açaí & Gelatos Tropicais',
      slug: 'acai-tropical',
      segment: 'acaiteria',
      tagline: 'Açaí 100% puro do Pará, cremes especiais e frutas frescas',
      logo: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=1200&auto=format&fit=crop&q=80',
      primaryColor: '#7C3AED', // Purple 600
      phone: '(11) 96543-2109',
      whatsapp: '5511965432109',
      address: 'Rua Fradique Coutinho, 510 - Pinheiros, São Paulo - SP',
      minOrderValue: 20.0,
      deliveryZones: [
        { id: 'az1', name: 'Pinheiros / Vila Madalena', fee: 5.0, estimatedMinutes: 25 },
        { id: 'az2', name: 'Alto de Pinheiros / Perdizes', fee: 8.0, estimatedMinutes: 35 },
      ],
      openingHours: [
        { dayOfWeek: 0, open: '12:00', close: '22:00', isOpen: true },
        { dayOfWeek: 1, open: '12:00', close: '22:00', isOpen: true },
        { dayOfWeek: 2, open: '12:00', close: '22:00', isOpen: true },
        { dayOfWeek: 3, open: '12:00', close: '22:00', isOpen: true },
        { dayOfWeek: 4, open: '12:00', close: '22:00', isOpen: true },
        { dayOfWeek: 5, open: '12:00', close: '23:00', isOpen: true },
        { dayOfWeek: 6, open: '12:00', close: '23:00', isOpen: true },
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
        beneficiaryName: 'Itaú Unibanco / CardapioPro',
        city: 'SAO PAULO',
      },
      printSettings: {
        autoPrint: false,
        paperWidth: 58,
        copies: 1,
        soundAlert: true,
      },
      whatsappBot: {
        enabled: true,
        greeting: 'Opa! Que tal um açaí geladinho hoje? 🍧',
        menuMessage: 'Monte seu açaí no capricho com complementos ilimitados:',
        statusChangeNotify: true,
        pixInstructions: 'Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2',
      },
      plan: 'starter',
      status: 'active',
      createdAt: '2026-02-15T09:00:00.000Z',
    },
  ];

  const categories: Category[] = [
    // Burger & Co categories
    { id: 'cat-1', storeId: 'store-1', name: 'Burgers Especiais', order: 1 },
    { id: 'cat-2', storeId: 'store-1', name: 'Smash Burgers', order: 2 },
    { id: 'cat-3', storeId: 'store-1', name: 'Acompanhamentos & Fritas', order: 3 },
    { id: 'cat-4', storeId: 'store-1', name: 'Bebidas & Shakes', order: 4 },
    { id: 'cat-5', storeId: 'store-1', name: 'Sobremesas', order: 5 },

    // Bella Napoli categories
    { id: 'cat-6', storeId: 'store-2', name: 'Pizzas Tradicionais', order: 1 },
    { id: 'cat-7', storeId: 'store-2', name: 'Pizzas Especiais', order: 2 },
    { id: 'cat-8', storeId: 'store-2', name: 'Calzones & Entradas', order: 3 },
    { id: 'cat-9', storeId: 'store-2', name: 'Vinhos & Cervejas', order: 4 },

    // Açaí Tropical categories
    { id: 'cat-10', storeId: 'store-3', name: 'Tigelas de Açaí', order: 1 },
    { id: 'cat-11', storeId: 'store-3', name: 'Copos Turbo', order: 2 },
    { id: 'cat-12', storeId: 'store-3', name: 'Sucos Naturais', order: 3 },
  ];

  const ingredients: Ingredient[] = [
    { id: 'ing-1', storeId: 'store-1', name: 'Pão de Brioche Selado', unit: 'un', currentStock: 85, minStock: 30, costPrice: 1.80, supplier: 'Padaria Central' },
    { id: 'ing-2', storeId: 'store-1', name: 'Blend Bovino Angus (160g)', unit: 'un', currentStock: 62, minStock: 25, costPrice: 6.50, supplier: 'Frigorífico Boi Nobre' },
    { id: 'ing-3', storeId: 'store-1', name: 'Queijo Cheddar Inglês Fatiado', unit: 'g', currentStock: 3500, minStock: 1000, costPrice: 0.045, supplier: 'Laticínios Sul' },
    { id: 'ing-4', storeId: 'store-1', name: 'Bacon Defumado Artesanal', unit: 'g', currentStock: 4200, minStock: 1200, costPrice: 0.055, supplier: 'Charcutaria Real' },
    { id: 'ing-5', storeId: 'store-1', name: 'Maionese da Casa de Ervas', unit: 'ml', currentStock: 2500, minStock: 800, costPrice: 0.02, supplier: 'Produção Própria' },
    { id: 'ing-6', storeId: 'store-1', name: 'Batata Belga Palito Congelada', unit: 'kg', currentStock: 28, minStock: 10, costPrice: 14.00, supplier: 'Distribuidora Food' },
  ];

  const stockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      storeId: 'store-1',
      ingredientId: 'ing-2',
      ingredientName: 'Blend Bovino Angus (160g)',
      type: 'entrada',
      quantity: 80,
      unit: 'un',
      reason: 'Compra semanal Nota Fiscal #4982',
      timestamp: '2026-10-12T09:30:00.000Z',
    },
    {
      id: 'mov-2',
      storeId: 'store-1',
      ingredientId: 'ing-1',
      ingredientName: 'Pão de Brioche Selado',
      type: 'entrada',
      quantity: 100,
      unit: 'un',
      reason: 'Entrega fornecedor Padaria Central',
      timestamp: '2026-10-12T10:15:00.000Z',
    },
  ];

  const products: Product[] = [
    // Burger & Co products
    {
      id: 'prod-1',
      storeId: 'store-1',
      categoryId: 'cat-1',
      name: 'Bacon Supreme Artesanal',
      description: 'Pão brioche tostado na manteiga, 160g de blend angus suculento, queijo cheddar cremoso derretido, tiras de bacon crocante e maionese defumada da casa.',
      price: 36.90,
      promotionalPrice: 33.90,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      available: true,
      removableIngredients: ['Sem cebola', 'Sem maionese', 'Sem bacon', 'Sem picles'],
      trackStock: true,
      currentStock: 45,
      minStock: 10,
      recipe: [
        { ingredientId: 'ing-1', quantity: 1 },
        { ingredientId: 'ing-2', quantity: 1 },
        { ingredientId: 'ing-3', quantity: 40 },
        { ingredientId: 'ing-4', quantity: 50 },
        { ingredientId: 'ing-5', quantity: 30 },
      ],
      optionGroups: [
        {
          id: 'og-doneness',
          name: 'Ponto da Carne',
          description: 'Como prefere seu blend bovino?',
          min: 1,
          max: 1,
          required: true,
          items: [
            { id: 'opt-d1', name: 'Ao ponto pra mal (vermelhinho)', price: 0 },
            { id: 'opt-d2', name: 'Ao ponto (rosado e suculento)', price: 0 },
            { id: 'opt-d3', name: 'Bem passado', price: 0 },
          ],
        },
        {
          id: 'og-cheese',
          name: 'Tipo de Queijo',
          min: 1,
          max: 1,
          required: true,
          items: [
            { id: 'opt-c1', name: 'Cheddar Inglês Melt', price: 0 },
            { id: 'opt-c2', name: 'Queijo Prato Fundido', price: 0 },
            { id: 'opt-c3', name: 'Gorgonzola Cremoso', price: 3.50 },
          ],
        },
        {
          id: 'og-addons',
          name: 'Turbine seu Burger (Adicionais)',
          description: 'Escolha até 4 adicionais extras',
          min: 0,
          max: 4,
          required: false,
          items: [
            { id: 'opt-a1', name: 'Bacon Duplo Extra (+40g)', price: 5.90 },
            { id: 'opt-a2', name: 'Queijo Cheddar Extra', price: 4.50 },
            { id: 'opt-a3', name: 'Hambúrguer Extra (160g)', price: 12.00 },
            { id: 'opt-a4', name: 'Cebola Caramelizada', price: 3.50 },
            { id: 'opt-a5', name: 'Ovo Frito na Manteiga', price: 3.00 },
          ],
        },
        {
          id: 'og-combo',
          name: 'Transformar em Combo?',
          min: 0,
          max: 1,
          required: false,
          items: [
            { id: 'opt-combo1', name: 'Combo + Fritas P + Coca-Cola Lata 350ml', price: 14.90 },
            { id: 'opt-combo2', name: 'Combo + Batata Rústica + Suco Natural 400ml', price: 16.90 },
          ],
        },
      ],
    },
    {
      id: 'prod-2',
      storeId: 'store-1',
      categoryId: 'cat-2',
      name: 'Duplo Smash Cheese Melt',
      description: '2 carnes prensadas ultra-crocantes com crostinha (90g cada), 4 fatias de cheddar inglês derretido, cebola chapeada e molho especial.',
      price: 31.90,
      image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
      available: true,
      removableIngredients: ['Sem cebola chapeada', 'Sem molho especial', 'Sem picles'],
      optionGroups: [
        {
          id: 'og-smash-addons',
          name: 'Adicionais',
          min: 0,
          max: 3,
          required: false,
          items: [
            { id: 'opt-sa1', name: 'Farofa de Bacon Crocante', price: 4.00 },
            { id: 'opt-sa2', name: 'Maionese Trufada da Casa', price: 4.50 },
            { id: 'opt-sa3', name: 'Smash Extra (+90g)', price: 7.00 },
          ],
        },
      ],
    },
    {
      id: 'prod-3',
      storeId: 'store-1',
      categoryId: 'cat-3',
      name: 'Batata Rústica com Alecrim e Páprica',
      description: 'Porção individual de batatas rústicas com casca, fritas na hora, temperadas com sal marinho, alecrim fresco e páprica defumada. Acompanha maionese da casa.',
      price: 18.50,
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
      available: true,
      optionGroups: [
        {
          id: 'og-molho',
          name: 'Molho Extra',
          min: 0,
          max: 2,
          required: false,
          items: [
            { id: 'opt-m1', name: 'Maionese de Alho Confitado (50ml)', price: 3.50 },
            { id: 'opt-m2', name: 'Molho Barbecue Defumado (50ml)', price: 3.00 },
            { id: 'opt-m3', name: 'Ketchup Rústico de Goiabada (50ml)', price: 3.50 },
          ],
        },
      ],
    },
    {
      id: 'prod-4',
      storeId: 'store-1',
      categoryId: 'cat-4',
      name: 'Milkshake de Nutella com Ninho (400ml)',
      description: 'Sorvete artesanal batido com leite Ninho em pó, borda recheada de Nutella original e chantilly fresco.',
      price: 22.90,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
      available: true,
      optionGroups: [],
    },
    {
      id: 'prod-5',
      storeId: 'store-1',
      categoryId: 'cat-4',
      name: 'Coca-Cola Original 350ml Lata',
      description: 'Refrigerante gelado lata 350ml.',
      price: 6.50,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
      available: true,
      optionGroups: [],
    },

    // Bella Napoli Pizza products (with pizza sizes & half-half config)
    {
      id: 'prod-p1',
      storeId: 'store-2',
      categoryId: 'cat-6',
      name: 'Pizza Artesanal Napolitana (Monte a sua)',
      description: 'Massa leve de fermentação lenta 48h, molho de tomate pelado San Marzano e azeite extravirgem. Escolha o tamanho e até 2 sabores meio a meio!',
      price: 64.90,
      image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
      available: true,
      isPizza: true,
      pizzaSizes: [
        { name: 'Média (6 Fatias)', slices: 6, maxFlavors: 2, basePrice: 58.00 },
        { name: 'Grande (8 Fatias)', slices: 8, maxFlavors: 2, basePrice: 68.00 },
        { name: 'Família (12 Fatias)', slices: 12, maxFlavors: 3, basePrice: 84.00 },
      ],
      optionGroups: [
        {
          id: 'og-pizza-size',
          name: 'Tamanho da Pizza',
          min: 1,
          max: 1,
          required: true,
          items: [
            { id: 'opt-ps-med', name: 'Média (6 Fatias) - 30cm', price: 58.00 },
            { id: 'opt-ps-grd', name: 'Grande (8 Fatias) - 35cm', price: 68.00 },
            { id: 'opt-ps-fam', name: 'Família (12 Fatias) - 40cm', price: 84.00 },
          ],
        },
        {
          id: 'og-pizza-crust',
          name: 'Borda Recheada Opcional',
          min: 0,
          max: 1,
          required: false,
          items: [
            { id: 'opt-borda-trad', name: 'Borda Tradicional Crocante', price: 0 },
            { id: 'opt-borda-cat', name: 'Borda com Catupiry Original', price: 9.90 },
            { id: 'opt-borda-ched', name: 'Borda com Cheddar Cremoso', price: 9.90 },
            { id: 'opt-borda-choc', name: 'Borda Vulcão de Chocolate ao Leite', price: 12.90 },
          ],
        },
        {
          id: 'og-pizza-flavor1',
          name: '1º Sabor (ou sabor inteiro)',
          min: 1,
          max: 1,
          required: true,
          items: [
            { id: 'opt-f-margh', name: 'Margherita Especial (Mozzarella de búfala, manjericão fresco e azeite)', price: 0 },
            { id: 'opt-f-calab', name: 'Calabresa Artesanal com Cebola Roxa e Azeitonas pretas', price: 0 },
            { id: 'opt-f-4queij', name: 'Quatro Queijos (Mozzarella, Gorgonzola, Parmesão e Catupiry)', price: 4.00 },
            { id: 'opt-f-frango', name: 'Frango Desfiado com Catupiry e Milho Verde', price: 2.00 },
            { id: 'opt-f-parma', name: 'Parma & Rúcula (Presunto cru, rúcula fresca e lascas de parmesão)', price: 8.00 },
          ],
        },
        {
          id: 'og-pizza-flavor2',
          name: '2º Sabor (Opcional - Meio a Meio)',
          min: 0,
          max: 1,
          required: false,
          items: [
            { id: 'opt-f2-margh', name: '1/2 Margherita Especial', price: 0 },
            { id: 'opt-f2-calab', name: '1/2 Calabresa Artesanal', price: 0 },
            { id: 'opt-f2-4queij', name: '1/2 Quatro Queijos', price: 2.00 },
            { id: 'opt-f2-frango', name: '1/2 Frango com Catupiry', price: 1.00 },
            { id: 'opt-f2-parma', name: '1/2 Parma & Rúcula', price: 4.00 },
          ],
        },
      ],
    },

    // Açaí Tropical products
    {
      id: 'prod-a1',
      storeId: 'store-3',
      categoryId: 'cat-10',
      name: 'Tigela Açaí Especial 500ml',
      description: 'Açaí orgânico de consistência perfeita batido com xarope de guaraná natural. Escolha frutas e complementos!',
      price: 24.00,
      image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80',
      available: true,
      optionGroups: [
        {
          id: 'og-acai-fruit',
          name: 'Fruta Fresca (1 inclusa)',
          min: 1,
          max: 2,
          required: true,
          items: [
            { id: 'opt-af-ban', name: 'Banana Fatiada', price: 0 },
            { id: 'opt-af-mor', name: 'Morango Fresco', price: 2.50 },
            { id: 'opt-af-mkiw', name: 'Kiwi em Cubos', price: 2.50 },
          ],
        },
        {
          id: 'og-acai-toppings',
          name: 'Complementos Grátis (Escolha até 3)',
          min: 0,
          max: 3,
          required: false,
          items: [
            { id: 'opt-at-gran', name: 'Granola Artesanal', price: 0 },
            { id: 'opt-at-ninho', name: 'Leite Ninho em Pó', price: 0 },
            { id: 'opt-at-cond', name: 'Leite Condensado', price: 0 },
            { id: 'opt-at-pacoca', name: 'Paçoca de Amendoim', price: 0 },
            { id: 'opt-at-coco', name: 'Coco Ralado', price: 0 },
          ],
        },
        {
          id: 'og-acai-premiums',
          name: 'Cremes & Coberturas Premium',
          min: 0,
          max: 3,
          required: false,
          items: [
            { id: 'opt-ap-nutella', name: 'Nutella Pura (50g)', price: 5.00 },
            { id: 'opt-ap-pistache', name: 'Creme de Pistache Italiano', price: 7.00 },
            { id: 'opt-ap-ninho-creme', name: 'Brigadeiro Branco de Ninho', price: 4.00 },
          ],
        },
      ],
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord-1001',
      displayId: '#1001',
      storeId: 'store-1',
      channel: 'cardapio_digital',
      type: 'delivery',
      status: 'em_preparo',
      customer: {
        name: 'Matheus Oliveira',
        phone: '(11) 99887-1122',
        address: {
          street: 'Alameda Santos',
          number: '980',
          neighborhood: 'Bela Vista / Jardins',
          complement: 'Apto 42B',
          reference: 'Próximo ao Metrô Brigadeiro',
        },
      },
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Bacon Supreme Artesanal',
          quantity: 2,
          unitPrice: 33.90,
          selectedOptions: [
            { groupId: 'og-doneness', groupName: 'Ponto da Carne', itemId: 'opt-d2', itemName: 'Ao ponto (rosado e suculento)', price: 0, quantity: 1 },
            { groupId: 'og-cheese', groupName: 'Tipo de Queijo', itemId: 'opt-c1', itemName: 'Cheddar Inglês Melt', price: 0, quantity: 1 },
            { groupId: 'og-addons', groupName: 'Turbine seu Burger', itemId: 'opt-a1', itemName: 'Bacon Duplo Extra (+40g)', price: 5.90, quantity: 1 },
          ],
          removedIngredients: ['Sem cebola'],
          observation: 'Caprichar no molho por favor!',
          subtotal: 79.60,
        },
        {
          id: 'item-2',
          productId: 'prod-3',
          name: 'Batata Rústica com Alecrim e Páprica',
          quantity: 1,
          unitPrice: 18.50,
          selectedOptions: [
            { groupId: 'og-molho', groupName: 'Molho Extra', itemId: 'opt-m1', itemName: 'Maionese de Alho Confitado (50ml)', price: 3.50, quantity: 1 },
          ],
          subtotal: 22.00,
        },
      ],
      subtotal: 101.60,
      deliveryFee: 8.00,
      discount: 10.00,
      couponCode: 'BEMVINDO',
      total: 99.60,
      payment: {
        method: 'pix',
        status: 'paid',
        pixPayload: '00020126580014br.gov.bcb.pix0136pix@burgerco.com.br520400005303986540599.605802BR5925Burger & Co Delivery Ltda6009SAO PAULO62070503***6304E8A2',
      },
      statusHistory: [
        { status: 'aguardando_confirmacao', timestamp: '2026-10-13T19:40:00.000Z', note: 'Pedido recebido via Cardápio Digital' },
        { status: 'confirmado', timestamp: '2026-10-13T19:42:00.000Z', note: 'Pagamento Pix confirmado automaticamente' },
        { status: 'em_preparo', timestamp: '2026-10-13T19:45:00.000Z', note: 'Encaminhado para a chapa' },
      ],
      printed: true,
      createdAt: '2026-10-13T19:40:00.000Z',
      updatedAt: '2026-10-13T19:45:00.000Z',
      idempotencyKey: 'idemp-seed-1001',
    },
    {
      id: 'ord-1002',
      displayId: '#1002',
      storeId: 'store-1',
      channel: 'whatsapp',
      type: 'delivery',
      status: 'aguardando_confirmacao',
      customer: {
        name: 'Camila Rodrigues',
        phone: '(11) 98123-4567',
        address: {
          street: 'Rua Bela Cintra',
          number: '1250',
          neighborhood: 'Centro / Consolação',
          complement: 'Bloco 1 Apto 71',
        },
      },
      items: [
        {
          id: 'item-3',
          productId: 'prod-2',
          name: 'Duplo Smash Cheese Melt',
          quantity: 1,
          unitPrice: 31.90,
          selectedOptions: [],
          observation: 'Enviar sachê de maionese',
          subtotal: 31.90,
        },
        {
          id: 'item-4',
          productId: 'prod-5',
          name: 'Coca-Cola Original 350ml Lata',
          quantity: 1,
          unitPrice: 6.50,
          selectedOptions: [],
          subtotal: 6.50,
        },
      ],
      subtotal: 38.40,
      deliveryFee: 5.00,
      discount: 0,
      total: 43.40,
      payment: {
        method: 'cash',
        status: 'pending',
        changeFor: 50.00,
      },
      statusHistory: [
        { status: 'aguardando_confirmacao', timestamp: '2026-10-13T19:55:00.000Z', note: 'Pedido recebido via WhatsApp Bot' },
      ],
      printed: false,
      createdAt: '2026-10-13T19:55:00.000Z',
      updatedAt: '2026-10-13T19:55:00.000Z',
      idempotencyKey: 'idemp-seed-1002',
    },
    {
      id: 'ord-1003',
      displayId: '#1003',
      storeId: 'store-1',
      channel: 'pdv_balcao',
      type: 'takeaway',
      status: 'pronto',
      customer: {
        name: 'Cliente Balcão - Lucas',
        phone: '(11) 97777-8888',
      },
      items: [
        {
          id: 'item-5',
          productId: 'prod-1',
          name: 'Bacon Supreme Artesanal',
          quantity: 1,
          unitPrice: 33.90,
          selectedOptions: [
            { groupId: 'og-doneness', groupName: 'Ponto da Carne', itemId: 'opt-d3', itemName: 'Bem passado', price: 0, quantity: 1 },
            { groupId: 'og-cheese', groupName: 'Tipo de Queijo', itemId: 'opt-c1', itemName: 'Cheddar Inglês Melt', price: 0, quantity: 1 },
          ],
          subtotal: 33.90,
        },
      ],
      subtotal: 33.90,
      deliveryFee: 0,
      discount: 0,
      total: 33.90,
      payment: {
        method: 'card_delivery',
        status: 'paid',
      },
      statusHistory: [
        { status: 'confirmado', timestamp: '2026-10-13T19:30:00.000Z' },
        { status: 'em_preparo', timestamp: '2026-10-13T19:32:00.000Z' },
        { status: 'pronto', timestamp: '2026-10-13T19:48:00.000Z' },
      ],
      printed: true,
      createdAt: '2026-10-13T19:30:00.000Z',
      updatedAt: '2026-10-13T19:48:00.000Z',
    },
  ];

  const cashSessions: CashSession[] = [
    {
      id: 'cash-1',
      storeId: 'store-1',
      operatorName: 'Rafael Souza (Gerente)',
      openedAt: '2026-10-13T16:00:00.000Z',
      initialAmount: 150.00,
      status: 'open',
      entries: [
        { id: 'ce-1', type: 'suprimento', amount: 150.00, reason: 'Fundo de troco inicial da gaveta', timestamp: '2026-10-13T16:00:00.000Z' },
        { id: 'ce-2', type: 'venda', amount: 33.90, paymentMethod: 'card_delivery', reason: 'Venda balcão Pedido #1003', timestamp: '2026-10-13T19:30:00.000Z', orderId: 'ord-1003' },
      ],
    },
  ];

  const tables: TableItem[] = [
    { id: 'tbl-1', storeId: 'store-1', number: 1, capacity: 2, status: 'livre' },
    { id: 'tbl-2', storeId: 'store-1', number: 2, capacity: 4, status: 'ocupada', activeOrderId: 'ord-1003', openedAt: '2026-10-13T19:15:00.000Z' },
    { id: 'tbl-3', storeId: 'store-1', number: 3, capacity: 4, status: 'livre' },
    { id: 'tbl-4', storeId: 'store-1', number: 4, capacity: 6, status: 'aguardando_conta' },
    { id: 'tbl-5', storeId: 'store-1', number: 5, capacity: 2, status: 'reservada' },
    { id: 'tbl-6', storeId: 'store-1', number: 6, capacity: 8, status: 'livre' },
  ];

  const plans: SaaSPlan[] = [
    {
      id: 'plan-essencial',
      name: 'Plano Essencial',
      priceMonthly: 49.90,
      priceYearly: 499.00,
      maxOrdersPerMonth: 150,
      features: [
        'Cardápio digital próprio e responsivo',
        'Pedidos online e delivery',
        'Painel de pedidos básico',
        'Cadastro de produtos e promoções',
        'Checkout rápido com Pix automático',
      ],
    },
    {
      id: 'plan-pro',
      name: 'Plano Pro',
      priceMonthly: 129.90,
      priceYearly: 1299.00,
      maxOrdersPerMonth: 1500,
      features: [
        'Tudo do Plano Essencial',
        'Automação de pedidos via WhatsApp',
        'KDS - Monitor da Cozinha em tempo real com cronômetro',
        'Frente de Caixa (PDV Balcão completo)',
        'Gestão de Estoque com baixa automática e fichas técnicas',
        'Impressão térmica de comandas (58mm e 80mm)',
      ],
    },
    {
      id: 'plan-enterprise',
      name: 'Plano Enterprise',
      priceMonthly: 249.90,
      priceYearly: 2499.00,
      maxOrdersPerMonth: 10000,
      features: [
        'Tudo do Plano Pro',
        'Múltiplas mesas do salão com QR Code individual por mesa',
        'Relatórios financeiros avançados e fluxo de caixa',
        'Controle de comandas por garçom',
        'Suporte prioritário 24/7 com gerente de conta',
      ],
    },
  ];

  return {
    stores,
    categories,
    products,
    ingredients,
    stockMovements,
    orders,
    cashSessions,
    tables,
    plans,
    subscriptionInvoices: [],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure plans are always up to date with latest tiers
        this.data.plans = getInitialData().plans;
        if (!this.data.subscriptionInvoices) {
          this.data.subscriptionInvoices = [];
        }
        // Ensure all stores have password, subscription dates and valid plan
        this.data.stores.forEach((s) => {
          if (!s.password) s.password = '123456';
          if (s.plan === ('starter' as any)) s.plan = 'essencial';
          if (!s.subscriptionExpiresAt) {
            const exp = new Date();
            exp.setDate(exp.getDate() + 30);
            s.subscriptionExpiresAt = exp.toISOString();
            s.subscriptionCycle = 'monthly';
            s.subscriptionAutoRenew = true;
            s.subscriptionLastRenewedAt = new Date().toISOString();
          }
        });
        this.save();
      } catch (err) {
        console.error('Failed to read db.json, re-initializing with seed data', err);
        this.data = getInitialData();
        this.save();
      }
    } else {
      this.data = getInitialData();
      this.save();
    }
  }

  public save() {
    try {
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json', err);
    }
  }

  private sanitizeStore(store: Store): Store {
    if (!store.pixAutomatedConfig) {
      store.pixAutomatedConfig = {
        enabled: true,
        provider: 'simulado',
        accessToken: 'APP_USR-782910482910482-101419-simulated',
        publicKey: 'APP_USR-pub-test-9921',
        webhookSecret: 'whsec_cardapiopro_sandbox',
        autoApproveOrder: true,
        autoPrintOnApproval: true,
        sendWhatsAppNotification: true,
        lastTestedAt: new Date().toISOString(),
        testStatus: 'success',
      };
    }
    if (!store.websocketPrinterConfig) {
      store.websocketPrinterConfig = {
        enabled: true,
        mode: 'cloud_hub',
        agentUrl: 'ws://127.0.0.1:9100',
        targetStation: 'todos',
        autoPrintNewOrder: true,
        autoPrintPixApproved: true,
        copies: 1,
        paperWidth: store.printSettings?.paperWidth || 80,
        cutPaper: true,
        beepOnPrint: true,
        status: 'connected',
        lastConnectedAt: new Date().toISOString(),
      };
    }
    if (!store.whatsappWebhookConfig) {
      store.whatsappWebhookConfig = {
        enabled: true,
        provider: 'zapi',
        webhookUrl: `/api/webhooks/whatsapp/${store.slug}`,
        apiEndpoint: `https://api.z-api.io/instances/CARDAPIO_${store.slug.toUpperCase()}/token/tok_live_77192`,
        apiToken: 'tok_live_77192',
        webhookSecret: `whsec_${store.slug}_key`,
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
          orderConfirmed: '✅ *Pedido Confirmado!* Seu pedido #{id_pedido} já está sendo preparado pela nossa cozinha com muito carinho. Tempo estimado: {tempo} min.',
          pixConfirmed: '💚 *Pix Recebido com Sucesso!* Identificamos o pagamento de {total} para o pedido #{id_pedido}. Já iniciamos a separação!',
          orderDispatched: '🚀 *Seu pedido saiu para entrega!* Nosso entregador já está a caminho. Acompanhe em tempo real: {link_rastreamento}',
          orderDelivered: '🎉 *Pedido Entregue!* Esperamos que aproveite sua refeição! O que achou da experiência? Avalie nosso atendimento respondendo de 1 a 5.',
        },
        lastDispatchedAt: new Date().toISOString(),
        logs: [
          {
            id: `log-${Date.now()}-1`,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            event: 'order.pix_confirmed',
            status: 200,
            destinationPhone: '5511987654321',
            response: 'OK - Message Queued ID #zap-99812',
            payloadSummary: 'Notificação de Pix Aprovado enviada com sucesso.',
          },
          {
            id: `log-${Date.now()}-2`,
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            event: 'order.dispatched',
            status: 200,
            destinationPhone: '5511999998888',
            response: 'OK - Message Queued ID #zap-99764',
            payloadSummary: 'Notificação de Saída para Entrega.',
          },
        ],
      };
    }
    if (!store.subscriptionExpiresAt) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      store.subscriptionExpiresAt = exp.toISOString();
      store.subscriptionCycle = 'monthly';
      store.subscriptionAutoRenew = true;
      store.subscriptionLastRenewedAt = new Date().toISOString();
    }
    return store;
  }

  public getStores(): Store[] {
    return this.data.stores.map((s) => this.sanitizeStore(s));
  }

  public getStoreBySlug(slug: string): Store | undefined {
    const s = this.data.stores.find((st) => st.slug === slug);
    return s ? this.sanitizeStore(s) : undefined;
  }

  public getStoreById(id: string): Store | undefined {
    const s = this.data.stores.find((st) => st.id === id);
    return s ? this.sanitizeStore(s) : undefined;
  }

  public getStoreMetrics(storeId: string, period: 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'all' = 'today') {
    const allStoreOrders = this.data.orders.filter((o) => o.storeId === storeId);
    const now = new Date();

    let startDate = new Date();
    let endDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (period === 'all') {
      startDate = new Date(2020, 0, 1);
    }

    // Filter orders within period
    const filteredOrders = allStoreOrders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const activeOrders = filteredOrders.filter((o) => o.status !== 'cancelado');
    const cancelledOrdersList = filteredOrders.filter((o) => o.status === 'cancelado');

    const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = activeOrders.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const grossProfit = totalRevenue * 0.68;
    const deliveryFeesTotal = activeOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const cancelledOrders = cancelledOrdersList.length;
    const totalAttempted = totalOrders + cancelledOrders;
    const cancellationRate = totalAttempted > 0 ? (cancelledOrders / totalAttempted) * 100 : 0;

    // Hourly sales (0 to 23)
    const hourlySales = Array.from({ length: 24 }, (_, h) => {
      const hourOrders = activeOrders.filter((o) => new Date(o.createdAt).getHours() === h);
      const rev = hourOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        hour: h,
        label: `${h.toString().padStart(2, '0')}h`,
        orders: hourOrders.length,
        revenue: parseFloat(rev.toFixed(2)),
      };
    });

    // Weekday sales (0=Dom, 1=Seg, ..., 6=Sáb)
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdaySales = Array.from({ length: 7 }, (_, d) => {
      const dayOrders = activeOrders.filter((o) => new Date(o.createdAt).getDay() === d);
      const rev = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        day: d,
        label: dayNames[d],
        orders: dayOrders.length,
        revenue: parseFloat(rev.toFixed(2)),
      };
    });

    // Channel breakdown
    const channelMap: Record<string, { label: string; orders: number; revenue: number }> = {
      cardapio_digital: { label: 'Cardápio Digital (Web)', orders: 0, revenue: 0 },
      whatsapp: { label: 'Robô WhatsApp', orders: 0, revenue: 0 },
      pdv_balcao: { label: 'PDV Balcão / Caixa', orders: 0, revenue: 0 },
      mesa: { label: 'Mesa / Salão (QR)', orders: 0, revenue: 0 },
    };

    activeOrders.forEach((o) => {
      const ch = o.channel || 'cardapio_digital';
      if (channelMap[ch]) {
        channelMap[ch].orders += 1;
        channelMap[ch].revenue += o.total || 0;
      }
    });

    const channelBreakdown = Object.entries(channelMap).map(([channel, val]) => ({
      channel,
      label: val.label,
      orders: val.orders,
      revenue: parseFloat(val.revenue.toFixed(2)),
      percentage: totalRevenue > 0 ? parseFloat(((val.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    // Payment breakdown
    const paymentMap: Record<string, { label: string; orders: number; revenue: number }> = {
      pix: { label: 'Pix Automático', orders: 0, revenue: 0 },
      card_delivery: { label: 'Cartão na Entrega', orders: 0, revenue: 0 },
      card_online: { label: 'Cartão Online', orders: 0, revenue: 0 },
      cash: { label: 'Dinheiro', orders: 0, revenue: 0 },
    };

    activeOrders.forEach((o) => {
      const pm = o.payment?.method || 'pix';
      if (paymentMap[pm]) {
        paymentMap[pm].orders += 1;
        paymentMap[pm].revenue += o.total || 0;
      }
    });

    const paymentBreakdown = Object.entries(paymentMap).map(([method, val]) => ({
      method,
      label: val.label,
      orders: val.orders,
      revenue: parseFloat(val.revenue.toFixed(2)),
      percentage: totalRevenue > 0 ? parseFloat(((val.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    // Top Products ranking
    const productStats: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};
    activeOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            id: item.productId,
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity || 1;
        productStats[item.productId].revenue += item.subtotal || 0;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        revenue: parseFloat(p.revenue.toFixed(2)),
        percentage: totalRevenue > 0 ? parseFloat(((p.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }));

    // Top Neighborhoods
    const neighborhoodMap: Record<string, { orders: number; revenue: number }> = {};
    activeOrders.forEach((o) => {
      const neigh = o.customer?.address?.neighborhood || (o.type === 'dine_in' ? 'Consumo no Salão' : 'Retirada no Balcão');
      if (!neighborhoodMap[neigh]) {
        neighborhoodMap[neigh] = { orders: 0, revenue: 0 };
      }
      neighborhoodMap[neigh].orders += 1;
      neighborhoodMap[neigh].revenue += o.total || 0;
    });

    const topNeighborhoods = Object.entries(neighborhoodMap)
      .map(([neighborhood, val]) => ({
        neighborhood,
        orders: val.orders,
        revenue: parseFloat(val.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // Timeline
    const daysMap: Record<string, { label: string; revenue: number; orders: number }> = {};
    activeOrders.forEach((o) => {
      const d = o.createdAt.split('T')[0];
      if (!daysMap[d]) {
        const parts = d.split('-');
        daysMap[d] = {
          label: `${parts[2]}/${parts[1]}`,
          revenue: 0,
          orders: 0,
        };
      }
      daysMap[d].revenue += o.total || 0;
      daysMap[d].orders += 1;
    });

    const timeline = Object.entries(daysMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        label: val.label,
        revenue: parseFloat(val.revenue.toFixed(2)),
        orders: val.orders,
      }));

    return {
      period,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      averageTicket: parseFloat(averageTicket.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      deliveryFeesTotal: parseFloat(deliveryFeesTotal.toFixed(2)),
      cancelledOrders,
      cancellationRate: parseFloat(cancellationRate.toFixed(1)),
      hourlySales,
      weekdaySales,
      channelBreakdown,
      paymentBreakdown,
      topProducts,
      topNeighborhoods,
      timeline,
    };
  }

  public updateStore(id: string, partial: Partial<Store>): Store | undefined {
    const idx = this.data.stores.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.data.stores[idx] = { ...this.data.stores[idx], ...partial };
    this.save();
    return this.data.stores[idx];
  }

  public updateStorePassword(id: string, newPassword: string): Store | undefined {
    const s = this.data.stores.find((store) => store.id === id);
    if (!s) return undefined;
    s.password = newPassword;
    this.save();
    return s;
  }

  public createStore(store: Store): Store {
    this.data.stores.push(store);
    this.save();
    return store;
  }

  public getCategories(storeId: string): Category[] {
    return this.data.categories
      .filter((c) => c.storeId === storeId)
      .sort((a, b) => a.order - b.order);
  }

  public createCategory(category: Category): Category {
    this.data.categories.push(category);
    this.save();
    return category;
  }

  public updateCategory(id: string, partial: Partial<Category>): Category | undefined {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.categories[idx] = { ...this.data.categories[idx], ...partial };
    this.save();
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const initial = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    this.save();
    return this.data.categories.length < initial;
  }

  public getProducts(storeId: string): Product[] {
    return this.data.products.filter((p) => p.storeId === storeId);
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public createProduct(product: Product): Product {
    this.data.products.push(product);
    this.save();
    return product;
  }

  public updateProduct(id: string, partial: Partial<Product>): Product | undefined {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.products[idx] = { ...this.data.products[idx], ...partial };
    this.save();
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const initial = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    this.save();
    return this.data.products.length < initial;
  }

  public getOrders(storeId: string): Order[] {
    return this.data.orders
      .filter((o) => o.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  public getOrderByIdempotencyKey(key: string): Order | undefined {
    return this.data.orders.find((o) => o.idempotencyKey === key);
  }

  public createOrder(order: Order): Order {
    this.data.orders.unshift(order);

    // Auto stock deduction if items have recipes
    for (const item of order.items) {
      const prod = this.getProductById(item.productId);
      if (prod?.recipe && prod.recipe.length > 0) {
        for (const r of prod.recipe) {
          const totalQtyToDeduct = r.quantity * item.quantity;
          this.deductStock(
            order.storeId,
            r.ingredientId,
            totalQtyToDeduct,
            `Baixa automática pelo pedido ${order.displayId}`,
            order.id
          );
        }
      }
    }

    this.save();
    return order;
  }

  public updateOrderStatus(id: string, status: OrderStatus, note?: string): Order | undefined {
    const order = this.data.orders.find((o) => o.id === id);
    if (!order) return undefined;

    // Check if status is cancellation to reverse stock if needed
    if (status === 'cancelado' && order.status !== 'cancelado') {
      for (const item of order.items) {
        const prod = this.getProductById(item.productId);
        if (prod?.recipe && prod.recipe.length > 0) {
          for (const r of prod.recipe) {
            const totalQtyToRestore = r.quantity * item.quantity;
            this.addStock(
              order.storeId,
              r.ingredientId,
              totalQtyToRestore,
              `Estorno por cancelamento do pedido ${order.displayId}`,
              order.id
            );
          }
        }
      }
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status,
      timestamp: order.updatedAt,
      note,
    });

    this.save();
    return order;
  }

  public markOrderPrinted(id: string): Order | undefined {
    const order = this.data.orders.find((o) => o.id === id);
    if (!order) return undefined;
    order.printed = true;
    this.save();
    return order;
  }

  public updateOrderPaymentStatus(
    id: string,
    status: 'pending' | 'paid' | 'cancelled' | 'refunded',
    paidAt?: string
  ): Order | undefined {
    const order = this.data.orders.find((o) => o.id === id);
    if (!order) return undefined;
    order.payment.status = status;
    if (status === 'paid') {
      order.payment.paidAt = paidAt || new Date().toISOString();
    }
    order.updatedAt = new Date().toISOString();
    this.save();
    return order;
  }

  public getIngredients(storeId: string): Ingredient[] {
    return this.data.ingredients.filter((i) => i.storeId === storeId);
  }

  public createIngredient(ing: Ingredient): Ingredient {
    this.data.ingredients.push(ing);
    this.save();
    return ing;
  }

  public updateIngredient(id: string, partial: Partial<Ingredient>): Ingredient | undefined {
    const idx = this.data.ingredients.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.data.ingredients[idx] = { ...this.data.ingredients[idx], ...partial };
    this.save();
    return this.data.ingredients[idx];
  }

  public deductStock(storeId: string, ingredientId: string, quantity: number, reason: string, orderId?: string) {
    const ing = this.data.ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    ing.currentStock = Math.max(0, ing.currentStock - quantity);

    this.data.stockMovements.unshift({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storeId,
      ingredientId,
      ingredientName: ing.name,
      type: 'saida_venda',
      quantity,
      unit: ing.unit,
      reason,
      orderId,
      timestamp: new Date().toISOString(),
    });
    this.save();
  }

  public addStock(storeId: string, ingredientId: string, quantity: number, reason: string, orderId?: string) {
    const ing = this.data.ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    ing.currentStock += quantity;

    this.data.stockMovements.unshift({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storeId,
      ingredientId,
      ingredientName: ing.name,
      type: 'entrada',
      quantity,
      unit: ing.unit,
      reason,
      orderId,
      timestamp: new Date().toISOString(),
    });
    this.save();
  }

  public getStockMovements(storeId: string): StockMovement[] {
    return this.data.stockMovements
      .filter((m) => m.storeId === storeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getCashSessions(storeId: string): CashSession[] {
    return this.data.cashSessions.filter((c) => c.storeId === storeId);
  }

  public getActiveCashSession(storeId: string): CashSession | undefined {
    return this.data.cashSessions.find((c) => c.storeId === storeId && c.status === 'open');
  }

  public openCashSession(storeId: string, operatorName: string, initialAmount: number): CashSession {
    const session: CashSession = {
      id: `cash-${Date.now()}`,
      storeId,
      operatorName,
      openedAt: new Date().toISOString(),
      initialAmount,
      status: 'open',
      entries: [
        {
          id: `ce-${Date.now()}`,
          type: 'suprimento',
          amount: initialAmount,
          reason: 'Abertura de Caixa (Fundo Inicial)',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.data.cashSessions.unshift(session);
    this.save();
    return session;
  }

  public closeCashSession(sessionId: string, finalAmount: number): CashSession | undefined {
    const s = this.data.cashSessions.find((c) => c.id === sessionId);
    if (!s) return undefined;
    s.status = 'closed';
    s.closedAt = new Date().toISOString();
    s.finalAmount = finalAmount;
    this.save();
    return s;
  }

  public addCashEntry(sessionId: string, entry: Omit<CashEntry, 'id' | 'timestamp'>): CashEntry | undefined {
    const s = this.data.cashSessions.find((c) => c.id === sessionId);
    if (!s || s.status !== 'open') return undefined;
    const fullEntry: CashEntry = {
      ...entry,
      id: `ce-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    s.entries.push(fullEntry);
    this.save();
    return fullEntry;
  }

  public getTables(storeId: string): TableItem[] {
    return this.data.tables.filter((t) => t.storeId === storeId);
  }

  public updateTable(id: string, partial: Partial<TableItem>): TableItem | undefined {
    const idx = this.data.tables.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.data.tables[idx] = { ...this.data.tables[idx], ...partial };
    this.save();
    return this.data.tables[idx];
  }

  public getPlans(): SaaSPlan[] {
    return this.data.plans;
  }

  public getAllStores(): Store[] {
    return this.data.stores;
  }

  public getAllOrders(): Order[] {
    return this.data.orders;
  }

  // Subscription Invoices & Renewal with Automatic Recognition
  public getSubscriptionInvoices(storeId?: string): SubscriptionInvoice[] {
    if (!this.data.subscriptionInvoices) this.data.subscriptionInvoices = [];
    if (storeId) {
      return this.data.subscriptionInvoices.filter((i) => i.storeId === storeId);
    }
    return this.data.subscriptionInvoices;
  }

  public getSubscriptionInvoiceById(id: string): SubscriptionInvoice | undefined {
    if (!this.data.subscriptionInvoices) this.data.subscriptionInvoices = [];
    return this.data.subscriptionInvoices.find((i) => i.id === id || i.txId === id);
  }

  public createSubscriptionInvoice(invoice: SubscriptionInvoice): SubscriptionInvoice {
    if (!this.data.subscriptionInvoices) this.data.subscriptionInvoices = [];
    this.data.subscriptionInvoices.unshift(invoice);
    this.save();
    return invoice;
  }

  public confirmSubscriptionInvoice(
    invoiceId: string,
    notes?: string
  ): { success: boolean; invoice: SubscriptionInvoice; store: Store } | undefined {
    if (!this.data.subscriptionInvoices) this.data.subscriptionInvoices = [];
    const inv = this.data.subscriptionInvoices.find((i) => i.id === invoiceId || i.txId === invoiceId);
    if (!inv) return undefined;

    const store = this.data.stores.find((s) => s.id === inv.storeId);
    if (!store) return undefined;

    inv.status = 'paid';
    inv.paidAt = new Date().toISOString();
    inv.autoReconciled = true;
    if (notes) inv.notes = notes;

    // Extend store subscription
    const currentExp = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date();
    const now = new Date();
    const baseDate = currentExp > now ? currentExp : now;
    const daysToAdd = inv.cycle === 'yearly' ? 365 : 30;
    baseDate.setDate(baseDate.getDate() + daysToAdd);

    store.subscriptionExpiresAt = baseDate.toISOString();
    store.subscriptionCycle = inv.cycle;
    store.subscriptionLastRenewedAt = new Date().toISOString();
    store.status = 'active';
    if (inv.planId && (inv.planId.includes('pro') || inv.planId.includes('enterprise') || inv.planId.includes('essencial'))) {
      const planKey = inv.planId.replace('plan-', '') as any;
      if (['essencial', 'pro', 'enterprise'].includes(planKey)) {
        store.plan = planKey;
      }
    }

    this.save();
    return { success: true, invoice: inv, store: this.sanitizeStore(store) };
  }

  public setStoreDefaultPixItau(storeId: string): Store | undefined {
    const store = this.data.stores.find((s) => s.id === storeId);
    if (!store) return undefined;

    store.pixConfig = {
      key: '8e7fc37c-634d-4408-9e81-3fbea689d8b2',
      keyType: 'random',
      beneficiaryName: 'Banco Itaú / Titular Oficial',
      city: 'SAO PAULO',
    };
    this.save();
    return this.sanitizeStore(store);
  }
}

export const db = new Database();
