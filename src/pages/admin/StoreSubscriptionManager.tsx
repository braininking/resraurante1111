import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Store, SaaSPlan, SubscriptionInvoice } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  CreditCard,
  Zap,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  QrCode,
  Building2,
  RefreshCw,
  Printer,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle,
  X,
  FileText,
  BadgeCheck,
  TrendingUp,
} from 'lucide-react';

interface Props {
  store: Store;
  onUpdateStore: (updated: Store) => void;
}

export const StoreSubscriptionManager: React.FC<Props> = ({ store, onUpdateStore }) => {
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<{
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
  } | null>(null);

  // Billing Cycle Selection (monthly / yearly)
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(`plan-${store.plan}`);

  // Renewal Modal & Invoice State
  const [activeInvoice, setActiveInvoice] = useState<SubscriptionInvoice | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [reconciledSuccess, setReconciledSuccess] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SubscriptionInvoice | null>(null);

  // Quick Action feedback
  const [defaultPixFeedback, setDefaultPixFeedback] = useState<string | null>(null);
  const [settingDefaultPix, setSettingDefaultPix] = useState(false);

  const pollingTimerRef = useRef<any>(null);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const data = await api.getStoreSubscription(store.id);
      setSubData(data);
      setSelectedPlanId(`plan-${data.plan}`);
    } catch (err) {
      console.error('Error loading subscription', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [store.id]);

  // Polling for automated payment recognition when invoice is pending
  useEffect(() => {
    if (!activeInvoice || activeInvoice.status !== 'pending' || reconciledSuccess) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    setIsRecognizing(true);
    pollingTimerRef.current = setInterval(async () => {
      try {
        const check = await api.checkSubscriptionInvoiceStatus(activeInvoice.id);
        if (check.paid) {
          clearInterval(pollingTimerRef.current);
          setIsRecognizing(false);
          setReconciledSuccess(true);
          setActiveInvoice((prev) => (prev ? { ...prev, status: 'paid', paidAt: check.paidAt, autoReconciled: true } : null));
          // Refresh store and subscription data
          const updatedStore = await api.getStoreBySlug(store.slug);
          onUpdateStore(updatedStore);
          loadSubscription();
        }
      } catch (err) {
        console.error('Polling payment error', err);
      }
    }, 2500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [activeInvoice, reconciledSuccess]);

  const handleStartRenewal = async (targetPlanId?: string) => {
    try {
      setGeneratingInvoice(true);
      setReconciledSuccess(false);
      const planToUse = targetPlanId || selectedPlanId;
      const res = await api.createRenewalPix(store.id, {
        planId: planToUse,
        cycle: selectedCycle,
      });
      setActiveInvoice(res.invoice);
    } catch (err: any) {
      alert(`Erro ao gerar fatura de renovação: ${err.message || 'Tente novamente'}`);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSimulateAutomatedRecognition = async () => {
    if (!activeInvoice) return;
    try {
      setIsRecognizing(true);
      const res = await api.confirmSubscriptionInvoice(activeInvoice.id);
      setActiveInvoice(res.invoice);
      setReconciledSuccess(true);
      setIsRecognizing(false);
      onUpdateStore(res.store);
      loadSubscription();
    } catch (err: any) {
      alert(`Erro na conciliação: ${err.message}`);
      setIsRecognizing(false);
    }
  };

  const handleCopyPixKey = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyPayload = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleApplyItauAsStoreDefault = async () => {
    try {
      setSettingDefaultPix(true);
      setDefaultPixFeedback(null);
      const res = await api.setStoreDefaultPixItau(store.id);
      onUpdateStore(res.store);
      setDefaultPixFeedback('Chave Pix Itaú configurada como padrão para os pedidos da sua loja!');
      setTimeout(() => setDefaultPixFeedback(null), 4000);
    } catch (err: any) {
      alert(`Erro ao configurar chave: ${err.message}`);
    } finally {
      setSettingDefaultPix(false);
    }
  };

  if (loading && !subData) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Carregando Informações da Assinatura...</h3>
        <p className="text-xs text-slate-500 mt-1">Consultando status e histórico de renovações Pix Itaú</p>
      </div>
    );
  }

  const itauKey = subData?.platformPix.key || '8e7fc37c-634d-4408-9e81-3fbea689d8b2';
  const itauInstructions =
    subData?.platformPix.instructions ||
    `Você pode transferir de qualquer banco para minha chave Pix Itaú: ${itauKey}`;

  const currentPlan = subData?.planDetails;
  const isExpiringSoon = subData && subData.daysLeft <= 5 && subData.daysLeft > 0;
  const isExpired = subData && subData.daysLeft <= 0;

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER OFICIAL CHAVE PIX ITAÚ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white p-6 sm:p-7 rounded-3xl shadow-md">
        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-12 w-48 h-48 bg-orange-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chave Pix Oficial Itaú • Reconhecimento Automático</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Renovação de Assinatura via Pix Instantâneo
            </h1>

            {/* Requisito explícito do usuário */}
            <div className="bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 font-black text-xs">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>BANCO ITAÚ S.A. (CÓDIGO 341)</span>
              </div>
              <p className="text-sm font-bold text-white tracking-wide">
                "{itauInstructions}"
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-orange-100">
                <span className="flex items-center gap-1 font-mono bg-white/15 px-2.5 py-0.5 rounded-lg">
                  Chave EVP: {itauKey}
                </span>
                <span>• Titular: {subData?.platformPix.beneficiaryName}</span>
                <span>• Prazo: Reconhecimento em até 3 segundos</span>
              </div>
            </div>
          </div>

          {/* Quick Actions in Banner */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => handleCopyPixKey(itauKey)}
              className="px-4 py-3 bg-white text-slate-900 hover:bg-slate-50 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {copiedKey ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Chave Itaú Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-orange-600" />
                  <span>Copiar Chave Pix Itaú</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleStartRenewal()}
              disabled={generatingInvoice}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{generatingInvoice ? 'Gerando QR Code...' : 'Renovar Meu Plano Agora'}</span>
            </button>
          </div>
        </div>

        {/* Informação sobre compatibilidade bancária */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-orange-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Transferência aceita de <strong>qualquer banco</strong>: Itaú, Nubank, Bradesco, Banco do Brasil, Santander, Inter, C6, Mercado Pago, Caixa, etc.</span>
          </div>
          <button
            onClick={handleApplyItauAsStoreDefault}
            disabled={settingDefaultPix}
            className="text-[11px] font-bold text-white underline hover:text-amber-200 transition-colors flex items-center gap-1"
          >
            {settingDefaultPix ? 'Aplicando...' : 'Usar esta chave Itaú também para receber pedidos da loja'}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {defaultPixFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{defaultPixFeedback}</span>
        </div>
      )}

      {/* 2. STATUS CARD DA ASSINATURA ATUAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plano Atual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>SEU PLANO ATUAL</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 uppercase">
              {store.status === 'active' ? 'Ativo' : store.status === 'trial' ? 'Período Teste' : 'Suspenso'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-black text-slate-900 capitalize">
              {currentPlan?.name || `Plano ${store.plan}`}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {formatCurrency(currentPlan?.priceMonthly || 129.9)} /mês ({formatCurrency(currentPlan?.priceYearly || 1299)} /ano)
          </p>
        </div>

        {/* Validade / Vencimento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>VALIDADE DA ASSINATURA</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-black text-slate-900">
              {subData?.subscriptionExpiresAt
                ? formatDate(subData.subscriptionExpiresAt)
                : 'Em 30 dias'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {isExpired ? (
              <span className="text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Assinatura expirada! Renove agora.
              </span>
            ) : isExpiringSoon ? (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Restam apenas {subData?.daysLeft} dias!
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Restam {subData?.daysLeft || 30} dias de acesso total
              </span>
            )}
          </div>
        </div>

        {/* Reconhecimento Automático */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>RECONHECIMENTO PIX</span>
            <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-black text-emerald-600">Automático</h2>
          </div>
          <p className="text-xs text-slate-500">
            Liberação instantânea sem necessidade de envio manual de comprovante.
          </p>
        </div>
      </div>

      {/* 3. SELEÇÃO DE PLANOS & TABELA COMPARATIVA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Escolha o Período e Renove sua Assinatura</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pague com Pix Itaú de qualquer banco e tenha a ativação imediata pelo robô financeiro
            </p>
          </div>

          {/* Toggle Mensal vs Anual */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedCycle('monthly')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mensal (30 dias)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('yearly')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                selectedCycle === 'yearly'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Anual (12 meses)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${selectedCycle === 'yearly' ? 'bg-amber-300 text-slate-950' : 'bg-emerald-100 text-emerald-800'}`}>
                15% OFF
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(subData?.availablePlans || []).map((p) => {
            const isCurrent = store.plan === p.id.replace('plan-', '');
            const isSelected = selectedPlanId === p.id;
            const price = selectedCycle === 'yearly' ? p.priceYearly : p.priceMonthly;

            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-6 transition-all flex flex-col justify-between border-2 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/20 shadow-md ring-2 ring-orange-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Popular or Current Badge */}
                {p.id === 'plan-pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase rounded-full shadow-sm tracking-wider">
                    Mais Popular & Recomendado
                  </div>
                )}
                {isCurrent && p.id !== 'plan-pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-full shadow-sm tracking-wider">
                    Plano Atual
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Até {p.maxOrdersPerMonth.toLocaleString('pt-BR')} pedidos/mês
                    </p>
                  </div>

                  <div className="pt-2 pb-3 border-y border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-400">R$</span>
                      <span className="text-3xl font-black text-slate-900">{price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-xs font-bold text-slate-500">
                        /{selectedCycle === 'yearly' ? 'ano' : 'mês'}
                      </span>
                    </div>
                    {selectedCycle === 'yearly' && (
                      <p className="text-[11px] text-emerald-600 font-bold mt-1">
                        Equivalente a {formatCurrency(price / 12)} /mês
                      </p>
                    )}
                  </div>

                  {/* Features list */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                      Recursos inclusos:
                    </span>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(p.id);
                      handleStartRenewal(p.id);
                    }}
                    disabled={generatingInvoice}
                    className={`w-full py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xs ${
                      p.id === 'plan-pro'
                        ? 'bg-orange-600 hover:bg-orange-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>
                      {isCurrent ? 'Renovar Plano Atual com Pix' : 'Mudar & Pagar com Pix Itaú'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. MODAL DE PAGAMENTO PIX ITAÚ COM RECONHECIMENTO AUTOMÁTICO */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 relative">
              <button
                onClick={() => setActiveInvoice(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>Banco Itaú • Chave Oficial</span>
              </div>

              <h3 className="text-xl font-black">Renovação de Assinatura</h3>
              <p className="text-xs text-orange-100 mt-1">
                {activeInvoice.planName} • Ciclo {activeInvoice.cycle === 'yearly' ? 'Anual' : 'Mensal'}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Status de Reconhecimento Automático */}
              {reconciledSuccess ? (
                <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-600 text-white rounded-full mx-auto flex items-center justify-center shadow-md animate-bounce">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-emerald-950">
                      🎉 Pagamento Reconhecido com Sucesso!
                    </h4>
                    <p className="text-xs font-bold text-emerald-800 mt-1">
                      Sua assinatura foi renovada e o acesso total da sua loja está desbloqueado.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs font-mono text-slate-700 text-left space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transação Itaú:</span>
                      <span className="font-bold">{activeInvoice.txId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Pago:</span>
                      <span className="font-bold">{formatCurrency(activeInvoice.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Plano Ativo:</span>
                      <span className="font-bold text-emerald-700">{activeInvoice.planName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveInvoice(null);
                      setReconciledSuccess(false);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Concluir e Continuar Operando
                  </button>
                </div>
              ) : (
                <>
                  {/* Radar de Reconhecimento em Tempo Real */}
                  <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                      <span className="absolute w-full h-full rounded-full bg-orange-400/40 animate-ping" />
                      <span className="w-3.5 h-3.5 rounded-full bg-orange-600" />
                    </div>
                    <div className="text-xs">
                      <span className="font-black text-slate-900 block">Reconhecimento Automático Ativo</span>
                      <span className="text-slate-600">
                        O sistema detecta o Pix em até 3 segundos e ativa o plano sem necessidade de comprovante.
                      </span>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      Escaneie o QR Code no app de QUALQUER banco:
                    </span>

                    {activeInvoice.qrCodeUrl ? (
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <img
                          src={activeInvoice.qrCodeUrl}
                          alt="QR Code Pix Itaú"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-56 h-56 bg-slate-200 rounded-2xl flex items-center justify-center">
                        <QrCode className="w-12 h-12 text-slate-400" />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <span className="text-xs text-slate-400 font-bold">VALOR A PAGAR:</span>
                      <div className="text-2xl font-black text-slate-900">
                        {formatCurrency(activeInvoice.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Requisito explícito: Texto de instrução do Itaú */}
                  <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-orange-900">
                      <Building2 className="w-4 h-4 text-orange-600" />
                      <span>{itauInstructions}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-orange-200">
                      <span className="font-mono text-xs font-bold text-slate-800 truncate mr-2">
                        {itauKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPixKey(itauKey)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[11px] font-black shrink-0 transition-colors"
                      >
                        {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey ? 'Copiada!' : 'Copiar Chave'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Pix Copia e Cola EMV Oficial */}
                  <div className="space-y-1.5 text-xs">
                    <label className="text-slate-700 font-bold block">
                      Código Pix Copia e Cola (EMV):
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        rows={2}
                        value={activeInvoice.pixPayload}
                        className="w-full bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyPayload(activeInvoice.pixPayload)}
                        className="mt-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                      >
                        {copiedPayload ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Código Copia e Cola Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar Código Copia e Cola</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Botão de Teste / Simulação Instantânea do Reconhecimento */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSimulateAutomatedRecognition}
                      disabled={isRecognizing}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>⚡ Reconhecer Pagamento Agora (Simulação Baixa Automática)</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">
                      Simula a resposta imediata da API do Banco Central / Itaú para validação do fluxo em testes.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. HISTÓRICO DE RENOVAÇÕES & RECIBOS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            <h3 className="font-black text-sm text-slate-900">Histórico de Faturas & Renovações</h3>
          </div>
          <span className="text-xs text-slate-400">
            {subData?.invoices.length || 0} faturas registradas
          </span>
        </div>

        {subData?.invoices && subData.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Fatura / Transação</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Ciclo</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Banco / Chave</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subData.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {inv.txId || inv.id}
                    </td>
                    <td className="p-3 text-slate-600">{formatDate(inv.createdAt)}</td>
                    <td className="p-3 font-bold text-slate-800">{inv.planName}</td>
                    <td className="p-3 capitalize text-slate-600">
                      {inv.cycle === 'yearly' ? 'Anual' : 'Mensal'}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="p-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        <Building2 className="w-3 h-3 text-orange-600" />
                        Itaú ({inv.pixKey.substring(0, 8)}...)
                      </span>
                    </td>
                    <td className="p-3">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedReceipt(inv)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                      >
                        Ver Recibo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Nenhuma fatura de renovação gerada ainda.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ao renovar sua assinatura com a chave Pix Itaú, as faturas e comprovantes ficarão registrados aqui.
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE RECIBO / COMPROVANTE */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-sm text-slate-900">Comprovante de Renovação</h4>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Estabelecimento:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plano Contratado:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ciclo:</span>
                <span className="font-bold capitalize">{selectedReceipt.cycle === 'yearly' ? 'Anual' : 'Mensal'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Pago:</span>
                <span className="font-bold text-emerald-700 text-sm">{formatCurrency(selectedReceipt.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data de Pagamento:</span>
                <span className="font-bold">{selectedReceipt.paidAt ? formatDate(selectedReceipt.paidAt) : formatDate(selectedReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Banco Receptor:</span>
                <span className="font-bold">{selectedReceipt.pixKeyBank || 'Banco Itaú S.A.'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chave Pix:</span>
                <span className="font-mono">{selectedReceipt.pixKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Autenticação / txId:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReceipt.txId}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
