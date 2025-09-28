import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChittyChain Schema - AI-Powered Legal Database Management',
  description: 'Generate, validate, and deploy production-ready legal database schemas with AI assistance. Built for legal professionals.',
  keywords: ['legal database', 'schema management', 'evidence management', 'legal tech', 'ChittyChain', 'Notion integration'],
  authors: [{ name: 'ChittyOS Framework Team' }],
  openGraph: {
    title: 'ChittyChain Schema Platform',
    description: 'AI-powered legal database schema management',
    url: 'https://schema.chitty.cc',
    siteName: 'ChittyChain',
    images: [
      {
        url: 'https://schema.chitty.cc/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChittyChain Schema Platform',
    description: 'AI-powered legal database schema management',
    images: ['https://schema.chitty.cc/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export const runtime = 'edge'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex min-h-full flex-col`}>
        <Providers>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster position="bottom-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}