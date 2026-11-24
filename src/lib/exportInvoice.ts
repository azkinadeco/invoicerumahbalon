import { toCanvas } from 'html-to-image';
import { InvoiceDraft } from '../types';

export const INVOICE_CAPTURE_ID = 'rumahbalon-invoice-paper';

function safeFileBase(draft: InvoiceDraft): string {
  const num = (draft.invoiceNumber || 'RB').replace(/[^a-zA-Z0-9-_]/g, '');
  const client = (draft.clientName || 'Client')
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 28);
  return `Invoice_${num}_${client || 'Client'}`;
}

/**
 * Captures the A5 Rumah Balon invoice sheet (560x794) at crisp 2.5x resolution.
 * Uses double-pass rendering so iOS Safari properly embeds web fonts & images.
 */
export async function captureInvoiceCanvas(): Promise<HTMLCanvasElement | null> {
  const element = document.getElementById(INVOICE_CAPTURE_ID);
  if (!element) return null;

  try {
    await Promise.all([
      document.fonts.load('400 16px "DOSans"').catch(() => []),
      document.fonts.load('700 16px "DOSans"').catch(() => []),
      document.fonts.load('400 48px "Lepetitcochon"').catch(() => []),
    ]);
    await document.fonts.ready;

    const options = {
      pixelRatio: 2.5,
      backgroundColor: '#fff9f5',
      width: 560,
      height: 794,
      cacheBust: false,
      style: {
        transform: 'none',
        boxShadow: 'none',
        margin: '0',
      },
    };

    // Warm-up pass prevents blank images/fonts on iOS Safari
    await toCanvas(element, options);
    return await toCanvas(element, options);
  } catch (err) {
    console.error('Capture invoice failed:', err);
    return null;
  }
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

/**
 * Native iPhone / iOS Share Sheet!
 * Lets employees tap once to send the PNG directly to WhatsApp or Save to Photos.
 */
export async function shareInvoiceNative(
  draft: InvoiceDraft,
  text?: string
): Promise<'shared' | 'unsupported' | 'cancelled' | 'error'> {
  try {
    const canvas = await captureInvoiceCanvas();
    if (!canvas) return 'error';

    const blob = await canvasToPngBlob(canvas);
    if (!blob) return 'error';

    const fileName = `${safeFileBase(draft)}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: `Invoice #${draft.invoiceNumber} — Rumah Balon`,
        text: text || `Invoice #${draft.invoiceNumber} untuk ${draft.clientName || 'Pelanggan'}`,
      });
      return 'shared';
    }

    return 'unsupported';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
    console.error('Native share failed:', err);
    return 'error';
  }
}

export async function downloadInvoicePng(draft: InvoiceDraft): Promise<boolean> {
  const canvas = await captureInvoiceCanvas();
  if (!canvas) return false;

  const link = document.createElement('a');
  link.download = `${safeFileBase(draft)}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 200);
  return true;
}

export async function downloadInvoicePdf(draft: InvoiceDraft): Promise<boolean> {
  const canvas = await captureInvoiceCanvas();
  if (!canvas) return false;

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
    compress: true,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210, undefined, 'FAST');

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileBase(draft)}_A5.pdf`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1500);
  return true;
}

export async function copyInvoicePngToClipboard(): Promise<boolean> {
  const canvas = await captureInvoiceCanvas();
  if (!canvas) return false;
  const blob = await canvasToPngBlob(canvas);
  if (!blob) return false;

  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  }
  return false;
}

export function printInvoiceA5(draft: InvoiceDraft) {
  const previewEl = document.getElementById(INVOICE_CAPTURE_ID);
  if (!previewEl) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const clone = previewEl.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.margin = '0 auto';

  let stylesHtml = '';
  Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${draft.invoiceNumber} — Rumah Balon</title>
  ${stylesHtml}
  <style>
    @page { size: 148mm 210mm; margin: 0mm !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { margin: 0 !important; padding: 0 !important; width: 148mm !important; height: 210mm !important; background: #fff9f5 !important; }
    #${INVOICE_CAPTURE_ID} { width: 148mm !important; height: 210mm !important; box-shadow: none !important; }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 3000);
  }, 400);
}
