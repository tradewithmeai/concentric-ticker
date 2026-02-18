import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { getStoredKeys } from '../../lib/trading/keyStore'
import { DCAForm } from './DCAForm'
import { DCAList } from './DCAList'
import type { DCAStrategy } from '../../lib/trading/dcaStore'

interface DCADialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategies: DCAStrategy[]
  onChanged: () => void
}

export const DCADialog: React.FC<DCADialogProps> = ({
  open,
  onOpenChange,
  strategies,
  onChanged,
}) => {
  const hasKeys = !!getStoredKeys()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">DCA Strategies</DialogTitle>
          <DialogDescription className="text-gray-400">
            {hasKeys
              ? 'Automated dollar-cost averaging orders'
              : 'Connect your Binance account in Trading to use DCA'}
          </DialogDescription>
        </DialogHeader>

        {!hasKeys ? (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-2">No API keys configured.</p>
            <p className="text-sm">
              Open the <span className="text-blue-400">Trading</span> panel to connect your Binance account first.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <DCAForm onCreated={onChanged} />
            <div className="border-t border-gray-700 pt-4">
              <DCAList strategies={strategies} onChanged={onChanged} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
