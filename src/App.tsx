import { useEffect, useMemo, useState } from 'react';
import {
  FilePlus2,
  History,
  Settings,
  Share2,
  Download,
  FileText,
  MessageCircle,
  Printer,
  Copy,
  Check,
  Loader2,
  Eye,
  PenLine,
  ZoomIn,
  ZoomOut,
  Smartphone,
  X,
} from 'lucide-react';
import { InvoiceDraft, ShopSettings } from './types';
import {
  DEFAULT_SHOP_SETTINGS,
  createNewDraft,
  createSampleDraft,
} from './lib/defaults';
import {
  buildWhatsAppInvoiceMessage,
  computeTotals,
  formatRupiah,
  formatWhatsAppPhone,
} from './lib/format';
import {
  copyInvoicePngToClipboard,
  downloadInvoicePdf,
  downloadInvoicePng,
  printInvoiceA5,
  shareInvoiceNative,
} from './lib/exportInvoice';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePaper } from './components/InvoicePaper';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';

const SETTINGS_KEY = 'rumahbalon-inv-settings-v1';
const DRAFT_KEY = 'rumahbalon-inv-current-draft-v1';
const HISTORY_KEY = 'rumahbalon-inv-history-v1';
const COUNTER_KEY = 'rumahbalon-inv-counter-v1';
const INSTALL_TIP_KEY = 'rumahbalon-inv-hide-install-tip-v1';

function readCounter(): number {
  try {
    const n = parseInt(localStorage.getItem(COUNTER_KEY) || '1', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}

function formatInvoiceNumber(seq: number): string {
  return String(seq).padStart(6, '0');
}

function loadSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SHOP_SETTINGS;
    return { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SHOP_SETTINGS;
  }
}

function loadHistory(): InvoiceDraft[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadInitialDraft(): InvoiceDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InvoiceDraft;
      if (parsed && Array.isArray(parsed.items)) return parsed;
    }
  } catch {
    // fallback
  }
  return createSampleDraft(formatInvoiceNumber(readCounter()));
}

function shouldShowIosInstallHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(INSTALL_TIP_KEY) === '1') return false;
  } catch {
    // ignore
  }
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
}

export default function App() {
  const [settings, setSettings] = useState<ShopSettings>(loadSettings);
  const [draft, setDraft] = useState<InvoiceDraft>(loadInitialDraft);
  const [history, setHistory] = useState<InvoiceDraft[]>(loadHistory);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState<boolean>(shouldShowIosInstallHint);
  const [zoomOffset, setZoomOffset] = useState<number>(0);
  const [busyAction, setBusyAction] = useState<
    null | 'share' | 'png' | 'pdf' | 'copy' | 'wa'
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore quota errors
    }
  }, [draft]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2800);
  };

  const totals = useMemo(
    () => computeTotals(draft, settings.minDpPercent),
    [draft, settings.minDpPercent]
  );

  // Responsive A5 preview scale so it fits iPhone & desktop cleanly
  const basePreviewScale = useMemo(() => {
    if (viewportWidth >= 1280) return 0.94;
    if (viewportWidth >= 1024) return 0.8;
    const available = Math.max(280, viewportWidth - 54);
    return Math.min(0.95, Number((available / 560).toFixed(3)));
  }, [viewportWidth]);

  const previewScale = useMemo(
    () => Math.min(1.12, Math.max(0.45, Number((basePreviewScale + zoomOffset).toFixed(3)))),
    [basePreviewScale, zoomOffset]
  );

  const dismissInstallHint = () => {
    setShowInstallHint(false);
    try {
      localStorage.setItem(INSTALL_TIP_KEY, '1');
    } catch {
      // ignore
    }
  };

  const saveToHistory = (inv: InvoiceDraft) => {
    if (!inv.clientName.trim() && totals.total === 0) return;
    setHistory((prev) => {
      const next = [inv, ...prev.filter((x) => x.id !== inv.id)].slice(0, 30);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const bumpInvoiceNumber = (): string => {
    const nextNum = readCounter() + 1;
    try {
      localStorage.setItem(COUNTER_KEY, String(nextNum));
    } catch {
      // ignore
    }
    return formatInvoiceNumber(nextNum);
  };

  const handleNewInvoice = () => {
    saveToHistory(draft);
    const nextNumber = bumpInvoiceNumber();
    setDraft(createNewDraft(nextNumber));
    setMobileTab('form');
    showToast(`Invoice baru #${nextNumber} siap diisi`);
  };

  const handleRegenerateNumber = () => {
    const nextNumber = bumpInvoiceNumber();
    setDraft((prev) => ({ ...prev, invoiceNumber: nextNumber }));
    showToast(`Nomor diubah ke #${nextNumber}`);
  };

  const handleSaveSettings = (next: ShopSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast('Pengaturan toko tersimpan');
  };

  const handleShareNative = async () => {
    setBusyAction('share');
    saveToHistory(draft);
    try {
      const msg = buildWhatsAppInvoiceMessage(draft, settings);
      const res = await shareInvoiceNative(draft, msg);
      if (res === 'shared') {
        showToast('Invoice berhasil dibagikan!');
      } else if (res === 'unsupported') {
        const ok = await downloadInvoicePng(draft);
        showToast(ok ? 'Gambar PNG berhasil diunduh' : 'Gagal export gambar');
      } else if (res === 'error') {
        showToast('Gagal membuat gambar invoice');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPng = async () => {
    setBusyAction('png');
    saveToHistory(draft);
    try {
      const ok = await downloadInvoicePng(draft);
      showToast(ok ? 'Gambar PNG tersimpan!' : 'Gagal menyimpan PNG');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPdf = async () => {
    setBusyAction('pdf');
    saveToHistory(draft);
    try {
      const ok = await downloadInvoicePdf(draft);
      showToast(ok ? 'PDF A5 berhasil diunduh!' : 'Gagal membuat PDF');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyImage = async () => {
    setBusyAction('copy');
    saveToHistory(draft);
    try {
      const ok = await copyInvoicePngToClipboard();
      if (ok) {
        showToast('Gambar disalin! Langsung Paste di WhatsApp');
      } else {
        await downloadInvoicePng(draft);
        showToast('PNG diunduh');
      }
    } catch {
      await downloadInvoicePng(draft);
      showToast('PNG diunduh');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendWhatsApp = async () => {
    setBusyAction('wa');
    saveToHistory(draft);
    try {
      const message = buildWhatsAppInvoiceMessage(draft, settings);
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        // ignore
      }
      const phone = formatWhatsAppPhone(draft.clientPhone);
      const waUrl = phone
        ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      showToast('Membuka WhatsApp...');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicateFromHistory = (item: InvoiceDraft) => {
    const nextNumber = bumpInvoiceNumber();
    setDraft({
      ...item,
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNumber,
      status: 'unpaid',
      dpPaid: 0,
      updatedAt: new Date().toISOString(),
    });
    setMobileTab('form');
    showToast(`Diduplikat menjadi #${nextNumber}`);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] text-[#4d3085] flex flex-col">
      {/* ==================== TOP STICKY HEADER ==================== */}
      <header className="sticky top-0 z-40 glass-bar border-b border-[#f3cde0]/90 pt-safe no-print">
        <div className="mx-auto max-w-[1260px] px-4 sm:px-6 pb-2.5 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-[13px] bg-[#fde7f1] border border-[#f9b4d3]/80 overflow-hidden shrink-0 shadow-2xs">
              <img
                src="/logo.png"
                alt="Rumah Balon"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-[15px] font-extrabold tracking-tight text-[#4d3085] truncate leading-tight">
                Rumah Balon
              </span>
              <span className="block text-[11px] font-medium text-[#4d3085]/55 truncate">
                Invoice
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleNewInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4d3085] hover:bg-[#3d2470] text-white text-xs font-extrabold shadow-xs transition active:scale-95"
              title="Buat invoice baru"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#f9b4d3]" />
              <span>Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#fdf1f6] border border-[#f3cde0] text-[#4d3085] text-xs font-bold transition active:scale-95"
              title="Riwayat invoice"
            >
              <History className="w-3.5 h-3.5 text-[#4d3085]" />
              <span className="hidden sm:inline">Riwayat</span>
              {history.length > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#f370a8] text-white text-[9px] font-extrabold flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#fdf1f6] border border-[#f3cde0] text-[#4d3085] text-xs font-bold transition active:scale-95"
              title="Pengaturan rekening & QRIS"
            >
              <Settings className="w-3.5 h-3.5 text-[#4d3085]" />
              <span className="hidden sm:inline">Toko</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dismissible iPhone Home Screen Tip */}
      {showInstallHint && (
        <div className="mx-auto w-full max-w-[1260px] px-4 sm:px-6 pt-3 no-print">
          <div className="rounded-2xl bg-[#4d3085] text-white px-3.5 py-2.5 flex items-center justify-between gap-2.5 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#fde7f1] text-[#4d3085] flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <p className="text-[11px] leading-snug text-white/90">
                <strong>Bagikan</strong> → <strong className="text-[#f9b4d3]">Tambah ke Layar Utama</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={dismissInstallHint}
              aria-label="Tutup panduan"
              className="p-1.5 rounded-lg text-white/60 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 z-50 px-4 py-2 rounded-full bg-[#4d3085] text-white text-xs font-bold shadow-xl flex items-center gap-2 whitespace-nowrap animate-toast no-print">
          <Check className="w-3.5 h-3.5 text-[#f9b4d3]" />
          <span>{toast}</span>
        </div>
      )}

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 mx-auto w-full max-w-[1260px] px-4 sm:px-6 pt-4 sm:pt-5 pb-28 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          {/* LEFT: INPUT FORM */}
          <div
            className={`lg:col-span-6 xl:col-span-5 ${
              mobileTab === 'form' ? 'block' : 'hidden lg:block'
            } no-print`}
          >
            <InvoiceForm
              draft={draft}
              settings={settings}
              onChange={setDraft}
              onRegenerateNumber={handleRegenerateNumber}
            />
          </div>

          {/* RIGHT: LIVE PREVIEW & EXPORT */}
          <div
            className={`lg:col-span-6 xl:col-span-7 lg:sticky lg:top-[72px] space-y-3 ${
              mobileTab === 'preview' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Unified Export Toolbar */}
            <div className="rb-card rounded-[22px] p-3 space-y-2 no-print">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareNative}
                  disabled={busyAction !== null}
                  className="py-2.5 px-3 rounded-xl bg-[#4d3085] hover:bg-[#3d2470] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                >
                  {busyAction === 'share' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4 text-[#f9b4d3]" />
                  )}
                  <span>Bagikan</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={busyAction !== null}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                >
                  {busyAction === 'wa' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  <span>Teks WA</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={busyAction !== null}
                  className="py-2 px-2 rounded-xl bg-[#fff9f5] hover:bg-[#fde7f1] border border-[#f3cde0] text-[#4d3085] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {busyAction === 'png' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-[#f370a8]" />
                  )}
                  <span>PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={busyAction !== null}
                  className="py-2 px-2 rounded-xl bg-[#fff9f5] hover:bg-[#fde7f1] border border-[#f3cde0] text-[#4d3085] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {busyAction === 'pdf' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#f370a8]" />
                  )}
                  <span>PDF A5</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={busyAction !== null}
                  className="py-2 px-2 rounded-xl bg-[#fff9f5] hover:bg-[#fde7f1] border border-[#f3cde0] text-[#4d3085] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {busyAction === 'copy' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#f370a8]" />
                  )}
                  <span>Salin</span>
                </button>

                <button
                  type="button"
                  onClick={() => printInvoiceA5(draft)}
                  className="py-2 px-2 rounded-xl bg-[#fff9f5] hover:bg-[#fde7f1] border border-[#f3cde0] text-[#4d3085] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-[#f370a8]" />
                  <span>Cetak</span>
                </button>
              </div>
            </div>

            {/* Paper Stage */}
            <div className="rb-stage rounded-[24px] p-2.5 sm:p-5 flex flex-col items-center overflow-hidden">
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-[#4d3085]/65 mb-3 px-1 no-print">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f370a8]" />
                  <span className="text-[#4d3085] tabular-nums">#{draft.invoiceNumber}</span>
                </div>

                {/* Desktop Zoom Controls */}
                <div className="hidden sm:flex items-center gap-1 bg-white/85 rounded-full p-0.5 border border-[#f3cde0]">
                  <button
                    type="button"
                    onClick={() =>
                      setZoomOffset((z) => Math.max(-0.24, Number((z - 0.08).toFixed(2))))
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#fde7f1] text-[#4d3085]"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomOffset(0)}
                    className="px-1.5 text-[10px] font-extrabold text-[#4d3085] tabular-nums"
                    title="Reset zoom"
                  >
                    {Math.round(previewScale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomOffset((z) => Math.min(0.16, Number((z + 0.08).toFixed(2))))
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#fde7f1] text-[#4d3085]"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <InvoicePaper
                draft={draft}
                settings={settings}
                scale={previewScale}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ==================== iPHONE FLOATING BOTTOM DOCK ==================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pt-2 pb-safe glass-bar border-t border-[#f3cde0] no-print">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <div className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#fde7f1] border border-[#f3cde0]">
            <button
              type="button"
              onClick={() => setMobileTab('form')}
              className={`py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition ${
                mobileTab === 'form'
                  ? 'bg-[#4d3085] text-white shadow-sm'
                  : 'text-[#4d3085]/70'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Isi Data</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition ${
                mobileTab === 'preview'
                  ? 'bg-[#4d3085] text-white shadow-sm'
                  : 'text-[#4d3085]/70'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {mobileTab === 'form' ? (
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="px-3.5 py-2.5 rounded-2xl bg-[#4d3085] text-white text-right shrink-0 shadow-md active:scale-95 transition"
            >
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#f9b4d3] leading-none">
                {totals.isPaid ? 'Status' : totals.hasDp ? 'Sisa' : 'Total'}
              </div>
              <div className="text-xs font-extrabold tabular-nums mt-0.5 leading-none">
                {totals.isPaid
                  ? 'LUNAS'
                  : formatRupiah(totals.hasDp ? totals.remaining : totals.total)}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleShareNative}
              disabled={busyAction !== null}
              className="px-4 py-3 rounded-2xl bg-[#f370a8] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 transition"
            >
              {busyAction === 'share' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>Kirim</span>
            </button>
          )}
        </div>
      </nav>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        settings={settings}
        onSelect={(item) => {
          setDraft(item);
          setMobileTab('form');
          showToast(`Membuka #${item.invoiceNumber}`);
        }}
        onDuplicate={handleDuplicateFromHistory}
        onDelete={handleDeleteHistory}
      />
    </div>
  );
}
