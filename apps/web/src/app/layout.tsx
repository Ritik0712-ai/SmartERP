import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartERP — Billing, Inventory & Accounting',
  description:
    'A modern, Tally-inspired, keyboard-first ERP platform for small and medium businesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
