import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { IntelAIConditional } from '@/components/marketing/intel-ai-conditional';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const BASE_URL = 'https://apex.synlumexai.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'Synlumex Apex — Operating System for Project Businesses',
    template: '%s | Synlumex Apex',
  },

  description:
    'Operating system for project-driven businesses. Connect intake, execution, billing & compliance in one closed loop. AI-powered. 14-day trial.',

  keywords: [
    'project management software',
    'EPC software',
    'construction management',
    'project operating system',
    'BOQ extraction AI',
    'commercial visibility',
    'project compliance software',
    'energy project management',
    'manufacturing project software',
    'mining project software',
  ],

  authors: [{ name: 'Synlumex' }],
  creator: 'Synlumex',
  publisher: 'Synlumex',

  alternates: {
    canonical: BASE_URL,
  },

  openGraph: {
    title: 'Synlumex Apex — Operating System for Project Businesses',
    description:
      'Connect intake, execution, billing, and compliance in one closed loop. AI-powered. Built for EPC, energy, manufacturing, oil & gas, logistics, and mining.',
    url: BASE_URL,
    siteName: 'Synlumex Apex',
    type: 'website',
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Synlumex Apex',
    description: 'Operating system for project-driven businesses.',
    creator: '@synlumex',
  },

  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  category: 'business software',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-background font-sans">
        {children}
        <IntelAIConditional />
      </body>
    </html>
  );
}
