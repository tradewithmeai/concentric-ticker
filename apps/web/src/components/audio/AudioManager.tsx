
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@concentric/shared/components/ui/card';
import { Button } from '@concentric/shared/components/ui/button';
import { Label } from '@concentric/shared/components/ui/label';
import { Slider } from '@concentric/shared/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@concentric/shared/components/ui/select';
import { Switch } from '@concentric/shared/components/ui/switch';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@concentric/shared/hooks/use-toast';

interface AudioPreferences {
  sound_type: string;
  volume: number;
  enabled: boolean;
}

export const AudioManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<AudioPreferences>({
    sound_type: 'chime',
    volume: 0.5,
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const soundOptions = [
    { value: 'chime', label: 'Chime' },
    { value: 'bell', label: 'Bell' },
    { value: 'notification', label: 'Notification' },
    { value: 'alert', label: 'Alert' },
    { value: 'beep', label: 'Beep' },
  ];

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading audio preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          sound_type: data.sound_type,
          volume: data.volume,
          enabled: data.enabled,
        });
      }
    } catch (error) {
      console.error('Error loading audio preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: AudioPreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('audio_preferences')
        .upsert({
          user_id: user.id,
          sound_type: newPreferences.sound_type,
          volume: newPreferences.volume,
          enabled: newPreferences.enabled,
        });

      if (error) throw error;

      toast({
        title: "Audio preferences saved",
        description: "Your audio settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save audio preferences.",
        variant: "destructive",
      });
    }
  };

  const playTestSound = () => {
    try {
      // Create a test sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies: Record<string, number> = {
        chime: 800,
        bell: 1000,
        notification: 600,
        alert: 1200,
        beep: 880
      };
      
      oscillator.frequency.setValueAtTime(frequencies[preferences.sound_type] || 880, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(preferences.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing test sound:', error);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newPreferences = { ...preferences, volume: value[0] };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  const handleSoundTypeChange = (soundType: string) => {
    const newPreferences = { ...preferences, sound_type: soundType };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  const handleEnabledChange = (enabled: boolean) => {
    const newPreferences = { ...preferences, enabled };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading audio preferences...</div>;
  }

  return (
    <Card className="bg-gray-900 border-gray-700 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {preferences.enabled ? (
              <Volume2 className="w-5 h-5 text-green-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
            <span className="font-semibold text-white">Audio Alerts</span>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {preferences.enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-white">Sound Type</Label>
              <div className="flex gap-2">
                <Select value={preferences.sound_type} onValueChange={handleSoundTypeChange}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {soundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playTestSound}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Volume: {Math.round(preferences.volume * 100)}%</Label>
              <Slider
                value={[preferences.volume]}
                onValueChange={handleVolumeChange}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

    </Card>
  );
};
