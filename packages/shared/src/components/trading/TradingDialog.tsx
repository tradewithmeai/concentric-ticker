import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { getStoredKeys } from '../../lib/trading/keyStore'
import { ApiKeyWizard } from './ApiKeyWizard'
import { OrdersPanel } from './OrdersPanel'

interface TradingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const TradingDialog: React.FC<TradingDialogProps> = ({ open, onOpenChange }) => {
  const [connected, setConnected] = useState(() => !!getStoredKeys())

  const handleComplete = () => {
    setConnected(true)
  }

  const handleDisconnect = () => {
    setConnected(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Trading</DialogTitle>
          <DialogDescription className="text-gray-400">
            {connected ? 'Manage orders and connection' : 'Connect your Binance account'}
          </DialogDescription>
        </DialogHeader>

        {!connected ? (
          <ApiKeyWizard onComplete={handleComplete} />
        ) : (
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="orders" className="data-[state=active]:bg-gray-700 text-sm">
                Orders
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-gray-700 text-sm">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-3">
              <OrdersPanel />
            </TabsContent>

            <TabsContent value="settings" className="mt-3">
              <ApiKeyWizard onComplete={handleComplete} onDisconnect={handleDisconnect} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
