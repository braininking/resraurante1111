import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

interface Props {
  onLoginSuccess: (token: string) => void;
  onGoToCustomerMenu: () => void;
}

export const SuperAdminLoginPage: React.FC<Props> = ({ onLoginSuccess, onGoToCustomerMenu }) => {
  const [email, setEmail] = useState('admin@cardapiopro.com.br');
  const [password, setPassword] = useState('master2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email !== 'admin@cardapiopro.com.br' || password !== 'master2026') {
      setError('Credenciais inválidas para o painel Superadmin.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      onLoginSuccess('superadmin-token-valid');
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 text-white">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl mx-auto flex items-center justify-center font-black text-white text-xl shadow-lg shadow-purple-900/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Área Restrita do SaaS
          </span>
          <h1 className="text-xl font-black text-white tracking-tight">Superadmin Master</h1>
          <p className="text-xs text-slate-400">
            Acesso restrito exclusivamente ao operador e dono da plataforma
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">E-mail Administrativo</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cardapiopro.com.br"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Chave Mestra / Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Validando Acesso...' : 'Acessar Gestão Global SaaS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Return to Customer Menu */}
        <div className="text-center pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onGoToCustomerMenu}
            className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Cardápio do Cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
