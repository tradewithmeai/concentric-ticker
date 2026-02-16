import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Loader2, RefreshCw, X, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { useTrading } from '../../hooks/useTrading'
import { getOrderHistory } from '../../lib/trading/orderStore'
import type { OpenOrder, StoredOrder } from '../../lib/trading/types'
import { useToast } from '../../hooks/use-toast'

export const OrdersPanel: React.FC = () => {
  const { toast } = useToast()
  const trading = useTrading()
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([])
  const [history, setHistory] = useState<StoredOrder[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOpenOrders = useCallback(async () => {
    if (!trading.isConnected) return
    setLoading(true)
    try {
      const [spot, margin] = await Promise.all([
        trading.getOpenOrders(),
        trading.getMarginOpenOrders(),
      ])
      setOpenOrders([...spot, ...margin])
    } catch (err) {
      console.error('Error fetching open orders:', err)
    } finally {
      setLoading(false)
    }
  }, [trading.isConnected, trading.getOpenOrders, trading.getMarginOpenOrders])

  const loadHistory = useCallback(() => {
    setHistory(getOrderHistory())
  }, [])

  useEffect(() => {
    fetchOpenOrders()
    loadHistory()
  }, [fetchOpenOrders, loadHistory])

  // Auto-refresh open orders every 30s
  useEffect(() => {
    if (!trading.isConnected) return
    const interval = setInterval(fetchOpenOrders, 30000)
    return () => clearInterval(interval)
  }, [trading.isConnected, fetchOpenOrders])

  const handleCancel = async (order: OpenOrder) => {
    try {
      if (order.isMargin) {
        await trading.cancelMarginOrder(order.symbol, order.orderId)
      } else {
        await trading.cancelOrder(order.symbol, order.orderId)
      }
      toast({ title: 'Order cancelled', description: `${order.symbol} #${order.orderId}` })
      fetchOpenOrders()
    } catch (err) {
      toast({
        title: 'Cancel failed',
        description: (err as Error).message,
        variant: 'destructive',
      })
    }
  }

  const formatPrice = (price: string) => {
    const n = parseFloat(price)
    if (n >= 1000) return n.toFixed(2)
    if (n >= 1) return n.toFixed(4)
    return n.toFixed(6)
  }

  const formatTime = (timestamp: number | string) => {
    const d = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Tabs defaultValue="open" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-gray-800">
        <TabsTrigger value="open" className="data-[state=active]:bg-gray-700 text-sm">
          Open Orders
          {openOrders.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 bg-blue-600 text-white text-xs px-1.5">
              {openOrders.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="history" className="data-[state=active]:bg-gray-700 text-sm">
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="open" className="mt-3 space-y-2">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOpenOrders}
            disabled={loading}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {openOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              {loading ? 'Loading...' : 'No open orders'}
            </p>
          ) : (
            openOrders.map((order) => (
              <div
                key={`${order.orderId}-${order.isMargin ? 'm' : 's'}`}
                className="flex items-center justify-between p-2 rounded bg-gray-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {order.side === 'BUY' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-medium truncate">
                        {order.symbol.replace('USDT', '')}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${
                          order.side === 'BUY'
                            ? 'border-green-700 text-green-400'
                            : 'border-red-700 text-red-400'
                        }`}
                      >
                        {order.side}
                      </Badge>
                      {order.isMargin && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 border-yellow-700 text-yellow-400"
                        >
                          M
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">
                      {order.origQty} @ ${formatPrice(order.price)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(order)}
                  className="text-gray-400 hover:text-red-400 shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-3">
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No order history</p>
          ) : (
            history.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-2 rounded bg-gray-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {order.side === 'BUY' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-medium truncate">
                        {order.symbol.replace('USDT', '')}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${
                          order.side === 'BUY'
                            ? 'border-green-700 text-green-400'
                            : 'border-red-700 text-red-400'
                        }`}
                      >
                        {order.side}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 border-gray-600 text-gray-400"
                      >
                        {order.accountType}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-xs">
                      {order.quantity} @ ${formatPrice(order.price)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${
                      order.status === 'FILLED'
                        ? 'border-green-700 text-green-400'
                        : order.status === 'CANCELED'
                          ? 'border-gray-600 text-gray-400'
                          : 'border-yellow-700 text-yellow-400'
                    }`}
                  >
                    {order.status}
                  </Badge>
                  <p className="text-gray-500 text-[10px] mt-0.5">{formatTime(order.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
