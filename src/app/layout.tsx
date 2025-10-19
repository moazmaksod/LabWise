import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from '@/context/user-context';
import { cn } from '@/lib/utils';
import { Inter as FontSans, Source_Code_Pro as FontCode } from 'next/font/google';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontCode = FontCode({
  subsets: ['latin'],
  variable: '--font-code',
});

export const metadata: Metadata = {
  title: 'LabWise',
  description: 'Next-generation Laboratory Information Management System (LIMS)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isRtl = false; // Set to true to test RTL layout

  return (
    <html lang={isRtl ? "ar" : "en"} dir={isRtl ? "rtl" : "ltr"} className={isRtl ? "dark" : ""} style={isRtl ? { colorScheme: 'dark' } : {}} suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-body antialiased", fontSans.variable, fontCode.variable)}>
        <UserProvider>
          {children}
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
