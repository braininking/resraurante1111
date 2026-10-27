import React, { useState } from 'react';
import { Store, WhatsAppWebhookConfig, WhatsAppWebhookLog } from '../../types';
import { api } from '../../services/api';
import {
  MessageCircle,
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Smartphone,
  Save,
  QrCode,
  Link,
  Webhook,
  Play,
  Copy,
  Clock,
  ShieldCheck,
  Bell,
  Code,
  AlertCircle,
} from 'lucide-react';

interface Props {
  store: Store;
  onUpdateStore: (updated: Store) => void;
}

export const StoreWhatsAppBot: React.FC<Props> = ({ store, onUpdateStore }) => {
  const [activeSubTab, setActiveSubTab] = useState<'bot' | 'webhooks'>('bot');

  // Bot Settings
  const [greeting, setGreeting] = useState(store.whatsappBot?.greeting || '');
  const [menuMessage, setMenuMessage] = useState(store.whatsappBot?.menuMessage || '');
  const [pixInstructions, setPixInstructions] = useState(
    store.whatsappBot?.pixInstructions || 'Copie o código Copia e Cola gerado para aprovação instantânea.'
  );
  const [enabled, setEnabled] = useState(store.whatsappBot?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Webhook Settings
  const initialWebhookConfig = store.whatsappWebhookConfig || {
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
    logs: [],
  };

  const [webhookEnabled, setWebhookEnabled] = useState(initialWebhookConfig.enabled ?? true);
  const [webhookProvider, setWebhookProvider] = useState<'zapi' | 'evolution' | 'baileys' | 'meta_cloud'>(
    initialWebhookConfig.provider || 'zapi'
  );
  const [webhookApiEndpoint, setWebhookApiEndpoint] = useState(initialWebhookConfig.apiEndpoint || '');
  const [webhookApiToken, setWebhookApiToken] = useState(initialWebhookConfig.apiToken || '');
  const [webhookSecret, setWebhookSecret] = useState(initialWebhookConfig.webhookSecret || '');
  const [webhookEvents, setWebhookEvents] = useState(initialWebhookConfig.events);
  const [customTemplates, setCustomTemplates] = useState(initialWebhookConfig.customTemplates);
  const [webhookLogs, setWebhookLogs] = useState<WhatsAppWebhookLog[]>(initialWebhookConfig.logs || []);

  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testWebhookEvent, setTestWebhookEvent] = useState('order.pix_confirmed');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Simulator chat state
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: `${greeting || 'Olá! Como podemos te ajudar hoje?'}\n\n1️⃣ Digite *1* para ver o Cardápio Digital\n2️⃣ Digite *2* para falar com atendente`,
      time: '19:40',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [simLoading, setSimLoading] = useState(false);

  const inboundWebhookUrl = `${window.location.origin}/api/webhooks/whatsapp/${store.slug}`;

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(inboundWebhookUrl);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2500);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateStore(store.id, {
        whatsappBot: {
          ...store.whatsappBot,
          enabled,
          greeting,
          menuMessage,
          pixInstructions,
        },
        whatsappWebhookConfig: {
          enabled: webhookEnabled,
          provider: webhookProvider,
          webhookUrl: inboundWebhookUrl,
          apiEndpoint: webhookApiEndpoint,
          apiToken: webhookApiToken,
          webhookSecret,
          events: webhookEvents,
          customTemplates,
          logs: webhookLogs,
        },
      });
      onUpdateStore(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar configurações do WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhookDispatch = async () => {
    try {
      setTestingWebhook(true);
      setTestResult(null);
      const res = await api.testWhatsAppWebhook(store.id, testWebhookEvent);
      setTestResult(res.message);
      if (res.log) {
        setWebhookLogs((prev) => [res.log, ...prev]);
      }
    } catch (err: any) {
      setTestResult(`Erro no teste: ${err.message || 'Falha ao despachar webhook'}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSendSimMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    setInputMsg('');
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { sender: 'user', text: userText, time: nowTime }]);
    setSimLoading(true);

    try {
      const res = await api.simulateWhatsAppBot(store.id, userText);
      setMessages((prev) => [...prev, { sender: 'bot', text: res.reply, time: nowTime }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Desculpe, nosso robô está em manutenção no momento.', time: nowTime },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base font-black text-slate-900">Automação de WhatsApp & Webhooks Oficiais</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Responda 24h por dia no WhatsApp, envie notificações automáticas de status e integre APIs oficiais (Z-API, Evolution, Baileys, Meta)
          </p>
        </div>

        {/* Sub-tab pills & Save Button */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('bot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'bot' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Robô & Simulador
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('webhooks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'webhooks' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Webhook className="w-3.5 h-3.5" />
              Webhooks & APIs
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configurações do WhatsApp e Webhooks salvas com sucesso!</span>
        </div>
      )}

      {/* SUB-TAB 1: ROBÔ DE ATENDIMENTO & SIMULADOR */}
      {activeSubTab === 'bot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Configuration Form */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-bold text-sm text-slate-900">Mensagens Automáticas do Robô</h2>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Robô Ativo</span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Mensagem de Saudação Inicial:
                </label>
                <textarea
                  rows={3}
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Olá! Bem-vindo à nossa loja! Como podemos ajudar hoje?"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Enviada assim que o cliente envia a primeira mensagem no WhatsApp.</p>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Chamada com Link do Cardápio Digital:
                </label>
                <textarea
                  rows={2}
                  value={menuMessage}
                  onChange={(e) => setMenuMessage(e.target.value)}
                  placeholder="Confira nosso cardápio completo e monte seu pedido sem filas:"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">O link interativo exclusivo da sua loja é adicionado automaticamente pelo robô.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold block">
                    Instruções de Pagamento Pix Automático:
                  </label>
                  <button
                    type="button"
                    onClick={() => setPixInstructions('Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2')}
                    className="text-[10px] text-orange-800 bg-orange-50 hover:bg-orange-100 font-bold px-2 py-0.5 rounded border border-orange-200 transition-colors"
                  >
                    Usar Chave Itaú Oficial
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={pixInstructions}
                  onChange={(e) => setPixInstructions(e.target.value)}
                  placeholder="Você pode transferir de qualquer banco para minha chave Pix Itaú: 8e7fc37c-634d-4408-9e81-3fbea689d8b2"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="pt-2">
                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-950">
                    <strong className="block font-bold">Automação de Respostas Inteligentes:</strong>
                    O robô detecta automaticamente quando o cliente digita palavras como <em>"cardapio"</em>, <em>"pedir"</em>, <em>"fome"</em>, <em>"rastreio"</em> ou <em>"pix"</em> e envia o link direto em menos de 1 segundo!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Realistic Phone Simulator */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[340px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800">
              {/* Phone Speaker & Notch */}
              <div className="flex justify-center mb-2">
                <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-950 mr-2" />
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>
              </div>

              {/* WhatsApp Interface Screen */}
              <div className="bg-[#EFEAE2] rounded-[28px] overflow-hidden flex flex-col h-[520px] relative text-slate-900">
                {/* Chat Top Header */}
                <div className="bg-[#075E54] text-white p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                    />
                    <div>
                      <h4 className="font-bold text-xs truncate max-w-[150px]">{store.name}</h4>
                      <span className="text-[10px] text-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        online comercial
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                  <div className="flex justify-center">
                    <span className="bg-white/80 shadow-xs px-2 py-0.5 rounded text-[10px] text-slate-500 font-semibold">
                      HOJE
                    </span>
                  </div>

                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl shadow-xs text-xs whitespace-pre-wrap relative ${
                          m.sender === 'user'
                            ? 'bg-[#E7FFDB] text-slate-900 rounded-tr-none'
                            : 'bg-white text-slate-900 rounded-tl-none'
                        }`}
                      >
                        {m.text}
                        <span className="text-[9px] text-slate-400 block text-right mt-1">
                          {m.time}
                        </span>
                      </div>
                    </div>
                  ))}

                  {simLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none shadow-xs text-slate-400 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input Bottom */}
                <form
                  onSubmit={handleSendSimMessage}
                  className="bg-[#F0F2F5] p-2 flex items-center gap-1.5 border-t border-slate-200"
                >
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Digite 'cardapio' ou 'oi'..."
                    className="flex-1 bg-white px-3 py-2 rounded-full text-xs outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-full bg-[#00A884] text-white flex items-center justify-center shrink-0 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">Simulador interativo em tempo real</p>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONFIGURAÇÃO DE WEBHOOKS & APIS OFICIAIS */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Webhook Gateway Setup */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-sm text-slate-900">Configuração de Webhooks WhatsApp</h2>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Webhooks Ativos</span>
                </label>
              </div>

              {/* Provider Selection */}
              <div className="space-y-1.5 text-xs">
                <label className="text-slate-700 font-bold block">Plataforma / Provedor de API WhatsApp:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'zapi', label: 'Z-API' },
                    { id: 'evolution', label: 'Evolution API' },
                    { id: 'baileys', label: 'Baileys / WPP' },
                    { id: 'meta_cloud', label: 'Meta Cloud API' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setWebhookProvider(p.id as any)}
                      className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                        webhookProvider === p.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inbound Webhook URL */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">URL do Webhook de Entrada (Recebimento):</span>
                  <button
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedWebhookUrl ? 'Copiado!' : 'Copiar URL'}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={inboundWebhookUrl}
                  className="w-full bg-white p-2 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700"
                />
                <p className="text-[10px] text-slate-400">
                  Configure este endpoint no painel da sua API ({webhookProvider.toUpperCase()}) para receber eventos em tempo real.
                </p>
              </div>

              {/* API Credentials */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Endpoint de Envio da API ({webhookProvider.toUpperCase()}):
                  </label>
                  <input
                    type="text"
                    value={webhookApiEndpoint}
                    onChange={(e) => setWebhookApiEndpoint(e.target.value)}
                    placeholder="https://api.z-api.io/instances/..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Token / Client-Token:
                    </label>
                    <input
                      type="password"
                      value={webhookApiToken}
                      onChange={(e) => setWebhookApiToken(e.target.value)}
                      placeholder="tok_live_..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Webhook Secret / Chave de Validação:
                    </label>
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="whsec_..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Event Triggers */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Eventos que Disparam Notificações Automáticas:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.orderCreated}
                      onChange={(e) => setWebhookEvents({ ...webhookEvents, orderCreated: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Pedido Criado (`order.created`)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.orderConfirmed}
                      onChange={(e) => setWebhookEvents({ ...webhookEvents, orderConfirmed: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Pedido Confirmado (`order.confirmed`)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.pixConfirmed}
                      onChange={(e) => setWebhookEvents({ ...webhookEvents, pixConfirmed: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Pix Confirmado (`order.pix_paid`)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.orderDispatched}
                      onChange={(e) => setWebhookEvents({ ...webhookEvents, orderDispatched: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Saiu para Entrega (`order.dispatched`)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.orderDelivered}
                      onChange={(e) => setWebhookEvents({ ...webhookEvents, orderDelivered: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Pedido Entregue (`order.delivered`)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.orderCancelled}
                      onChange={(e) => setWebhookEvents({ ...webhookEvents, orderCancelled: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Pedido Cancelado (`order.cancelled`)</span>
                  </label>
                </div>
              </div>

              {/* Test Dispatch Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-950">Disparo de Teste:</span>
                  <select
                    value={testWebhookEvent}
                    onChange={(e) => setTestWebhookEvent(e.target.value)}
                    className="p-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-bold"
                  >
                    <option value="order.pix_confirmed">Pix Aprovado</option>
                    <option value="order.created">Novo Pedido</option>
                    <option value="order.dispatched">Saiu para Entrega</option>
                    <option value="order.delivered">Pedido Entregue</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleTestWebhookDispatch}
                  disabled={testingWebhook}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {testingWebhook ? 'Disparando...' : 'Testar Disparo Webhook'}
                </button>
              </div>

              {testResult && (
                <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono">
                  {testResult}
                </div>
              )}
            </div>

            {/* Right: Notification Templates & Dynamic Tags */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900">Modelos de Mensagens (Templates)</h3>
                <p className="text-[11px] text-slate-400">Variáveis disponíveis: {'{cliente}, {id_pedido}, {total}, {tempo}, {link_rastreamento}'}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Template: Pix Confirmado Instantâneo
                  </label>
                  <textarea
                    rows={2}
                    value={customTemplates.pixConfirmed}
                    onChange={(e) => setCustomTemplates({ ...customTemplates, pixConfirmed: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Template: Pedido Confirmado / Cozinha
                  </label>
                  <textarea
                    rows={2}
                    value={customTemplates.orderConfirmed}
                    onChange={(e) => setCustomTemplates({ ...customTemplates, orderConfirmed: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Template: Saiu para Entrega (Delivery)
                  </label>
                  <textarea
                    rows={2}
                    value={customTemplates.orderDispatched}
                    onChange={(e) => setCustomTemplates({ ...customTemplates, orderDispatched: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Template: Pedido Entregue / Avaliação
                  </label>
                  <textarea
                    rows={2}
                    value={customTemplates.orderDelivered}
                    onChange={(e) => setCustomTemplates({ ...customTemplates, orderDelivered: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Execution Console & Logs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">Console de Execução & Logs de Webhook</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{webhookLogs.length} eventos registrados</span>
            </div>

            {webhookLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2 px-3">Data / Hora</th>
                      <th className="py-2 px-3">Evento</th>
                      <th className="py-2 px-3">Destino</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Retorno da API</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {webhookLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {log.event}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{log.destinationPhone}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {log.status} OK
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                          {log.response}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhum disparo de webhook registrado ainda.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
