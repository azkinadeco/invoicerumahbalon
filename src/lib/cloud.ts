// Saves invoices into the Invoice Site database (Supabase table rb_invoices).
// The database only accepts registered staff (Row Level Security), so staff
// sign in with the same Google account they use on the Invoice Site.
import { createClient, type Session } from '@supabase/supabase-js';
import { InvoiceDraft, ShopSettings } from '../types';
import { computeTotals, todayLocalISO } from './format';

const SUPABASE_URL = 'https://clyczvltkiervbtfzlmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CJI9V74lBLk6WIBIGrCVzQ_oRoT4GOW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'rumahbalon-gen-auth',
    // iOS Safari can deadlock on navigator.locks when the tab is suspended
    lock: async (_name: string, _timeout: number, fn: () => Promise<any>) => fn(), // eslint-disable-line @typescript-eslint/no-explicit-any
  },
});

export type { Session };

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function invoiceSeq(invoiceNumber: string | undefined): number {
  const n = parseInt(String(invoiceNumber || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/** All invoice numbers in the database, or null when it can't be read. */
export async function fetchCloudInvoiceNumbers(): Promise<string[] | null> {
  const { data, error } = await supabase.from('rb_invoices').select('invoice_number');
  if (error || !data) return null;
  return data.map((r: { invoice_number: string | null }) => String(r.invoice_number || '').trim());
}

/** Shape of an invoice as the Invoice Site stores it (InvoiceData). */
type SiteInvoice = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const STATUS_TO_SITE = { unpaid: 'sent', dp: 'dp_paid', paid: 'paid' } as const;

function toSiteInvoice(
  draft: InvoiceDraft,
  settings: ShopSettings,
  existing: SiteInvoice | null,
  recordedBy: string
): SiteInvoice {
  const t = computeTotals(draft, settings.minDpPercent);
  const now = new Date().toISOString();
  const items = draft.items
    .filter((it) => it.description.trim() !== '' || it.unitPrice > 0)
    .map((it) => {
      const quantity = Math.max(1, it.quantity || 1);
      const unitPrice = Math.max(0, it.unitPrice || 0);
      return { id: it.id, description: it.description, quantity, unitPrice, amount: quantity * unitPrice };
    });

  // Keep payments recorded on the Invoice Site; only add what is newly paid here
  const payments: SiteInvoice[] = Array.isArray(existing?.payments) ? [...existing!.payments] : [];
  const recorded = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  if (t.effectivePaid > recorded) {
    payments.push({
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: todayLocalISO(),
      amount: t.effectivePaid - recorded,
      note: 'Dicatat dari Invoice Generator',
      recordedBy,
      createdAt: now,
    });
  }
  const paid = Math.min(t.total, Math.max(t.effectivePaid, recorded));

  return {
    // Fields only the Invoice Site uses (crew, setup time, properties...) stay as they are
    scheduleStatus: 'scheduled',
    ...(existing || {}),
    id: draft.id,
    invoiceNumber: draft.invoiceNumber,
    invoiceDate: draft.invoiceDate,
    bookingDate: draft.eventDate,
    eventTime: draft.eventTime || existing?.eventTime || '',
    clientName: draft.clientName,
    clientPhone: draft.clientPhone,
    clientAddress: draft.venue,
    venue: draft.venue,
    themeNote: draft.themeNote,
    items,
    subtotal: t.subtotal,
    tax: existing?.tax || 0,
    discount: t.discount,
    dpMinPercent: settings.minDpPercent,
    dpAmount: t.minDpAmount,
    dpPaidAmount: paid,
    remainingAmount: Math.max(0, t.total - paid),
    payments: payments.length ? payments : undefined,
    total: t.total,
    status: paid >= t.total && t.total > 0 ? 'paid' : STATUS_TO_SITE[draft.status],
    bankName: settings.bankName,
    bankAccountName: settings.bankAccountName,
    bankAccountNumber: settings.bankAccountNumber,
    qrisImageUrl: settings.qrisImageUrl,
    showQris: settings.showQris,
    minDpNote: settings.minDpNote,
    notes: settings.notes,
    contactIg: settings.contactIg,
    contactWa: settings.contactWa,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export type SaveResult =
  | { ok: true; updated: boolean }
  | { ok: false; reason: 'number_taken'; nextNumber: string }
  | { ok: false; reason: 'not_staff' | 'error'; message: string };

export async function saveInvoiceToDatabase(
  draft: InvoiceDraft,
  settings: ShopSettings,
  recordedBy: string
): Promise<SaveResult> {
  const { data: existingRows, error: readErr } = await supabase
    .from('rb_invoices')
    .select('id,data')
    .eq('id', draft.id)
    .limit(1);
  if (readErr) return { ok: false, reason: 'error', message: readErr.message };
  const existing = (existingRows?.[0]?.data as SiteInvoice) || null;

  // Another invoice in the database already uses this number
  const { data: sameNumber, error: numErr } = await supabase
    .from('rb_invoices')
    .select('id')
    .eq('invoice_number', draft.invoiceNumber)
    .neq('id', draft.id)
    .limit(1);
  if (numErr) return { ok: false, reason: 'error', message: numErr.message };
  if (sameNumber && sameNumber.length > 0) {
    const numbers = (await fetchCloudInvoiceNumbers()) || [];
    const max = Math.max(invoiceSeq(draft.invoiceNumber), ...numbers.map(invoiceSeq));
    return { ok: false, reason: 'number_taken', nextNumber: String(max + 1).padStart(6, '0') };
  }

  const inv = toSiteInvoice(draft, settings, existing, recordedBy);
  const { data: written, error } = await supabase
    .from('rb_invoices')
    .upsert(
      {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        booking_date: inv.bookingDate,
        status: inv.status,
        data: inv,
        updated_at: inv.updatedAt,
      },
      { onConflict: 'id' }
    )
    .select('id');

  if (error || !written || written.length === 0) {
    const msg = error?.message || '';
    const denied = !error || /row-level security|permission denied|42501/i.test(msg + (error?.code || ''));
    return denied
      ? { ok: false, reason: 'not_staff', message: 'Akun ini belum terdaftar sebagai karyawan di Invoice Site.' }
      : { ok: false, reason: 'error', message: msg };
  }
  return { ok: true, updated: !!existing };
}
