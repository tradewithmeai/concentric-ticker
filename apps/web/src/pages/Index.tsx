
import React from 'react';
import { CryptoTracker } from '@/components/CryptoTracker';
import { Button } from '@concentric/shared/components/ui/button';
import { AudioManager } from '@/components/audio/AudioManager';
import { LogIn, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1" />
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
                Concentric Ticker
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                Real-time crypto price visualization with advanced alert system and multi-channel notifications
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              {!loading && (
                <Button
                  onClick={handleAuthAction}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                >
                  {user ? (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <User className="w-4 h-4 text-green-500" />
              <span className="text-green-500 text-sm">
                Welcome back, {user.user_metadata?.full_name || user.email}
              </span>
            </div>
          )}
        </header>
        <CryptoTracker />
      </div>
    </div>
  );
};

export default Index;
