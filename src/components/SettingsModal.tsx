import React, { useState } from 'react';
import { X, Upload, Trash2, RotateCcw, Check } from 'lucide-react';
import { ShopSettings } from '../types';
import { DEFAULT_SHOP_SETTINGS } from '../lib/defaults';
import { compressImageFile } from '../lib/format';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSave: (next: ShopSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<ShopSettings>(settings);
  const [notesText, setNotesText] = useState<string>(settings.notes.join('\n'));
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 420, 0.85);
      setForm((prev) => ({ ...prev, qrisImageUrl: compressed, showQris: true }));
    } catch {
      alert('Gagal membaca gambar QRIS.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedNotes = notesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({ ...form, notes: cleanedNotes });
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 550);
  };

  const handleReset = () => {
    setForm(DEFAULT_SHOP_SETTINGS);
    setNotesText(DEFAULT_SHOP_SETTINGS.notes.join('\n'));
  };

  const inputCls =
    'w-full rounded-2xl border border-[#f4cfe0] bg-[#fffdfb] px-3.5 py-2.5 text-sm font-medium text-[#4d3085] focus:border-[#4d3085] focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4d3085]/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92dvh] bg-[#fff9f5] rounded-t-[28px] sm:rounded-[28px] border border-[#f6d2e3] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#fde7f1] border-b border-[#f6d2e3] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-[#4d3085]">Pengaturan Toko</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-[#4d3085] hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Bank Details */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#f370a8]">
              Rekening Pembayaran
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
                  No. Rekening
                </label>
                <input
                  type="text"
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
                Atas Nama (a/n)
              </label>
              <input
                type="text"
                value={form.bankAccountName}
                onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* QRIS Upload */}
          <div className="rounded-2xl bg-white border border-[#f6d2e3] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#4d3085]">QRIS Barcode (Opsional)</span>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4d3085]">
                <input
                  type="checkbox"
                  checked={form.showQris}
                  onChange={(e) => setForm({ ...form, showQris: e.target.checked })}
                  className="accent-[#4d3085] w-4 h-4"
                />
                Tampilkan
              </label>
            </div>
            <div className="flex items-center gap-3">
              {form.qrisImageUrl ? (
                <img
                  src={form.qrisImageUrl}
                  alt="QRIS"
                  className="w-16 h-16 rounded-xl border border-[#f6d2e3] object-contain bg-white p-1"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-[#f7a1c7] bg-[#fff8fb] flex items-center justify-center text-[10px] font-bold text-[#f370a8]">
                  No QRIS
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fde7f1] hover:bg-[#f8d0e2] text-[#4d3085] text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#f370a8]" />
                  Upload QRIS
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisUpload}
                    className="hidden"
                  />
                </label>
                {form.qrisImageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, qrisImageUrl: '' })}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
                Instagram
              </label>
              <input
                type="text"
                value={form.contactIg}
                onChange={(e) => setForm({ ...form, contactIg: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
                WhatsApp Admin
              </label>
              <input
                type="text"
                value={form.contactWa}
                onChange={(e) => setForm({ ...form, contactWa: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* DP Note & Terms */}
          <div>
            <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
              Keterangan Minimal DP
            </label>
            <input
              type="text"
              value={form.minDpNote}
              onChange={(e) => setForm({ ...form, minDpNote: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#4d3085]/75 mb-1">
              Catatan / Ketentuan (1 baris = 1 poin)
            </label>
            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>

          <div className="pt-2 pb-safe flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-[#f4cfe0] text-xs font-bold text-[#4d3085]/75"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-[#4d3085] text-white text-xs font-extrabold shadow-md active:scale-[0.99]"
            >
              {savedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Tersimpan!
                </>
              ) : (
                'Simpan Pengaturan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
