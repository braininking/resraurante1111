import React, { useState } from 'react';
import { Store } from '../../types';
import { Lock, Mail, ArrowRight, ShieldCheck, Store as StoreIcon, AlertCircle } from 'lucide-react';

interface Props {
  stores: Store[];
  onLoginSuccess: (storeSlug: string, email: string) => void;
  onGoToCustomerMenu: () => void;
}

export const StoreLoginPage: React.FC<Props> = ({ stores, onLoginSuccess, onGoToCustomerMenu }) => {
  const [email, setEmail] = useState('loja@burgerco.com.br');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Informe seu e-mail e senha.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Find matching store based on email or pre-selected
      let matchedStore = stores.find((s) => email.toLowerCase().includes(s.slug.replace('-', '')) || email.toLowerCase().includes(s.slug));
      if (!matchedStore) {
        matchedStore = stores[0];
      }

      onLoginSuccess(matchedStore?.slug || 'burger-co', email.trim());
      setLoading(false);
    }, 400);
  };

  const handleSelectDemo = (slug: string, demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl mx-auto flex items-center justify-center font-black text-white text-xl shadow-md">
            CP
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal do Lojista</h1>
          <p className="text-xs text-slate-500">
            Acesse o sistema de gestão de pedidos, KDS, estoque e frente de caixa
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@restaurante.com.br"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Entrando...' : 'Entrar no Painel da Loja'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Fast Demo Accounts */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block text-center">
            Acesso Rápido para Teste (Selecione a Loja):
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectDemo(s.slug, `loja@${s.slug.replace('-', '')}.com.br`)}
                className={`p-2 rounded-xl border text-left text-xs flex items-center justify-between transition-colors ${
                  email.includes(s.slug.replace('-', ''))
                    ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <img src={s.logo} alt={s.name} className="w-6 h-6 rounded-md object-cover" />
                  <span>{s.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 capitalize">{s.segment}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Return to Customer Menu */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onGoToCustomerMenu}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Voltar ao Cardápio Digital Público</span>
          </button>
        </div>
      </div>
    </div>
  );
};
