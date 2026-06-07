import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SocketProvider } from '@/components/socket-provider'

export const metadata: Metadata = {
  title: 'REC Flight Intelligence | Monitoramento de Voos em Tempo Real',
  description:
    'Plataforma de monitoramento e análise de voos em tempo real do Aeroporto Internacional do Recife - Gilberto Freyre (REC)',
  keywords: ['voos', 'aeroporto', 'recife', 'monitoramento', 'tempo real', 'aviação'],
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SocketProvider>
            {children}
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
