import React from 'react';
import { X, Trash2, FileText, Copy } from 'lucide-react';
import { InvoiceDraft, ShopSettings } from '../types';
import { computeTotals, formatDateIndo, formatRupiah } from '../lib/format';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: InvoiceDraft[];
  settings: ShopSettings;
  onSelect: (draft: InvoiceDraft) => void;
  onDuplicate: (draft: InvoiceDraft) => void;
  onDelete: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  settings,
  onSelect,
  onDuplicate,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4d3085]/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[88dvh] bg-[#fff9f5] rounded-t-[28px] sm:rounded-[28px] border border-[#f6d2e3] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-[#fde7f1] border-b border-[#f6d2e3] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-[#4d3085]">Riwayat</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-[#4d3085]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-2.5">
          {history.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#fde7f1] flex items-center justify-center text-[#f370a8]">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#4d3085]">Belum ada riwayat</p>
            </div>
          ) : (
            history.map((item) => {
              const totals = computeTotals(item, settings.minDpPercent);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white border border-[#f6d2e3] p-3.5 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#fde7f1] text-[#4d3085]">
                        #{item.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          totals.isPaid
                            ? 'bg-emerald-100 text-emerald-700'
                            : totals.hasDp
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {totals.isPaid ? 'Lunas' : totals.hasDp ? 'DP' : 'Belum Bayar'}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-[#4d3085] truncate mt-1">
                      {item.clientName || 'Tanpa Nama'}
                    </div>
                    <div className="text-[11px] text-[#4d3085]/60">
                      Acara: {formatDateIndo(item.eventDate)} •{' '}
                      <strong className="text-[#4d3085]">{formatRupiah(totals.total)}</strong>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicate(item);
                        onClose();
                      }}
                      title="Duplikat jadi invoice baru"
                      className="p-2 rounded-xl bg-[#fff8fb] hover:bg-[#fde7f1] text-[#4d3085]"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      title="Hapus dari riwayat"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
