import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Key,
  User,
  MapPin,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
  Save,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  Smartphone,
  Mail,
  FileText,
  Building,
  HelpCircle
} from 'lucide-react';
import { Store } from '../types';
import { api } from '../services/api';
import { generatePixPayloadClient, validatePixKey } from '../utils/pix';
import { formatCurrency } from '../utils/formatters';

interface PixStoreKeyFormProps {
  store: Store;
  onSaveSuccess?: (updatedStore: Store) => void;
}

export const PixStoreKeyForm: React.FC<PixStoreKeyFormProps> = ({ store, onSaveSuccess }) => {
  // Form states initialized with store data
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>(
    store.pixConfig?.keyType || 'email'
  );
  const [pixKey, setPixKey] = useState(store.pixConfig?.key || '');
  const [beneficiaryName, setBeneficiaryName] = useState(store.pixConfig?.beneficiaryName || store.name || '');
  const [pixCity, setPixCity] = useState(store.pixConfig?.city || 'SAO PAULO');

  // Action states
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Live QR Code Generator & Platform API Test States
  const [testAmount, setTestAmount] = useState('35.00');
  const [liveQrCodeUrl, setLiveQrCodeUrl] = useState('');
  const [livePixPayload, setLivePixPayload] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestSuccess, setApiTestSuccess] = useState(false);

  // Sync state if store updates from parent
  useEffect(() => {
    if (store.pixConfig) {
      setPixKeyType(store.pixConfig.keyType || 'email');
      setPixKey(store.pixConfig.key || '');
      setBeneficiaryName(store.pixConfig.beneficiaryName || store.name || '');
      setPixCity(store.pixConfig.city || 'SAO PAULO');
    }
  }, [store]);

  // Validation
  const validation = validatePixKey(pixKey, pixKeyType);
  const isConfigured = Boolean(pixKey.trim() && beneficiaryName.trim() && validation.valid);

  // Auto-generate dynamic QR Code and payload whenever fields or test amount change
  useEffect(() => {
    const rawAmount = parseFloat(testAmount) || 0;
    const cleanKey = pixKey.trim();
    const cleanName = beneficiaryName.trim() || store.name;
    const cleanCity = pixCity.trim() || 'SAO PAULO';

    if (!cleanKey) {
      setLivePixPayload('');
      setLiveQrCodeUrl('');
      return;
    }

    const payload = generatePixPayloadClient({
      key: cleanKey,
      beneficiaryName: cleanName,
      city: cleanCity,
      amount: rawAmount > 0 ? rawAmount : undefined,
      txId: 'PEDIDOPRO' + Math.floor(Math.random() * 899 + 100),
    });

    setLivePixPayload(payload);

    if (payload) {
      QRCode.toDataURL(payload, {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setLiveQrCodeUrl(url))
        .catch((err) => console.error('Erro ao renderizar QR Code Pix:', err));
    } else {
      setLiveQrCodeUrl('');
    }
  }, [pixKey, pixKeyType, beneficiaryName, pixCity, testAmount, store.name]);

  // Save Pix Configuration
  const handleSavePix = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!pixKey.trim()) {
      setErrorMessage('Por favor, informe a Chave Pix da loja.');
      return;
    }

    if (!beneficiaryName.trim()) {
      setErrorMessage('Por favor, informe o Nome do Titular da conta bancária.');
      return;
    }

    if (!validation.valid) {
      setErrorMessage(validation.message || 'Formato de Chave Pix inválido.');
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateStore(store.id, {
        pixConfig: {
          key: pixKey.trim(),
          keyType: pixKeyType,
          beneficiaryName: beneficiaryName.trim(),
          city: (pixCity.trim() || 'SAO PAULO').toUpperCase().substring(0, 15),
        },
      });

      setSavedSuccess(true);
      if (onSaveSuccess) onSaveSuccess(updated);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar chave Pix.');
    } finally {
      setSaving(false);
    }
  };

  // Test dynamic generation using Platform Server API
  const handleTestViaPlatformApi = async () => {
    if (!pixKey.trim()) {
      setErrorMessage('Informe a Chave Pix antes de testar a API.');
      return;
    }
    try {
      setTestingApi(true);
      setErrorMessage('');
      const res = await api.generateDynamicPixQrCode({
        storeId: store.id,
        key: pixKey.trim(),
        beneficiaryName: beneficiaryName.trim() || store.name,
        city: pixCity.trim() || 'SAO PAULO',
        amount: parseFloat(testAmount) || 25,
        txId: `API${Date.now().toString().slice(-6)}`,
      });

      if (res.qrCodeDataUrl) {
        setLiveQrCodeUrl(res.qrCodeDataUrl);
      }
      if (res.pixPayload) {
        setLivePixPayload(res.pixPayload);
      }
      setApiTestSuccess(true);
      setTimeout(() => setApiTestSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao gerar QR Code via API da plataforma.');
    } finally {
      setTestingApi(false);
    }
  };

  const handleCopyPayload = () => {
    if (!livePixPayload) return;
    navigator.clipboard.writeText(livePixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPixKey(text.trim());
      }
    } catch {
      // In case clipboard read is restricted by browser permissions
    }
  };

  const keyTypeOptions = [
    { id: 'email', label: 'E-mail', icon: Mail, example: 'loja@exemplo.com.br' },
    { id: 'phone', label: 'Celular', icon: Smartphone, example: '11999998888 (com DDD)' },
    { id: 'cpf', label: 'CPF', icon: FileText, example: '000.000.000-00' },
    { id: 'cnpj', label: 'CNPJ', icon: Building, example: '00.000.000/0001-00' },
    { id: 'random', label: 'Chave Aleatória (EVP)', icon: Key, example: '123e4567-e89b-12d3-a456-426614174000' },
  ];

  const currentOption = keyTypeOptions.find((o) => o.id === pixKeyType);

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-600/30 shadow-xs overflow-hidden transition-all">
      {/* Top Banner & Header */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-700 p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Chave Pix da Loja & Geração Automática de QR Code
                </h3>
                <span className="hidden sm:inline-flex text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  API Oficial BACEN
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Cadastre sua chave Pix e titular para que o sistema gere automaticamente QR Codes Pix dinâmicos com o valor exato no checkout do cardápio digital.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400 text-emerald-950 font-bold text-xs shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                QR Code Ativo nos Pedidos
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-xs">
                <AlertCircle className="w-4 h-4 text-amber-900" />
                Pendente de Cadastro
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Success & Error alerts */}
      {savedSuccess && (
        <div className="m-5 mb-0 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-emerald-900">Chave Pix salva e ativada com sucesso!</h4>
            <p className="text-[11px] text-emerald-700">
              Todos os novos pedidos realizados no cardápio digital via Pix já receberão o QR Code dinâmico nominal a <strong>{beneficiaryName}</strong>.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="m-5 mb-0 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Form Inputs + Live Preview Simulator */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Inputs */}
        <form onSubmit={handleSavePix} className="lg:col-span-7 space-y-4">
          {/* Key Type Selector Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Chave Pix
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {keyTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = pixKeyType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPixKeyType(opt.id as any)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      active
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pix Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                Chave Pix (Copia e Cola)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPixKeyType('random');
                    setPixKey('8e7fc37c-634d-4408-9e81-3fbea689d8b2');
                    setBeneficiaryName('Itaú Unibanco / CardapioPro');
                    setPixCity('SAO PAULO');
                  }}
                  className="text-[11px] bg-orange-50 text-orange-800 hover:bg-orange-100 font-bold px-2 py-0.5 rounded-lg border border-orange-200 flex items-center gap-1 transition-colors"
                  title="Configurar chave Pix Itaú oficial"
                >
                  <Sparkles className="w-3 h-3 text-orange-600" />
                  Preencher Chave Itaú Oficial
                </button>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors"
                  title="Colar da área de transferência"
                >
                  <Copy className="w-3 h-3" />
                  Colar
                </button>
              </div>
            </div>
            {/* Callout com o requisito do usuário */}
            <div className="mb-2 p-2.5 rounded-xl bg-orange-50/80 border border-orange-200 text-[11px] text-orange-950 flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-1" />
              <span>
                <strong>Instrução Oficial:</strong> "Você pode transferir de qualquer banco para minha chave Pix Itaú: <strong>8e7fc37c-634d-4408-9e81-3fbea689d8b2</strong>"
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder={`Exemplo: ${currentOption?.example || 'Digite ou cole sua chave'}`}
                className={`w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all pr-10 ${
                  pixKey.trim()
                    ? validation.valid
                      ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                      : 'border-amber-400 ring-2 ring-amber-400/10'
                    : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              <div className="absolute right-3 top-2.5">
                {pixKey.trim() && (
                  validation.valid ? (
                    <span title="Chave com formato válido!">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </span>
                  ) : (
                    <span title={validation.message || 'Formato de chave não reconhecido'}>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </span>
                  )
                )}
              </div>
            </div>
            {pixKey.trim() && !validation.valid && (
              <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {validation.message}
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              Esta é a chave Pix que receberá os pagamentos gerados dinamicamente em cada pedido finalizado no cardápio.
            </p>
          </div>

          {/* Beneficiary Name Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Nome do Titular da Conta (Pessoa Física ou Razão Social)
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {beneficiaryName.length}/25 caracteres
              </span>
            </div>
            <input
              type="text"
              maxLength={25}
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              placeholder="Ex: JOAO DA SILVA ou HAMBURGUERIA LTDA"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-emerald-500 transition-all font-medium uppercase"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Obrigatório pelo Banco Central. Aparece no aplicativo do banco do cliente confirmando para quem ele está pagando.
            </p>
          </div>

          {/* City Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Cidade da Conta Bancária
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {pixCity.length}/15 caracteres
              </span>
            </div>
            <input
              type="text"
              maxLength={15}
              value={pixCity}
              onChange={(e) => setPixCity(e.target.value.toUpperCase())}
              placeholder="Ex: SAO PAULO"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-emerald-500 transition-all uppercase"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Salvando Configurações...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Chave Pix & Titular
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestViaPlatformApi}
              disabled={testingApi || !pixKey.trim()}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Valida a geração do QR Code nos servidores da plataforma"
            >
              {testingApi ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Chamando API...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Testar via API da Plataforma
                </>
              )}
            </button>
          </div>

          {apiTestSuccess && (
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              API da plataforma gerou com sucesso o QR Code dinâmico e o código Copia e Cola!
            </p>
          )}
        </form>

        {/* Right Column: Dynamic Live Preview Simulator */}
        <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  Simulador de QR Code Dinâmico
                </h4>
              </div>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Pré-visualização
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Veja exatamente como o seu cliente verá o QR Code Pix no checkout ao finalizar um pedido no cardápio digital:
            </p>

            {/* Test Amount Selector */}
            <div className="mt-3">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Valor do Pedido Simulado:
              </span>
              <div className="flex gap-1.5">
                {['15.00', '35.00', '75.00', '120.00'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTestAmount(amt)}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      testAmount === amt
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    R$ {parseFloat(amt).toFixed(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rendered Dynamic QR Code */}
            <div className="mt-4 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              {liveQrCodeUrl ? (
                <div className="space-y-2 text-center">
                  <img
                    src={liveQrCodeUrl}
                    alt="Preview QR Code Pix Dinâmico"
                    className="w-40 h-40 mx-auto rounded-lg border border-slate-100 shadow-xs"
                  />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Recebedor (Titular)
                    </span>
                    <span className="text-xs font-black text-slate-900 block truncate max-w-[220px] mx-auto">
                      {beneficiaryName.trim().toUpperCase() || store.name.toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-emerald-600 block">
                      {formatCurrency(parseFloat(testAmount) || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-40 h-40 flex flex-col items-center justify-center text-center p-3 text-slate-400 space-y-2">
                  <QrCode className="w-10 h-10 stroke-1" />
                  <p className="text-[11px] leading-tight">
                    Preencha a chave Pix e o nome do titular para gerar o QR Code dinâmico.
                  </p>
                </div>
              )}
            </div>

            {/* Copia e Cola Preview & Copy Button */}
            {livePixPayload && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span>Código Pix Copia e Cola (EMV):</span>
                  {copiedPayload && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Copiado!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={livePixPayload}
                    className="flex-1 text-[10px] font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
                    title="Copiar código Pix"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Integration Info Callout */}
          <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex items-start gap-2 text-[11px] text-emerald-800">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Como funciona no checkout:</strong> O cliente escolhe Pix no cardápio, a API da plataforma calcula o valor total (itens + frete - cupons) e gera na hora o QR Code dinâmico oficial com sua chave e titular.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
