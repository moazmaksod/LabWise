import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from '@/context/user-context';
import { cn } from '@/lib/utils';
import { fonts } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'LabWise',
  description: 'Next-generation Laboratory Information Management System (LIMS)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // For now, we default to LTR/English. Sprint 15 handles full i18n/RTL.
  const isRtl = false;

  return (
    <html lang="en" dir="ltr" className={cn("antialiased", fonts.ptSans.variable, fonts.ptSansCaption.variable, fonts.fontCode.variable)}>
      <body className="min-h-screen bg-background font-body text-foreground">
        <UserProvider>
          {children}
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
