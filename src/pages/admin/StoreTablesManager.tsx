import React, { useState, useEffect } from 'react';
import { Store, TableItem } from '../../types';
import { api } from '../../services/api';
import QRCode from 'qrcode';
import {
  UtensilsCrossed,
  Plus,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

interface Props {
  store: Store;
}

export const StoreTablesManager: React.FC<Props> = ({ store }) => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalTable, setQrModalTable] = useState<TableItem | null>(null);
  const [qrUrl, setQrUrl] = useState('');

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await api.getTables(store.id);
      setTables(res);
    } catch (err) {
      console.error('Error loading tables', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [store.id]);

  const handleUpdateStatus = async (tableId: string, status: TableItem['status']) => {
    try {
      await api.updateTable(tableId, { status });
      loadTables();
    } catch (err) {
      alert('Erro ao atualizar mesa');
    }
  };

  const handleOpenQR = (table: TableItem) => {
    const tableUrl = `${window.location.origin}/cardapio/${store.slug}?mesa=${table.number}`;
    QRCode.toDataURL(tableUrl, { width: 280, margin: 1 })
      .then((data) => {
        setQrUrl(data);
        setQrModalTable(table);
      })
      .catch((err) => console.error(err));
  };

  const statusColor: Record<TableItem['status'], { badge: string; border: string }> = {
    livre: { badge: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-300 bg-emerald-50/20' },
    ocupada: { badge: 'bg-blue-50 text-blue-700', border: 'border-blue-300 bg-blue-50/20' },
    aguardando_conta: { badge: 'bg-amber-50 text-amber-700', border: 'border-amber-300 bg-amber-50/20' },
    reservada: { badge: 'bg-purple-50 text-purple-700', border: 'border-purple-300 bg-purple-50/20' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-black text-slate-900">Mesas & Comandas do Salão</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mapa de ocupação, comanda digital por mesa e QR Codes para autoatendimento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTables}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {tables.map((t) => {
          const style = statusColor[t.status];
          return (
            <div
              key={t.id}
              className={`rounded-2xl border-2 p-4 flex flex-col justify-between space-y-3 transition-all bg-white shadow-xs ${style.border}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xl font-black text-slate-900">Mesa {t.number.toString().padStart(2, '0')}</span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{t.capacity} lugares</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenQR(t)}
                  title="Gerar QR Code da Mesa"
                  className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>

              {/* Status Selector Dropdown */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <select
                  value={t.status}
                  onChange={(e) => handleUpdateStatus(t.id, e.target.value as any)}
                  className={`w-full text-[11px] font-bold p-1.5 rounded-lg border focus:outline-none uppercase ${style.badge}`}
                >
                  <option value="livre">Livre</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="aguardando_conta">Pedindo Conta</option>
                  <option value="reservada">Reservada</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Modal for Table */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 space-y-4 text-center">
            <div className="flex justify-between items-center">
              <span className="font-black text-base text-slate-900">
                QR Code · Mesa {qrModalTable.number}
              </span>
              <button onClick={() => setQrModalTable(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Imprima este QR Code e coloque no display da mesa. O cliente escaneia com o celular e faz pedidos diretamente no salão!
            </p>

            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR Code Mesa"
                className="w-48 h-48 mx-auto rounded-2xl border-4 border-slate-100 shadow-sm"
              />
            )}

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Imprimir Display da Mesa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
