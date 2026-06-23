import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import './globals.css'

export const metadata: Metadata = {
  title: 'Platform',
  description: 'Fintech platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
