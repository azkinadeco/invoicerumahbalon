export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentStatus = 'unpaid' | 'dp' | 'paid';

export interface ShopSettings {
  brandName: string;
  brandSubtitle: string;
  tagline: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  qrisImageUrl: string;
  showQris: boolean;
  minDpPercent: number;
  minDpNote: string;
  notes: string[];
  contactIg: string;
  contactWa: string;
  location: string;
}

export interface InvoiceDraft {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;      // YYYY-MM-DD
  eventDate: string;        // YYYY-MM-DD
  eventTime: string;        // e.g. "14:00"
  clientName: string;
  clientPhone: string;
  venue: string;
  themeNote: string;
  items: InvoiceItem[];
  discount: number;
  dpPaid: number;
  status: PaymentStatus;
  updatedAt: string;
  /** updatedAt of the version last saved to the Invoice Site database */
  cloudSavedAt?: string;
}

export interface PresetPackage {
  id: string;
  label: string;
  category: 'Paket' | 'Add-on' | 'Transport';
  description: string;
  unitPrice: number;
}
