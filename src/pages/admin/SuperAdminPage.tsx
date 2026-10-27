import React, { useState, useEffect } from 'react';
import { Store, SaaSPlan } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShieldAlert,
  Building2,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Store as StoreIcon,
  Search,
  Filter,
  LogOut,
  MessageCircle,
  KeyRound,
  Lock,
  UserCheck,
  X,
} from 'lucide-react';

interface Props {
  onNavigateToStorePanel: (storeSlug: string) => void;
  onNavigateToCustomerMenu: (storeSlug: string) => void;
  onLogout?: () => void;
}

export const SuperAdminPage: React.FC<Props> = ({
  onNavigateToStorePanel,
  onNavigateToCustomerMenu,
  onLogout,
}) => {
  const [metrics, setMetrics] = useState<{
    totalStores: number;
    activeStores: number;
    trialStores: number;
    suspendedStores: number;
    mrr: number;
    totalOrdersCount: number;
    totalGMV: number;
    plans: SaaSPlan[];
  } | null>(null);

  const [tenants, setTenants] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New Tenant Modal State
  const [newStoreModal, setNewStoreModal] = useState(false);
  const [name, setName] = useState('');
  const [segment, setSegment] = useState<Store['segment']>('hamburgueria');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('123456');
  const [plan, setPlan] = useState<'essencial' | 'pro' | 'enterprise'>('pro');

  // Change Password Modal State
  const [passwordModalTenant, setPasswordModalTenant] = useState<Store | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [met, ten] = await Promise.all([api.getAdminMetrics(), api.getAdminTenants()]);
      setMetrics(met);
      setTenants(ten);
    } catch (err) {
      console.error('Error loading superadmin', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Clean whatsapp to numbers only with DDD
      const cleanWhatsapp = whatsapp.replace(/\D/g, '');
      await api.createTenant({
        name,
        segment,
        phone,
        whatsapp: cleanWhatsapp,
        password: password || '123456',
        plan,
      });
      setNewStoreModal(false);
      setName('');
      setPhone('');
      setWhatsapp('');
      setPassword('123456');
      loadData();
    } catch (err) {
      alert('Erro ao cadastrar novo estabelecimento');
    }
  };

  const handleToggleStatus = async (tenant: Store) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateTenantStatus(tenant.id, newStatus);
      loadData();
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalTenant || !newPasswordInput.trim()) return;

    try {
      setPasswordLoading(true);
      await api.updateTenantPassword(passwordModalTenant.id, newPasswordInput.trim());
      setPasswordSuccess(`Senha de ${passwordModalTenant.name} alterada com sucesso!`);
      setTimeout(() => {
        setPasswordModalTenant(null);
        setNewPasswordInput('');
        setPasswordSuccess('');
      }, 1500);
      loadData();
    } catch (err) {
      alert('Erro ao alterar senha do lojista');
    } finally {
      setPasswordLoading(false);
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.segment.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-300">Carregando painel Superadmin SaaS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">Superadmin SaaS Master</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Gestão da Plataforma
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operador da Plataforma · Gestão de Assinantes, Faturamento Recorrente e Lojas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewStoreModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/40"
          >
            <Plus className="w-4 h-4" />
            Novo Estabelecimento Assinante
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sair do Superadmin"
              className="p-2.5 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MRR */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">MRR Recorrente</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{formatCurrency(metrics.mrr)}</span>
              <span className="text-[11px] font-bold text-emerald-400">/ mês</span>
            </div>
            <p className="text-[11px] text-slate-500">Receita mensal das assinaturas ativas</p>
          </div>

          {/* Active Stores */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Lojas Cadastradas</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{metrics.totalStores}</span>
              <span className="text-[11px] font-bold text-emerald-400">{metrics.activeStores} ativas</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {metrics.trialStores} em teste · {metrics.suspendedStores} suspensas
            </p>
          </div>

          {/* Total Orders GMV */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">GMV Transacionado</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{formatCurrency(metrics.totalGMV)}</span>
              <span className="text-[11px] font-bold text-slate-400">{metrics.totalOrdersCount} pedidos</span>
            </div>
            <p className="text-[11px] text-slate-500">Volume total vendido nas lojas</p>
          </div>

          {/* SaaS Active Plans */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Planos do SaaS</span>
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{metrics.plans.length}</span>
              <span className="text-[11px] font-bold text-orange-400">Essencial/Pro/Ent</span>
            </div>
            <p className="text-[11px] text-slate-500">Modelos de cobrança configurados</p>
          </div>
        </div>

        {/* Plans Showcase - Configured according to the prompt */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Planos de Assinatura da Plataforma</h3>
              <p className="text-xs text-slate-400">Tabela de precificação oficial para os estabelecimentos de alimentação</p>
            </div>
            <span className="text-xs text-purple-400 font-semibold">3 Modalidades Ativas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.plans.map((p) => {
              const isEssencial = p.id === 'plan-essencial' || p.name.includes('Essencial');
              const isPro = p.id === 'plan-pro' || p.name.includes('Pro');
              const isEnterprise = p.id === 'plan-enterprise' || p.name.includes('Enterprise');

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border space-y-4 flex flex-col justify-between transition-all ${
                    isPro
                      ? 'bg-purple-950/20 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-base text-white">{p.name}</h4>
                          {isPro && (
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-500 text-white">
                              Mais Popular
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {isEssencial
                            ? 'Pequenos estabelecimentos & início rápido'
                            : isPro
                            ? 'Automação completa WhatsApp, KDS e PDV'
                            : 'Múltiplas mesas, relatórios e suporte 24/7'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-2xl font-black text-white">{formatCurrency(p.priceMonthly)}</span>
                      <span className="text-xs text-slate-400"> / mês</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Limite: até {p.maxOrdersPerMonth} pedidos/mês
                      </span>
                    </div>

                    <ul className="pt-2 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                      {p.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tenants Table with Direct Support Tools */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white">Estabelecimentos Assinantes & Suporte Técnico</h3>
              <p className="text-xs text-slate-400">Gerencie lojas, preste suporte imediato com impersonate e altere senhas</p>
            </div>
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome, slug ou segmento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Loja</th>
                  <th className="p-3">Segmento</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">WhatsApp Lojista</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações de Suporte Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTenants.map((t) => {
                  let cleanNumber = (t.whatsapp || '').replace(/\D/g, '');
                  if (cleanNumber.length === 10 || cleanNumber.length === 11) {
                    cleanNumber = `55${cleanNumber}`;
                  }
                  const waChatLink = `https://wa.me/${cleanNumber}`;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <img src={t.logo} alt={t.name} className="w-8 h-8 rounded-lg object-cover bg-white" />
                          <div>
                            <span className="block">{t.name}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">/cardapio/{t.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 capitalize font-medium">{t.segment}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-800">
                          {t.plan}
                        </span>
                      </td>
                      {/* WhatsApp Column with direct chat link */}
                      <td className="p-3">
                        <a
                          href={waChatLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir WhatsApp para falar com o lojista"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors font-mono text-[11px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t.whatsapp}</span>
                        </a>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors ${
                            t.status === 'active'
                              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700 hover:bg-emerald-800'
                              : 'bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800'
                          }`}
                        >
                          {t.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </button>
                      </td>
                      {/* Support Actions: Ver Cardápio, Acessar como Loja (Impersonate), Alterar Senha */}
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {/* 1. Ver Cardápio */}
                        <button
                          onClick={() => onNavigateToCustomerMenu(t.slug)}
                          title="Abrir cardápio do cliente em nova aba"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors border border-slate-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          <span>Ver Cardápio</span>
                        </button>

                        {/* 2. Acessar como Loja (Impersonate) */}
                        <button
                          onClick={() => onNavigateToStorePanel(t.slug)}
                          title="Fazer bypass do login e entrar no painel como esta loja para prestar suporte"
                          className="px-2.5 py-1.5 bg-purple-900/70 hover:bg-purple-800 text-purple-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-purple-700 shadow-xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-purple-300" />
                          <span>Acessar como Loja</span>
                        </button>

                        {/* 3. Alterar Senha */}
                        <button
                          onClick={() => {
                            setPasswordModalTenant(t);
                            setNewPasswordInput('');
                            setPasswordSuccess('');
                          }}
                          title="Alterar ou resetar senha do lojista"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold inline-flex items-center transition-colors border border-slate-700"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Store Registration Modal */}
      {newStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTenant}
            className="bg-slate-900 text-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-800"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white">Cadastrar Estabelecimento Assinante</h3>
              <button
                type="button"
                onClick={() => setNewStoreModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nome Fantasia do Estabelecimento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trattoria da Nonna"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Segmento Principal</label>
                  <select
                    value={segment}
                    onChange={(e: any) => setSegment(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                  >
                    <option value="hamburgueria">Hamburgueria</option>
                    <option value="pizzaria">Pizzaria</option>
                    <option value="acaiteria">Açaiteria / Sorveteria</option>
                    <option value="restaurante">Restaurante / Por Quilo</option>
                    <option value="marmitaria">Marmitaria / Caseira</option>
                    <option value="cafeteria">Cafeteria</option>
                    <option value="padaria">Padaria / Confeitaria</option>
                    <option value="japonesa">Cozinha Oriental / Sushi</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Plano Escolhido</label>
                  <select
                    value={plan}
                    onChange={(e: any) => setPlan(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 font-bold"
                  >
                    <option value="essencial">Essencial (R$ 49,90/mês)</option>
                    <option value="pro">Pro (R$ 129,90/mês)</option>
                    <option value="enterprise">Enterprise (R$ 249,90/mês)</option>
                  </select>
                </div>
              </div>

              {/* Explicit WhatsApp Field (digits only with DDD) */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  WhatsApp da Loja (Apenas números com DDD)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 11999998888 ou 5511999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  É para este número que os pedidos do cardápio digital serão direcionados.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Telefone Fixo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="(11) 3333-2222"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Senha de Acesso Inicial</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewStoreModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Criar Estabelecimento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveNewPassword}
            className="bg-slate-900 text-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-800"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Alterar Senha do Lojista</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalTenant(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Defina uma nova senha para <strong className="text-white">{passwordModalTenant.name}</strong>. O lojista poderá utilizá-la imediatamente para fazer login no <code className="text-purple-300">/admin</code>.
            </p>

            {passwordSuccess && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="space-y-1 text-xs">
              <label className="text-slate-300 font-semibold block">Nova Senha</label>
              <input
                type="text"
                required
                placeholder="Ex: novaSenha123"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPasswordModalTenant(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                {passwordLoading ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
