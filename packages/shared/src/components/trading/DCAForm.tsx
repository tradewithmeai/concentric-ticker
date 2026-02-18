import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Plus } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'
import { createDCAStrategy } from '../../lib/trading/dcaStore'
import type { OrderSide, AccountType } from '../../lib/trading/types'

const COMMON_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT']

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DCAFormProps {
  onCreated: () => void
}

export const DCAForm: React.FC<DCAFormProps> = ({ onCreated }) => {
  const { toast } = useToast()
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [side, setSide] = useState<OrderSide>('BUY')
  const [quoteAmount, setQuoteAmount] = useState('50')
  const [totalBudget, setTotalBudget] = useState('1000')
  const [accountType, setAccountType] = useState<AccountType>('MARGIN')
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily')
  const [scheduledTime, setScheduledTime] = useState('16:30')
  const [hourlyMode, setHourlyMode] = useState<'start' | 'end'>('start')
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday

  const handleCreate = () => {
    const amt = parseFloat(quoteAmount)
    const budget = parseFloat(totalBudget)

    if (!amt || amt <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' })
      return
    }
    if (!budget || budget <= 0) {
      toast({ title: 'Invalid budget', variant: 'destructive' })
      return
    }
    if (amt > budget) {
      toast({ title: 'Period amount exceeds total budget', variant: 'destructive' })
      return
    }

    const time = frequency === 'hourly' ? hourlyMode : scheduledTime

    createDCAStrategy({
      symbol: symbol.toUpperCase(),
      side,
      quoteAmount: String(amt),
      totalBudget: String(budget),
      accountType,
      frequency,
      scheduledTime: time,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      enabled: true,
    })

    toast({
      title: 'DCA Strategy Created',
      description: `${side} $${amt} ${symbol.replace('USDT', '')} ${frequency}`,
    })

    onCreated()
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-white">New DCA Strategy</h4>

      {/* Asset */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Asset</Label>
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {COMMON_PAIRS.map((pair) => (
              <SelectItem key={pair} value={pair} className="text-white">
                {pair.replace('USDT', '/USDT')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Side + Account */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Side</Label>
          <Select value={side} onValueChange={(v) => setSide(v as OrderSide)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="BUY" className="text-green-400">BUY</SelectItem>
              <SelectItem value="SELL" className="text-red-400">SELL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Account</Label>
          <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="SPOT" className="text-white">Spot</SelectItem>
              <SelectItem value="MARGIN" className="text-white">Margin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Amount per period (USDT)</Label>
          <Input
            type="number"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            min="1"
            step="1"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Total budget (USDT)</Label>
          <Input
            type="number"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            min="1"
            step="1"
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Frequency</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as 'hourly' | 'daily' | 'weekly')}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="hourly" className="text-white">Hourly</SelectItem>
            <SelectItem value="daily" className="text-white">Daily</SelectItem>
            <SelectItem value="weekly" className="text-white">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedule — conditional on frequency */}
      {frequency === 'hourly' && (
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Execute at</Label>
          <Select value={hourlyMode} onValueChange={(v) => setHourlyMode(v as 'start' | 'end')}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="start" className="text-white">Start of hour (XX:00)</SelectItem>
              <SelectItem value="end" className="text-white">End of hour (XX:55)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(frequency === 'daily' || frequency === 'weekly') && (
        <div className={`grid ${frequency === 'weekly' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
          {frequency === 'weekly' && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Day</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {DAYS.map((day, i) => (
                    <SelectItem key={i} value={String(i)} className="text-white">{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Time</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
        {side} ${quoteAmount} of {symbol.replace('USDT', '')} {frequency}
        {frequency === 'hourly' && ` at ${hourlyMode} of each hour`}
        {frequency === 'daily' && ` at ${scheduledTime}`}
        {frequency === 'weekly' && ` on ${DAYS[dayOfWeek]} at ${scheduledTime}`}
        {' '}via {accountType.toLowerCase()} — total budget ${totalBudget}
        {' '}({Math.floor(parseFloat(totalBudget) / (parseFloat(quoteAmount) || 1))} executions)
      </div>

      <Button
        onClick={handleCreate}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Strategy
      </Button>
    </div>
  )
}
