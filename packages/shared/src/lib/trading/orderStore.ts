import type { StoredOrder, OrderResponse, AccountType, OrderSide } from './types'

const ORDERS_STORAGE_KEY = 'concentric-order-history'
const MAX_ORDERS = 100

export function getOrderHistory(): StoredOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as StoredOrder[]
  } catch {
    return []
  }
}

export function addOrderToHistory(
  response: OrderResponse,
  accountType: AccountType,
  alertId?: string,
): StoredOrder {
  const order: StoredOrder = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    orderId: response.orderId,
    symbol: response.symbol,
    side: response.side as OrderSide,
    price: response.price,
    quantity: response.origQty,
    status: response.status,
    accountType,
    alertId,
    createdAt: new Date().toISOString(),
  }

  const history = getOrderHistory()
  history.unshift(order)
  if (history.length > MAX_ORDERS) history.length = MAX_ORDERS
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(history))

  return order
}

export function updateOrderStatus(orderId: number, status: StoredOrder['status']): void {
  const history = getOrderHistory()
  const order = history.find(o => o.orderId === orderId)
  if (order) {
    order.status = status
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(history))
  }
}

export function clearOrderHistory(): void {
  localStorage.removeItem(ORDERS_STORAGE_KEY)
}
