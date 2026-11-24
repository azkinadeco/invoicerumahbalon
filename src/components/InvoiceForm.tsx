import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Minus,
  RefreshCw,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';
import { InvoiceDraft, InvoiceItem, PaymentStatus, ShopSettings } from '../types';
import { PRESET_PACKAGES } from '../lib/defaults';
import {
  computeTotals,
  formatRupiah,
  formatThousand,
  parseRupiahInput,
} from '../lib/format';

interface InvoiceFormProps {
  draft: InvoiceDraft;
  settings: ShopSettings;
  onChange: (updater: (prev: InvoiceDraft) => InvoiceDraft) => void;
  onRegenerateNumber: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  draft,
  settings,
  onChange,
  onRegenerateNumber,
}) => {
  const [presetCategory, setPresetCategory] = useState<'Paket' | 'Add-on' | 'Transport'>('Paket');
  const [showPresets, setShowPresets] = useState(true);
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [showDiscount, setShowDiscount] = useState(draft.discount > 0);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const totals = computeTotals(draft, settings.minDpPercent);
  const filteredPresets = PRESET_PACKAGES.filter((p) => p.category === presetCategory);

  const updateField = <K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) => {
    onChange((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateItem = (id: string, patch: Partial<InvoiceItem>) => {
    onChange((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const addEmptyItem = () => {
    onChange((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const addPresetItem = (presetId: string, description: string, unitPrice: number) => {
    onChange((prev) => {
      const hasOnlyOneBlank =
        prev.items.length === 1 &&
        prev.items[0].description.trim() === '' &&
        prev.items[0].unitPrice === 0;

      const newItem: InvoiceItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description,
        quantity: 1,
        unitPrice,
      };

      return {
        ...prev,
        items: hasOnlyOneBlank ? [newItem] : [...prev.items, newItem],
        updatedAt: new Date().toISOString(),
      };
    });

    setRecentlyAddedId(presetId);
    setTimeout(() => {
      setRecentlyAddedId((cur) => (cur === presetId ? null : cur));
    }, 850);
  };

  const removeItem = (id: string) => {
    onChange((prev) => {
      const next = prev.items.filter((it) => it.id !== id);
      return {
        ...prev,
        items:
          next.length > 0
            ? next
            : [{ id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleStatusChange = (status: PaymentStatus) => {
    onChange((prev) => {
      const curTotals = computeTotals(prev, settings.minDpPercent);
      let nextDp = prev.dpPaid;
      if (status === 'unpaid') nextDp = 0;
      if (status === 'paid') nextDp = curTotals.total;
      if (status === 'dp' && prev.dpPaid === 0 && curTotals.total > 0) {
        nextDp = curTotals.minDpAmount;
      }
      return {
        ...prev,
        status,
        dpPaid: nextDp,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const fieldCls =
    'w-full rounded-xl border border-[#f2d3e2] bg-[#fffdfb] px-3.5 py-2.5 text-sm font-medium text-[#4d3085] placeholder:text-[#4d3085]/35 focus:border-[#4d3085] focus:bg-white focus:outline-none transition';

  const labelCls = 'block text-[11px] font-bold text-[#4d3085]/65 mb-1';

  return (
    <div className="space-y-3.5">
      {/* ==================== 1. DATA PELANGGAN ==================== */}
      <section className="rb-card rounded-[22px] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-[#4d3085]">
            Pelanggan
          </h2>
          <button
            type="button"
            onClick={onRegenerateNumber}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fdf1f6] hover:bg-[#fde7f1] text-[#4d3085] text-[11px] font-bold tabular-nums transition active:scale-95"
            title="Ganti ke nomor urut berikutnya"
          >
            <RefreshCw className="w-3 h-3 text-[#f370a8]" />
            <span>#{draft.invoiceNumber}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nama</label>
            <input
              type="text"
              value={draft.clientName}
              onChange={(e) => updateField('clientName', e.target.value)}
              placeholder="Nama pelanggan"
              className={fieldCls}
            />
          </div>

          <div>
            <label className={labelCls}>WhatsApp</label>
            <input
              type="tel"
              inputMode="tel"
              value={draft.clientPhone}
              onChange={(e) => updateField('clientPhone', e.target.value)}
              placeholder="0812-xxxx-xxxx"
              className={fieldCls}
            />
          </div>

          <div>
            <label className={labelCls}>Tanggal Acara</label>
            <input
              type="date"
              value={draft.eventDate}
              onChange={(e) => updateField('eventDate', e.target.value)}
              className={fieldCls}
            />
          </div>

          <div>
            <label className={labelCls}>Lokasi</label>
            <input
              type="text"
              value={draft.venue}
              onChange={(e) => updateField('venue', e.target.value)}
              placeholder="Hotel / alamat"
              className={fieldCls}
            />
          </div>
        </div>

        {/* Minimal toggle for optional fields */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtraInfo((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#f370a8] hover:text-[#4d3085] transition"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showExtraInfo ? 'rotate-180' : ''
              }`}
            />
            <span>
              {showExtraInfo ? 'Tutup' : 'Jam, tema & tgl invoice'}
            </span>
          </button>

          {showExtraInfo && (
            <div className="mt-2.5 pt-3 border-t border-[#f7dbe8] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className={labelCls}>Jam</label>
                <input
                  type="time"
                  value={draft.eventTime}
                  onChange={(e) => updateField('eventTime', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tgl Invoice</label>
                <input
                  type="date"
                  value={draft.invoiceDate}
                  onChange={(e) => updateField('invoiceDate', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Tema</label>
                <input
                  type="text"
                  value={draft.themeNote}
                  onChange={(e) => updateField('themeNote', e.target.value)}
                  placeholder="Warna / tema"
                  className={fieldCls}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================== 2. ITEM PESANAN ==================== */}
      <section className="rb-card rounded-[22px] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-[#4d3085]">
            Pesanan
          </h2>
          <button
            type="button"
            onClick={() => setShowPresets((v) => !v)}
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#f370a8] hover:text-[#4d3085] transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{showPresets ? 'Tutup paket' : 'Paket'}</span>
          </button>
        </div>

        {/* Clean Quick-Add Strip */}
        {showPresets && (
          <div className="space-y-2 pb-1">
            <div className="flex items-center gap-1.5">
              {(['Paket', 'Add-on', 'Transport'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPresetCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                    presetCategory === cat
                      ? 'bg-[#4d3085] text-white'
                      : 'bg-[#fdf1f6] text-[#4d3085]/70 hover:bg-[#fde7f1]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {filteredPresets.map((preset) => {
                const justAdded = recentlyAddedId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      addPresetItem(preset.id, preset.description, preset.unitPrice)
                    }
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-bold transition active:scale-95 ${
                      justAdded
                        ? 'bg-[#4d3085] border-[#4d3085] text-white'
                        : 'bg-white hover:bg-[#fdf1f6] border-[#f2d3e2] text-[#4d3085]'
                    }`}
                  >
                    {justAdded ? (
                      <Check className="w-3.5 h-3.5 text-[#f9b4d3]" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-[#f370a8]" />
                    )}
                    <span className="whitespace-nowrap">{preset.label}</span>
                    <span
                      className={`text-[10.5px] font-semibold ${
                        justAdded ? 'text-[#f9b4d3]' : 'text-[#4d3085]/50'
                      }`}
                    >
                      {preset.unitPrice === 0 ? 'Free' : formatThousand(preset.unitPrice)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean Item Rows */}
        <div className="divide-y divide-[#f7dbe8] border-t border-[#f7dbe8]">
          {draft.items.map((item, idx) => (
            <div key={item.id} className="py-3 first:pt-3 last:pb-1 space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 text-[11px] font-extrabold text-[#f370a8] tabular-nums w-4 shrink-0">
                  {idx + 1}.
                </span>
                <textarea
                  rows={Math.min(5, Math.max(2, Math.ceil((item.description.length || 1) / 30)))}
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  placeholder="Nama item"
                  className={`${fieldCls} resize-none leading-snug py-2`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Hapus item"
                  className="mt-1.5 p-2 rounded-xl text-[#4d3085]/35 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="pl-6 flex items-center gap-2.5">
                {/* Compact Qty Stepper */}
                <div className="flex items-center rounded-xl border border-[#f2d3e2] bg-white h-[38px] w-[108px] shrink-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, { quantity: Math.max(1, (item.quantity || 1) - 1) })
                    }
                    className="w-9 h-full flex items-center justify-center text-[#4d3085] hover:bg-[#fdf1f6]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: Math.max(1, parseInt(e.target.value || '1', 10) || 1),
                      })
                    }
                    className="w-full text-center text-xs font-extrabold text-[#4d3085] focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, { quantity: (item.quantity || 1) + 1 })
                    }
                    className="w-9 h-full flex items-center justify-center text-[#4d3085] hover:bg-[#fdf1f6]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Price Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4d3085]/40">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatThousand(item.unitPrice)}
                    onChange={(e) =>
                      updateItem(item.id, { unitPrice: parseRupiahInput(e.target.value) })
                    }
                    placeholder="Harga"
                    className={`${fieldCls} h-[38px] py-0 pl-9 text-right font-bold tabular-nums`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addEmptyItem}
          className="w-full py-2.5 rounded-xl border border-dashed border-[#f7a1c7] bg-[#fff9f5] hover:bg-[#fdf1f6] text-[#4d3085] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5 text-[#f370a8]" />
          Tambah Item
        </button>
      </section>

      {/* ==================== 3. PEMBAYARAN ==================== */}
      <section className="rb-card rounded-[22px] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-[#4d3085]">
            Pembayaran
          </h2>
          {!showDiscount && (
            <button
              type="button"
              onClick={() => setShowDiscount(true)}
              className="text-[11.5px] font-bold text-[#f370a8] hover:text-[#4d3085] transition"
            >
              + Diskon
            </button>
          )}
        </div>

        {/* Status Segmented Control */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#fdf1f6] border border-[#f2d3e2]">
          {(
            [
              { id: 'unpaid', label: 'Belum Bayar' },
              { id: 'dp', label: 'Sudah DP' },
              { id: 'paid', label: 'Lunas' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleStatusChange(opt.id)}
              className={`py-2 rounded-lg text-xs font-extrabold transition ${
                draft.status === opt.id
                  ? 'bg-[#4d3085] text-white shadow-xs'
                  : 'text-[#4d3085]/65 hover:text-[#4d3085]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* DP Input (only when DP selected) */}
        {draft.status === 'dp' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[#4d3085]/65">DP masuk</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateField('dpPaid', Math.round(totals.total * 0.3))}
                  className="px-2 py-0.5 rounded-md bg-[#fdf1f6] hover:bg-[#fde7f1] text-[10px] font-extrabold text-[#4d3085]"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => updateField('dpPaid', Math.round(totals.total * 0.5))}
                  className="px-2 py-0.5 rounded-md bg-[#fdf1f6] hover:bg-[#fde7f1] text-[10px] font-extrabold text-[#4d3085]"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => updateField('dpPaid', 500000)}
                  className="px-2 py-0.5 rounded-md bg-[#fdf1f6] hover:bg-[#fde7f1] text-[10px] font-extrabold text-[#4d3085]"
                >
                  500rb
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4d3085]/40">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousand(draft.dpPaid)}
                onChange={(e) => updateField('dpPaid', parseRupiahInput(e.target.value))}
                placeholder="0"
                className={`${fieldCls} pl-10 text-right font-bold tabular-nums`}
              />
            </div>
          </div>
        )}

        {/* Optional Discount Input */}
        {showDiscount && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[#4d3085]/65">Diskon</label>
              <button
                type="button"
                onClick={() => {
                  updateField('discount', 0);
                  setShowDiscount(false);
                }}
                className="text-[10.5px] font-bold text-[#4d3085]/45 hover:text-rose-600"
              >
                Hapus
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4d3085]/40">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousand(draft.discount)}
                onChange={(e) => updateField('discount', parseRupiahInput(e.target.value))}
                placeholder="0"
                className={`${fieldCls} pl-10 text-right font-bold tabular-nums`}
              />
            </div>
          </div>
        )}

        {/* Breakdown: total tagihan -> DP -> sisa */}
        {totals.total > 0 && (
          <div className="rounded-xl border border-[#f2d3e2] bg-white px-4 py-3 space-y-2 text-[13px]">
            {totals.discount > 0 && (
              <>
                <div className="flex items-center justify-between text-[#4d3085]/70">
                  <span>Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Diskon</span>
                  <span className="font-semibold tabular-nums">- {formatRupiah(totals.discount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-[#4d3085]">
              <span className="font-semibold">Total Tagihan</span>
              <span className="font-bold tabular-nums">{formatRupiah(totals.total)}</span>
            </div>
            {totals.effectivePaid > 0 && (
              <div className="flex items-center justify-between text-[#f370a8]">
                <span className="font-semibold">{totals.isPaid ? 'Dibayar' : 'DP'}</span>
                <span className="font-bold tabular-nums">- {formatRupiah(totals.effectivePaid)}</span>
              </div>
            )}
          </div>
        )}

        {/* Clean Total Summary Bar */}
        <div className="rounded-xl bg-[#4d3085] text-white px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f9b4d3]">
              {totals.isPaid
                ? 'Status'
                : totals.hasDp
                ? 'Sisa'
                : 'Total'}
            </div>
          </div>
          <div className="text-lg font-extrabold tabular-nums">
            {totals.isPaid
              ? 'LUNAS'
              : totals.hasDp
              ? formatRupiah(totals.remaining)
              : formatRupiah(totals.total)}
          </div>
        </div>
      </section>
    </div>
  );
};
