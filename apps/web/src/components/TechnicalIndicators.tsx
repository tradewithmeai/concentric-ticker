import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@concentric/shared/components/ui/dialog';
import { Input } from '@concentric/shared/components/ui/input';
import { Label } from '@concentric/shared/components/ui/label';
import { Card } from '@concentric/shared/components/ui/card';
import { TechnicalData } from '@concentric/shared/utils/technicalIndicators';

interface TechnicalIndicatorsProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  timeframe: string;
  technicalData: TechnicalData | null;
  currentPrice: number;
  onBollingerConfigChange: (length: number, multiplier: number) => void;
  bollingerLength: number;
  bollingerMultiplier: number;
}

export const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({
  isOpen,
  onClose,
  symbol,
  timeframe,
  technicalData,
  currentPrice,
  onBollingerConfigChange,
  bollingerLength,
  bollingerMultiplier,
}) => {
  const [localLength, setLocalLength] = useState(bollingerLength);
  const [localMultiplier, setLocalMultiplier] = useState(bollingerMultiplier);

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const handleConfigChange = () => {
    onBollingerConfigChange(localLength, localMultiplier);
  };

  const getMAPricePosition = (ma: number) => {
    if (!currentPrice || ma === 0) return '';
    const diff = ((currentPrice - ma) / ma) * 100;
    const color = diff >= 0 ? 'text-green-500' : 'text-red-500';
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}%`;
  };

  const getBollingerPosition = () => {
    if (!technicalData?.bollingerBands || !currentPrice) return '';
    const { upper, lower, middle } = technicalData.bollingerBands;
    
    if (currentPrice > upper) return 'Above Upper Band';
    if (currentPrice < lower) return 'Below Lower Band';
    if (currentPrice > middle) return 'Above Middle';
    return 'Below Middle';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Technical Indicators - {symbol.replace('USDT', '')}/{timeframe.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        {!technicalData ? (
          <div className="text-center py-8 text-gray-400">
            <p>Loading technical data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Moving Averages */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">Moving Averages</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">7-Period MA</p>
                  <p className="text-xl font-bold">${formatPrice(technicalData.movingAverages.ma7)}</p>
                  <p className={`text-sm ${technicalData.movingAverages.ma7 > 0 ? (currentPrice >= technicalData.movingAverages.ma7 ? 'text-green-500' : 'text-red-500') : 'text-gray-500'}`}>
                    {getMAPricePosition(technicalData.movingAverages.ma7)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">25-Period MA</p>
                  <p className="text-xl font-bold">${formatPrice(technicalData.movingAverages.ma25)}</p>
                  <p className={`text-sm ${technicalData.movingAverages.ma25 > 0 ? (currentPrice >= technicalData.movingAverages.ma25 ? 'text-green-500' : 'text-red-500') : 'text-gray-500'}`}>
                    {getMAPricePosition(technicalData.movingAverages.ma25)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">99-Period MA</p>
                  <p className="text-xl font-bold">${formatPrice(technicalData.movingAverages.ma99)}</p>
                  <p className={`text-sm ${technicalData.movingAverages.ma99 > 0 ? (currentPrice >= technicalData.movingAverages.ma99 ? 'text-green-500' : 'text-red-500') : 'text-gray-500'}`}>
                    {getMAPricePosition(technicalData.movingAverages.ma99)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Bollinger Bands */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Bollinger Bands</h3>
              
              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-900 rounded-lg">
                <div>
                  <Label htmlFor="bb-length" className="text-sm text-gray-400">Length</Label>
                  <Input
                    id="bb-length"
                    type="number"
                    value={localLength}
                    onChange={(e) => setLocalLength(Number(e.target.value))}
                    onBlur={handleConfigChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    min="5"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="bb-multiplier" className="text-sm text-gray-400">Multiplier</Label>
                  <Input
                    id="bb-multiplier"
                    type="number"
                    step="0.1"
                    value={localMultiplier}
                    onChange={(e) => setLocalMultiplier(Number(e.target.value))}
                    onBlur={handleConfigChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    min="0.5"
                    max="5"
                  />
                </div>
              </div>

              {/* Bollinger Band Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Upper Band</p>
                  <p className="text-xl font-bold text-red-400">${formatPrice(technicalData.bollingerBands.upper)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Middle Band (SMA)</p>
                  <p className="text-xl font-bold text-yellow-400">${formatPrice(technicalData.bollingerBands.middle)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Lower Band</p>
                  <p className="text-xl font-bold text-green-400">${formatPrice(technicalData.bollingerBands.lower)}</p>
                </div>
              </div>

              {/* Current Position */}
              <div className="mt-4 p-3 bg-gray-900 rounded-lg text-center">
                <p className="text-sm text-gray-400">Current Position</p>
                <p className="text-lg font-semibold text-white">{getBollingerPosition()}</p>
              </div>
            </Card>

            {/* Current Price Reference */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Current Price</p>
                <p className="text-2xl font-bold text-white">${formatPrice(currentPrice)}</p>
                <p className="text-sm text-gray-500 mt-1">Timeframe: {timeframe.toUpperCase()}</p>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};