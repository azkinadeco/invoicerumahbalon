import { InvoiceDraft, ShopSettings } from '../types';

export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatThousand(value: number | string): string {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'number' ? value : parseRupiahInput(String(value));
  if (!Number.isFinite(num) || num === 0) return '';
  return Math.round(num).toLocaleString('id-ID');
}

export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  const clean = String(value).replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function todayLocalISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const clean = String(dateStr).split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/** Long Indonesian date ("21 Oktober 2026"), as used on the printed invoice. */
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].trim().split('-');
  if (parts.length === 3) {
    const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  return dateStr;
}

export function formatWhatsAppPhone(rawPhone: string | undefined | null): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function computeTotals(draft: InvoiceDraft, minDpPercent = 30) {
  const subtotal = draft.items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity || 1) * Math.max(0, item.unitPrice || 0),
    0
  );
  const discount = Math.min(subtotal, Math.max(0, draft.discount || 0));
  const total = Math.max(0, subtotal - discount);
  const effectivePaid =
    draft.status === 'paid'
      ? total
      : draft.status === 'unpaid'
      ? 0
      : Math.min(total, Math.max(0, draft.dpPaid || 0));
  const remaining = Math.max(0, total - effectivePaid);
  const minDpAmount = Math.round(total * (minDpPercent / 100));

  return {
    subtotal,
    discount,
    total,
    effectivePaid,
    remaining,
    minDpAmount,
    isPaid: draft.status === 'paid' || (total > 0 && remaining === 0),
    hasDp: effectivePaid > 0 && remaining > 0,
  };
}

export function buildWhatsAppInvoiceMessage(
  draft: InvoiceDraft,
  settings: ShopSettings
): string {
  const totals = computeTotals(draft, settings.minDpPercent);
  const itemsText = draft.items
    .filter((i) => i.description.trim() || i.unitPrice > 0)
    .map((item, idx) => {
      const qtyPart = item.quantity > 1 ? ` (${item.quantity}×)` : '';
      const price = item.quantity * item.unitPrice;
      return `  ${idx + 1}. ${item.description || 'Item Dekorasi'}${qtyPart} — ${formatRupiah(price)}`;
    })
    .join('\n');

  const paymentLine = totals.isPaid
    ? `✅ *Status:* LUNAS (${formatRupiah(totals.total)})`
    : totals.hasDp
    ? `🎀 *DP Diterima:* ${formatRupiah(totals.effectivePaid)}\n⏳ *Sisa Tagihan:* *${formatRupiah(totals.remaining)}* (Pelunasan H-1)`
    : `🎀 *Minimal DP (${settings.minDpPercent}%):* ${formatRupiah(totals.minDpAmount)}`;

  return [
    `Halo ${draft.clientName || 'Kak'}! 🎈✨`,
    ``,
    `Berikut rincian Invoice resmi dari *${settings.brandName} ${settings.brandSubtitle}*:`,
    `📄 *No. Invoice:* #${draft.invoiceNumber}`,
    `📅 *Tanggal Acara:* ${formatDateIndo(draft.eventDate)}${draft.eventTime ? ` • ${draft.eventTime} WIB` : ''}`,
    draft.venue ? `📍 *Lokasi:* ${draft.venue}` : null,
    draft.themeNote ? `🎨 *Tema / Warna:* ${draft.themeNote}` : null,
    ``,
    `📦 *Rincian Pesanan:*`,
    itemsText || '  (Sesuai lampiran invoice)',
    ``,
    totals.discount > 0 ? `🏷️ *Diskon:* -${formatRupiah(totals.discount)}` : null,
    `💰 *Total Tagihan:* *${formatRupiah(totals.total)}*`,
    paymentLine,
    ``,
    `💳 *Pembayaran Transfer:*`,
    `🏦 ${settings.bankName} *${settings.bankAccountNumber}*`,
    `a/n *${settings.bankAccountName}*`,
    ``,
    `Terima kasih sudah mempercayakan momen spesialnya ke *${settings.brandName}*! 🎀`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export async function compressImageFile(
  file: File,
  maxDim = 420,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
