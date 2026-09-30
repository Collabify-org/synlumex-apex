export type IntegrationCategory =
  | 'accounting'
  | 'erp'
  | 'comms'
  | 'payments'
  | 'storage';

export type Integration = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string; // emoji
  docs_url?: string;
  coming_soon?: boolean;
};

export const INTEGRATION_CATEGORIES: Record<
  IntegrationCategory,
  { label: string; description: string }
> = {
  accounting: {
    label: 'Accounting',
    description: 'Sync invoices, payments, and receivables.',
  },
  erp: {
    label: 'ERP',
    description: 'Connect purchase orders, materials, and procurement.',
  },
  comms: {
    label: 'Communication',
    description: 'Send alerts and reminders where your team works.',
  },
  payments: {
    label: 'Payments',
    description: 'Auto-reconcile collections with your gateway.',
  },
  storage: {
    label: 'Storage',
    description: 'Attach evidence from cloud drives.',
  },
};

export const INTEGRATIONS: Integration[] = [
  // ---------- Accounting ----------
  {
    id: 'tally',
    name: 'Tally',
    description: 'Sync invoices, GST filings, and receivables from Tally Prime.',
    category: 'accounting',
    icon: '📗',
    docs_url: 'https://tallysolutions.com',
  },
  {
    id: 'zoho_books',
    name: 'Zoho Books',
    description: 'Two-way sync of invoices, payments, and customer balances.',
    category: 'accounting',
    icon: '📘',
    docs_url: 'https://www.zoho.com/books/',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices, expenses, and P&L from QuickBooks Online.',
    category: 'accounting',
    icon: '📙',
    docs_url: 'https://quickbooks.intuit.com',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Auto-import invoices and reconcile collections from Xero.',
    category: 'accounting',
    icon: '📕',
    docs_url: 'https://www.xero.com',
  },

  // ---------- ERP ----------
  {
    id: 'sap',
    name: 'SAP',
    description: 'Connect purchase orders and material movements from SAP.',
    category: 'erp',
    icon: '🟦',
    docs_url: 'https://www.sap.com',
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    description: 'Sync projects, budgets, and financials from NetSuite.',
    category: 'erp',
    icon: '🟥',
    docs_url: 'https://www.netsuite.com',
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics',
    description: 'Connect project operations and financials from Dynamics 365.',
    category: 'erp',
    icon: '🟪',
    docs_url: 'https://dynamics.microsoft.com',
  },

  // ---------- Communication ----------
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post exceptions, reminders, and updates to Slack channels.',
    category: 'comms',
    icon: '💬',
    docs_url: 'https://slack.com',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Send alerts and digests to Teams channels.',
    category: 'comms',
    icon: '🟦',
    docs_url: 'https://www.microsoft.com/microsoft-teams',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Notify clients and site teams via WhatsApp Business API.',
    category: 'comms',
    icon: '🟢',
    docs_url: 'https://business.whatsapp.com',
  },

  // ---------- Payments ----------
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Auto-reconcile payments from Stripe into collections.',
    category: 'payments',
    icon: '💳',
    docs_url: 'https://stripe.com',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Sync payments, refunds, and settlements from Razorpay.',
    category: 'payments',
    icon: '💠',
    docs_url: 'https://razorpay.com',
  },

  // ---------- Storage ----------
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Attach specs, drawings, and evidence from Drive folders.',
    category: 'storage',
    icon: '📁',
    docs_url: 'https://drive.google.com',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Link evidence and documents from Dropbox.',
    category: 'storage',
    icon: '📦',
    docs_url: 'https://www.dropbox.com',
  },
];

export function getIntegrationById(id: string): Integration | null {
  return INTEGRATIONS.find((i) => i.id === id) ?? null;
}

export function groupByCategory(): Record<IntegrationCategory, Integration[]> {
  const groups = {} as Record<IntegrationCategory, Integration[]>;
  for (const key of Object.keys(INTEGRATION_CATEGORIES) as IntegrationCategory[]) {
    groups[key] = INTEGRATIONS.filter((i) => i.category === key);
  }
  return groups;
}
