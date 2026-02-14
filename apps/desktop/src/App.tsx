import { Toaster } from '@concentric/shared/components/ui/toaster'
import { Toaster as Sonner } from '@concentric/shared/components/ui/sonner'
import { TooltipProvider } from '@concentric/shared/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/Index'
import { DataErrorBanner } from '@concentric/shared/components/common/DataErrorBanner'
import { ErrorBoundary } from '@concentric/shared/components/common/ErrorBoundary'
import { useState } from 'react'

const queryClient = new QueryClient()

const App = () => {
  const [resetKey] = useState(0)

  return (
    <ErrorBoundary resetKey={resetKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DataErrorBanner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
