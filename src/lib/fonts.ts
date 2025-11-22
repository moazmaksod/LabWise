import { PT_Sans, PT_Sans_Caption } from 'next/font/google';
import localFont from 'next/font/local';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
  display: 'swap',
});

const ptSansCaption = PT_Sans_Caption({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans-caption',
  display: 'swap',
});

// Font for code snippets if needed, keeping Source Code Pro as a good default
import { Source_Code_Pro } from 'next/font/google';
const fontCode = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-code',
  display: 'swap',
});

export const fonts = {
    ptSans,
    ptSansCaption,
    fontCode
};
