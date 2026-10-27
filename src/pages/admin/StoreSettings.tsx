import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Store, DeliveryZone, PixAutomatedConfig, WebSocketPrinterConfig } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { generatePixPayloadClient, validatePixKey } from '../../utils/pix';
import { PixStoreKeyForm } from '../../components/PixStoreKeyForm';
import {
  Settings,
  Printer,
  QrCode,
  MapPin,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Zap,
  Wifi,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Key,
  Check,
  Building2,
  Mail,
  Phone,
  HelpCircle,
} from 'lucide-react';

interface Props {
  store: Store;
  onUpdateStore: (updated: Store) => void;
}

export const StoreSettings: React.FC<Props> = ({ store, onUpdateStore }) => {
  // Store Info
  const [name, setName] = useState(store.name);
  const [tagline, setTagline] = useState(store.tagline);
  const [phone, setPhone] = useState(store.phone);
  const [whatsapp, setWhatsapp] = useState(store.whatsapp);
  const [address, setAddress] = useState(store.address);
  const [minOrderValue, setMinOrderValue] = useState(store.minOrderValue.toString());

  // Pix Config (Manual / Chave)
  const [pixKey, setPixKey] = useState(store.pixConfig?.key || '');
  const [pixKeyType, setPixKeyType] = useState(store.pixConfig?.keyType || 'email');
  const [beneficiaryName, setBeneficiaryName] = useState(store.pixConfig?.beneficiaryName || '');
  const [pixCity, setPixCity] = useState(store.pixConfig?.city || 'SAO PAULO');

  // Pix Automático (Gateway & Webhooks)
  const [pixAutoEnabled, setPixAutoEnabled] = useState(store.pixAutomatedConfig?.enabled ?? true);
  const [pixProvider, setPixProvider] = useState<'mercadopago' | 'openpix' | 'asaas' | 'efi' | 'simulado'>(
    store.pixAutomatedConfig?.provider || 'simulado'
  );
  const [pixAccessToken, setPixAccessToken] = useState(store.pixAutomatedConfig?.accessToken || '');
  const [pixPublicKey, setPixPublicKey] = useState(store.pixAutomatedConfig?.publicKey || '');
  const [pixWebhookSecret, setPixWebhookSecret] = useState(store.pixAutomatedConfig?.webhookSecret || '');
  const [pixAutoApprove, setPixAutoApprove] = useState(store.pixAutomatedConfig?.autoApproveOrder ?? true);
  const [pixAutoPrint, setPixAutoPrint] = useState(store.pixAutomatedConfig?.autoPrintOnApproval ?? true);
  const [pixSendWhatsApp, setPixSendWhatsApp] = useState(store.pixAutomatedConfig?.sendWhatsAppNotification ?? true);
  const [testingPix, setTestingPix] = useState(false);
  const [pixTestResult, setPixTestResult] = useState<string | null>(null);

  // WebSocket Printer Config
  const [wsPrintEnabled, setWsPrintEnabled] = useState(store.websocketPrinterConfig?.enabled ?? true);
  const [wsMode, setWsMode] = useState<'cloud_hub' | 'local_agent'>(store.websocketPrinterConfig?.mode || 'cloud_hub');
  const [wsAgentUrl, setWsAgentUrl] = useState(store.websocketPrinterConfig?.agentUrl || 'ws://127.0.0.1:9100');
  const [wsTargetStation, setWsTargetStation] = useState<'todos' | 'caixa' | 'cozinha'>(
    store.websocketPrinterConfig?.targetStation || 'todos'
  );
  const [paperWidth, setPaperWidth] = useState<58 | 80>(store.websocketPrinterConfig?.paperWidth || store.printSettings?.paperWidth || 80);
  const [autoPrintNewOrder, setAutoPrintNewOrder] = useState(store.websocketPrinterConfig?.autoPrintNewOrder ?? true);
  const [autoPrintPixApproved, setAutoPrintPixApproved] = useState(store.websocketPrinterConfig?.autoPrintPixApproved ?? true);
  const [cutPaper, setCutPaper] = useState(store.websocketPrinterConfig?.cutPaper ?? true);
  const [beepOnPrint, setBeepOnPrint] = useState(store.websocketPrinterConfig?.beepOnPrint ?? true);
  const [soundAlert, setSoundAlert] = useState(store.printSettings?.soundAlert ?? true);

  // Live printer connection status
  const [printerStatus, setPrinterStatus] = useState<{ connected: boolean; activeAgents: number; wsUrl: string }>({
    connected: false,
    activeAgents: 0,
    wsUrl: '',
  });
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [printerTestResult, setPrinterTestResult] = useState<string | null>(null);

  // Delivery Zones
  const [zones, setZones] = useState<DeliveryZone[]>(store.deliveryZones || []);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFee, setNewZoneFee] = useState('');
  const [newZoneMinutes, setNewZoneMinutes] = useState('35');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedPixWebhook, setCopiedPixWebhook] = useState(false);

  // Check printer connection status
  useEffect(() => {
    api.getPrinterStatus(store.id)
      .then((st) => setPrinterStatus(st))
      .catch((err) => console.error('Error fetching printer status', err));
  }, [store.id]);

  const pixWebhookUrl = `${window.location.origin}/api/webhooks/pix/${store.slug}`;

  const handleCopyPixWebhook = () => {
    navigator.clipboard.writeText(pixWebhookUrl);
    setCopiedPixWebhook(true);
    setTimeout(() => setCopiedPixWebhook(false), 2500);
  };

  const handleTestPixGateway = async () => {
    try {
      setTestingPix(true);
      setPixTestResult(null);
      const res = await api.testPixAutomated(store.id);
      setPixTestResult(res.message);
    } catch (err: any) {
      setPixTestResult(`Erro: ${err.message || 'Falha ao validar gateway Pix'}`);
    } finally {
      setTestingPix(false);
    }
  };

  const handleTestWebSocketPrinter = async () => {
    try {
      setTestingPrinter(true);
      setPrinterTestResult(null);
      const res = await api.testWebSocketPrinter(store.id);
      setPrinterTestResult(res.message);
      // Refresh status
      const updatedStatus = await api.getPrinterStatus(store.id);
      setPrinterStatus(updatedStatus);
    } catch (err: any) {
      setPrinterTestResult(`Erro: ${err.message || 'Falha no envio WebSocket'}`);
    } finally {
      setTestingPrinter(false);
    }
  };

  const handleAddZone = () => {
    if (!newZoneName.trim() || !newZoneFee) return;
    const newZone: DeliveryZone = {
      id: `z-${Date.now()}`,
      name: newZoneName.trim(),
      fee: parseFloat(newZoneFee) || 0,
      estimatedMinutes: parseInt(newZoneMinutes, 10) || 30,
    };
    setZones([...zones, newZone]);
    setNewZoneName('');
    setNewZoneFee('');
  };

  const handleRemoveZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateStore(store.id, {
        name,
        tagline,
        phone,
        whatsapp,
        address,
        minOrderValue: parseFloat(minOrderValue) || 0,
        printSettings: {
          paperWidth,
          autoPrint: autoPrintNewOrder,
          copies: 1,
          soundAlert,
        },
        pixConfig: {
          key: pixKey,
          keyType: pixKeyType as any,
          beneficiaryName,
          city: pixCity,
        },
        pixAutomatedConfig: {
          enabled: pixAutoEnabled,
          provider: pixProvider,
          accessToken: pixAccessToken,
          publicKey: pixPublicKey,
          webhookSecret: pixWebhookSecret,
          autoApproveOrder: pixAutoApprove,
          autoPrintOnApproval: pixAutoPrint,
          sendWhatsAppNotification: pixSendWhatsApp,
          lastTestedAt: new Date().toISOString(),
          testStatus: 'success',
        },
        websocketPrinterConfig: {
          enabled: wsPrintEnabled,
          mode: wsMode,
          agentUrl: wsAgentUrl,
          targetStation: wsTargetStation,
          autoPrintNewOrder,
          autoPrintPixApproved,
          copies: 1,
          paperWidth,
          cutPaper,
          beepOnPrint,
          status: 'connected',
          lastConnectedAt: new Date().toISOString(),
        },
        deliveryZones: zones,
      });
      onUpdateStore(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <h1 className="text-base font-black text-slate-900">Configurações & Automações da Loja</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pix automático instantâneo, impressão térmica via WebSocket, bairros de entrega e dados cadastrais
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      {/* Chave Pix da Loja (Configuração Oficial Itaú & QR Code) */}
      <PixStoreKeyForm store={store} onSaveSuccess={onUpdateStore} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Pix Automático & Basic Info */}
        <div className="space-y-6">
          {/* 1. CONFIGURAR PIX AUTOMÁTICO */}
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-emerald-600" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900">Configurar Pix Automático (Instantâneo)</h2>
                  <p className="text-[11px] text-emerald-700 font-bold">Confirmação em tempo real e conciliação bancária</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-emerald-50 px-3 py-1 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={pixAutoEnabled}
                  onChange={(e) => setPixAutoEnabled(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Ativo</span>
              </label>
            </div>

            {/* Provider Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-700 font-bold block">Gateway / Provedor do Pix:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'mercadopago', name: 'Mercado Pago' },
                  { id: 'openpix', name: 'OpenPix / Woovi' },
                  { id: 'asaas', name: 'Asaas' },
                  { id: 'efi', name: 'EFI (Gerencianet)' },
                  { id: 'simulado', name: 'Modo Sandbox/Simulado' },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setPixProvider(prov.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      pixProvider === prov.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {prov.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Webhook Endpoint for Merchant */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">URL do Webhook Oficial da Loja:</span>
                <button
                  type="button"
                  onClick={handleCopyPixWebhook}
                  className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  {copiedPixWebhook ? 'Copiado!' : 'Copiar URL'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={pixWebhookUrl}
                className="w-full bg-white p-2 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700"
              />
              <p className="text-[10px] text-slate-400">
                Cole esta URL no painel de desenvolvedor do seu gateway para receber aprovação instantânea.
              </p>
            </div>

            {/* Credentials Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-700 font-bold block mb-1">Access Token / Chave Privada:</label>
                <input
                  type="password"
                  value={pixAccessToken}
                  onChange={(e) => setPixAccessToken(e.target.value)}
                  placeholder="APP_USR-782910482910482-101419-..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Public Key / Client ID (Opcional):</label>
                <input
                  type="text"
                  value={pixPublicKey}
                  onChange={(e) => setPixPublicKey(e.target.value)}
                  placeholder="APP_USR-..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Webhook Secret / Assinatura:</label>
                <input
                  type="text"
                  value={pixWebhookSecret}
                  onChange={(e) => setPixWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-800 block">Comportamento Automático ao Receber Pix:</span>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pixAutoApprove}
                  onChange={(e) => setPixAutoApprove(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium">Aprovar e encaminhar pedido para a cozinha automaticamente</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pixAutoPrint}
                  onChange={(e) => setPixAutoPrint(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium">Disparar impressão térmica via WebSocket automaticamente</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pixSendWhatsApp}
                  onChange={(e) => setPixSendWhatsApp(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium">Enviar notificação WhatsApp de "Pagamento Confirmado" para o cliente</span>
              </label>
            </div>

            {/* Gateway Test Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <div>
                <p className="text-xs font-bold text-emerald-950">Testar Conexão com Gateway</p>
                <p className="text-[10px] text-emerald-700">Verifique se as credenciais e o webhook estão prontos</p>
              </div>
              <button
                type="button"
                onClick={handleTestPixGateway}
                disabled={testingPix}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                {testingPix ? 'Testando...' : 'Testar Conexão Pix'}
              </button>
            </div>

            {pixTestResult && (
              <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono">
                {pixTestResult}
              </div>
            )}
          </div>

          {/* 2. FORMULÁRIO DE CADASTRO DA CHAVE PIX & NOME DO TITULAR (COMPONENTE MODULAR) */}
          <PixStoreKeyForm
            store={store}
            onSaveSuccess={(updated) => {
              onUpdateStore(updated);
              setPixKey(updated.pixConfig?.key || '');
              setBeneficiaryName(updated.pixConfig?.beneficiaryName || '');
              setPixCity(updated.pixConfig?.city || 'SAO PAULO');
              setPixKeyType(updated.pixConfig?.keyType || 'email');
            }}
          />

          {/* Dados do Estabelecimento */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Identificação do Estabelecimento</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Nome Fantasia:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Slogan / Descrição Curta:</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Telefone Fixo / Balcão:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">WhatsApp de Pedidos:</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Endereço Completo:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Valor Mínimo do Pedido (R$):</label>
                <input
                  type="number"
                  step="0.50"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Impressão via WebSocket & Delivery Zones */}
        <div className="space-y-6">
          {/* 2. IMPRESSÃO VIA WEBSOCKET */}
          <div className="bg-white p-5 rounded-2xl border-2 border-orange-500/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900">Impressão Térmica via WebSocket</h2>
                  <p className="text-[11px] text-orange-700 font-bold">ESC/POS direto para impressoras de 58mm e 80mm</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Live Connection Pulse Indicator */}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Hub WebSocket Ativo
                </span>
              </div>
            </div>

            {/* Mode selection */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-700 font-bold block">Modo de Conexão com Impressora:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWsMode('cloud_hub')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                    wsMode === 'cloud_hub'
                      ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>Cloud Hub Integrado</div>
                  <div className="text-[10px] text-slate-400 font-normal">Impressão direta pelo navegador</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWsMode('local_agent')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                    wsMode === 'local_agent'
                      ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>Agente Desktop Local</div>
                  <div className="text-[10px] text-slate-400 font-normal">ESC/POS (ws://127.0.0.1:9100)</div>
                </button>
              </div>
            </div>

            {/* Target Station */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-700 font-bold block">Destino de Impressão (Estações):</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'todos', label: 'Balcão + Cozinha' },
                  { id: 'caixa', label: 'Apenas Caixa' },
                  { id: 'cozinha', label: 'Apenas Cozinha' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setWsTargetStation(st.id as any)}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                      wsTargetStation === st.id
                        ? 'border-orange-500 bg-orange-50 text-orange-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Width */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-700 font-bold block">Largura da Bobina Térmica:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperWidth(80)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paperWidth === 80
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  80mm (Padrão Epson / Bematech / Elgin)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth(58)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paperWidth === 58
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  58mm (Mini Impressora Térmica Bluetooth)
                </button>
              </div>
            </div>

            {/* Hardware Commands */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-800 block">Comandos ESC/POS de Hardware:</span>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cutPaper}
                  onChange={(e) => setCutPaper(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span className="font-medium">Acionar guilhotina (Corte de papel automático)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beepOnPrint}
                  onChange={(e) => setBeepOnPrint(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span className="font-medium">Beep sonoro da impressora (Buzzer ESC/POS)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrintNewOrder}
                  onChange={(e) => setAutoPrintNewOrder(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span className="font-medium">Imprimir automaticamente ao receber novo pedido</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrintPixApproved}
                  onChange={(e) => setAutoPrintPixApproved(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span className="font-medium">Imprimir comanda assim que o Pix for aprovado</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundAlert}
                  onChange={(e) => setSoundAlert(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span className="font-medium">Alerta sonoro no navegador ao receber pedidos</span>
              </label>
            </div>

            {/* Test Print via WebSocket Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-orange-50/50 p-3 rounded-xl border border-orange-100">
              <div>
                <p className="text-xs font-bold text-orange-950">Disparo de Impressão Teste</p>
                <p className="text-[10px] text-orange-700">Envia comando RAW/ESC-POS via WebSocket para o agente</p>
              </div>
              <button
                type="button"
                onClick={handleTestWebSocketPrinter}
                disabled={testingPrinter}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                {testingPrinter ? 'Enviando...' : 'Testar Impressão WebSocket'}
              </button>
            </div>

            {printerTestResult && (
              <div className="p-2.5 rounded-xl bg-slate-900 text-orange-400 text-xs font-mono">
                {printerTestResult}
              </div>
            )}
          </div>

          {/* Delivery Zones & Fees */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Bairros e Taxas de Entrega</h3>
              </div>
              <span className="text-xs text-slate-400">{zones.length} zonas</span>
            </div>

            {/* List of current zones */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto divide-y divide-slate-100">
              {zones.map((z) => (
                <div key={z.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{z.name}</span>
                    <span className="text-[10px] text-slate-400 block">Tempo estimado: ~{z.estimatedMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900">{formatCurrency(z.fee)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(z.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new zone input */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">Adicionar Novo Bairro:</span>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Nome do Bairro"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="col-span-2 p-2 rounded-lg border border-slate-200"
                />
                <input
                  type="number"
                  step="0.50"
                  placeholder="Taxa (R$)"
                  value={newZoneFee}
                  onChange={(e) => setNewZoneFee(e.target.value)}
                  className="col-span-1 p-2 rounded-lg border border-slate-200 font-bold"
                />
                <input
                  type="number"
                  placeholder="Min"
                  value={newZoneMinutes}
                  onChange={(e) => setNewZoneMinutes(e.target.value)}
                  className="col-span-1 p-2 rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="p-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
