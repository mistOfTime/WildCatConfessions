import type {Metadata} from 'next';
import './globals.css';
import Navbar from '@/components/navbar';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';

export const metadata: Metadata = {
  title: 'Wildcat Confessions',
  description: 'A space for everyone. Students, strangers, and everyone in between.',
  openGraph: {
    title: 'Wildcat Confessions',
    description: 'A space for everyone. Students, strangers, and everyone in between.',
    url: 'https://wildcatconfess.vercel.app',
    siteName: 'Wildcat Confessions',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wildcat Confessions',
    description: 'A space for everyone. Students, strangers, and everyone in between.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <FirebaseClientProvider>
          <Navbar />
          <main className="max-w-screen-xl mx-auto pt-14">
            {children}
          </main>
          <Toaster />
          <FirebaseErrorListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
