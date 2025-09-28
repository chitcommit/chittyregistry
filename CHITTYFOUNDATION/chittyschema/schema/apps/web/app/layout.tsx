import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChittyChain Schema - Legal Database Schemas, Generated Instantly',
  description: 'Generate production-ready legal database schemas with evidence management, compliance, and GDPR support. Deploy to PostgreSQL, Notion, and more.',
  keywords: [
    'legal tech',
    'database schema',
    'evidence management',
    'chittychain',
    'legal database',
    'schema generation',
    'GDPR compliance',
    'legal software'
  ],
  authors: [{ name: 'ChittyOS Framework', url: 'https://chitty.cc' }],
  creator: 'ChittyOS Framework',
  publisher: 'ChittyOS Framework',
  openGraph: {
    title: 'ChittyChain Schema - Legal Database Schemas',
    description: 'Generate production-ready legal database schemas instantly. Just enter your ChittyID and go.',
    url: 'https://schema.chitty.cc',
    siteName: 'ChittyChain Schema',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ChittyChain Schema - Legal Database Generation'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChittyChain Schema - Legal Database Schemas',
    description: 'Generate production-ready legal database schemas instantly.',
    images: ['/og-image.png']
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
  verification: {
    google: 'your-google-site-verification-code',
  },
  alternates: {
    canonical: 'https://schema.chitty.cc',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  themeColor: '#8b5cf6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://schema.chitty.cc" />
        <link rel="dns-prefetch" href="https://id.chitty.cc" />

        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Performance hints */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "ChittyChain Schema",
              "url": "https://schema.chitty.cc",
              "description": "Generate production-ready legal database schemas with evidence management, compliance, and GDPR support",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "publisher": {
                "@type": "Organization",
                "name": "ChittyOS Framework",
                "url": "https://chitty.cc"
              },
              "featureList": [
                "Legal database schema generation",
                "Evidence management systems",
                "GDPR compliance",
                "PostgreSQL deployment",
                "Notion integration",
                "Automated schema validation"
              ]
            })
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white antialiased">
        <div className="relative">
          {/* Background effects */}
          <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none" />
          <div className="fixed inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 pointer-events-none" />

          {/* Main content */}
          <main className="relative z-10">
            {children}
          </main>

          {/* Footer */}
          <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
              <div className="grid md:grid-cols-4 gap-8">
                <div>
                  <h3 className="font-bold text-lg mb-4 text-gradient">ChittyChain Schema</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    Production-ready legal database schemas, generated instantly with ChittyOS Framework.
                  </p>
                  <div className="flex space-x-4">
                    <a href="https://github.com/chittyos" className="text-gray-400 hover:text-white">
                      <span className="sr-only">GitHub</span>
                      🐙
                    </a>
                    <a href="https://twitter.com/chittyos" className="text-gray-400 hover:text-white">
                      <span className="sr-only">Twitter</span>
                      🐦
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Products</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li><a href="https://schema.chitty.cc" className="hover:text-white">Schema Generator</a></li>
                    <li><a href="https://id.chitty.cc" className="hover:text-white">ChittyID</a></li>
                    <li><a href="https://chitty.cc" className="hover:text-white">ChittyOS</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Documentation</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li><a href="/docs/api" className="hover:text-white">API Reference</a></li>
                    <li><a href="/docs/integration" className="hover:text-white">Integration Guide</a></li>
                    <li><a href="/docs/examples" className="hover:text-white">Examples</a></li>
                    <li><a href="/docs/support" className="hover:text-white">Support</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Legal</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
                    <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
                    <li><a href="/compliance" className="hover:text-white">Compliance</a></li>
                    <li><a href="/security" className="hover:text-white">Security</a></li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm text-gray-400">
                  © 2024 ChittyOS Framework. All rights reserved.
                </p>
                <p className="text-sm text-gray-400 mt-2 md:mt-0">
                  Powered by Cloudflare Workers • Built with Next.js
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}