import { InvoiceDraft, PresetPackage, ShopSettings } from '../types';
import { todayLocalISO } from './format';

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  brandName: 'Rumah Balon',
  brandSubtitle: 'Decoration',
  tagline: 'Balloon Decoration • Malang',
  bankName: 'BCA',
  bankAccountNumber: '011-857-8612',
  bankAccountName: 'DYAS KURNIAWAN',
  qrisImageUrl: '',
  showQris: true,
  minDpPercent: 30,
  minDpNote: '( Min Dp 30% of price ,atau sesuai dengan kesepakatan )',
  notes: [
    '*Seluruh Properti selain balon bersifat rental/sewa, untuk balon menjadi hak milik customer Ü',
    '*Jika ada kerusakan / kehilangan Property backdrop, Lampu, Bunga artificial, Meja kue, dll akan dikenakan charge/item^^',
  ],
  contactIg: 'Rumahbalon_mlg',
  contactWa: '+62 857-8612-1897',
  location: 'Malang & Sekitarnya',
};

export const PRESET_PACKAGES: PresetPackage[] = [
  {
    id: 'pkg-birthday-25',
    label: 'Birthday 2.5m (Full)',
    category: 'Paket',
    description:
      'Decor Balloon and backdrop 2,5m for birthday package, Include table cake and artificial flowers',
    unitPrice: 1200000,
  },
  {
    id: 'pkg-photobooth-15',
    label: 'Photobooth Simmer 1.5m',
    category: 'Paket',
    description: 'Decor balloon and backdrop simmer 1,5m for photobooth',
    unitPrice: 500000,
  },
  {
    id: 'pkg-arch-3m',
    label: 'Arch Garland 3m',
    category: 'Paket',
    description: 'Organic Balloon Garland Arch 3 meter (Custom Theme Colors)',
    unitPrice: 750000,
  },
  {
    id: 'pkg-ring',
    label: 'Backdrop Bulat / Ring',
    category: 'Paket',
    description: 'Backdrop Circle 2m + Half Garland Balon + Custom Cutout Text',
    unitPrice: 850000,
  },
  {
    id: 'addon-marquee',
    label: 'LED Marquee Number',
    category: 'Add-on',
    description: 'Rental Lampu LED Marquee Number 100cm (per digit)',
    unitPrice: 750000,
  },
  {
    id: 'addon-cake-table',
    label: 'Dessert Table Cake Set',
    category: 'Add-on',
    description: 'Rental Stand Cake 3 susun + Meja Silinder Acrylic',
    unitPrice: 250000,
  },
  {
    id: 'tr-malang',
    label: 'Transport Malang Kota',
    category: 'Transport',
    description: 'Transport & Pasang-Bongkar Malang Kota',
    unitPrice: 0,
  },
  {
    id: 'tr-batu',
    label: 'Transport Batu / Kab.',
    category: 'Transport',
    description: 'Transport & Pasang-Bongkar Area Kota Batu / Luar Kota',
    unitPrice: 100000,
  },
];

export function createNewDraft(invoiceNumber: string): InvoiceDraft {
  const today = todayLocalISO();
  return {
    id: `inv-${Date.now()}`,
    invoiceNumber,
    invoiceDate: today,
    eventDate: today,
    eventTime: '',
    clientName: '',
    clientPhone: '',
    venue: '',
    themeNote: '',
    items: [
      {
        id: `item-${Date.now()}-1`,
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ],
    discount: 0,
    dpPaid: 0,
    status: 'unpaid',
    updatedAt: new Date().toISOString(),
  };
}

export function createSampleDraft(invoiceNumber: string): InvoiceDraft {
  const today = todayLocalISO();
  return {
    id: `inv-${Date.now()}`,
    invoiceNumber,
    invoiceDate: today,
    eventDate: today,
    eventTime: '14:00',
    clientName: 'Siti Rahma',
    clientPhone: '0812-3456-7890',
    venue: 'Alana Hotel, Kota Malang',
    themeNote: 'Birthday Package 2.5m + Photobooth Simmer 1.5m',
    items: [
      {
        id: 'sample-1',
        description:
          'Decor Balloon and backdrop 2,5m for birthday package, Include table cake and artificial flowers',
        quantity: 1,
        unitPrice: 1200000,
      },
      {
        id: 'sample-2',
        description: 'Decor balloon and backdrop simmer 1,5m for photobooth',
        quantity: 1,
        unitPrice: 500000,
      },
      {
        id: 'sample-3',
        description: 'Transport loc Alana Hotel, kota Malang',
        quantity: 1,
        unitPrice: 0,
      },
    ],
    discount: 0,
    dpPaid: 510000,
    status: 'dp',
    updatedAt: new Date().toISOString(),
  };
}
