'use client';

import { usePathname } from 'next/navigation';
import { IntelAI } from './intel-ai';

// Public marketing routes where the assistant should appear
const MARKETING_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/refund',
  '/disclaimer',
];

export function IntelAIConditional() {
  const path = usePathname();

  // Never show inside authenticated app or admin routes
  if (
    path.startsWith('/dashboard') ||
    path.startsWith('/projects') ||
    path.startsWith('/exceptions') ||
    path.startsWith('/commercial') ||
    path.startsWith('/intelligence') ||
    path.startsWith('/reminders') ||
    path.startsWith('/audit') ||
    path.startsWith('/settings') ||
    path.startsWith('/account') ||
    path.startsWith('/profile') ||
    path.startsWith('/admin') ||
    path.startsWith('/billing') ||
    path.startsWith('/login')
  ) {
    return null;
  }

  // Only render on marketing routes
  if (!MARKETING_ROUTES.includes(path)) {
    return null;
  }

  return <IntelAI />;
}
