'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Phone, Plus, X, Play } from 'lucide-react';
import { adminFetch } from '@/lib/api-client';
import { toast } from 'sonner';

const BATCH_STATES = ['accepting', 'cutoff', 'preparing', 'dispatching', 'completed'];
const BATCH_ICONS = ['📱', '🔒', '🔥', '🚗', '✅'];

export default function AdoptionTestingPage() {
  const [testMode, setTestMode] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [testPhones, setTestPhones] = useState<string[]>(['08099988875', '08106828147']);

  const addPhone = () => {
    if (!newPhone.trim()) return;
    if (testPhones.includes(newPhone.trim())) {
      toast.error('Number already in whitelist');
      return;
    }
    setTestPhones([...testPhones, newPhone.trim()]);
    setNewPhone('');
  };

  const removePhone = (phone: string) => {
    setTestPhones(testPhones.filter(p => p !== phone));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Adoption Testing</h1>
        <p className="text-muted-foreground mt-1 text-sm">Test the batch delivery model before full rollout</p>
      </div>

      {/* Test Mode Toggle */}
      <Card className="bg-card border-border" style={{ borderColor: testMode ? 'rgba(124, 58, 237, 0.3)' : undefined }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Test Mode</h3>
              <p className="text-xs text-muted-foreground mt-1">When enabled, notifications are logged but not actually sent (unless number is whitelisted).</p>
            </div>
            <button
              onClick={() => setTestMode(!testMode)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${testMode ? 'bg-purple-600' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${testMode ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          {testMode && (
            <div className="mt-3 flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                <Zap className="h-3 w-3 mr-1" />
                TEST MODE ACTIVE
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulate Batch Run */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">Simulate Batch Run</CardTitle>
          <p className="text-xs text-muted-foreground">Walk through a full batch lifecycle with test orders to verify all notifications fire correctly.</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {BATCH_STATES.map((s, i) => (
              <div key={s} className="flex-1 p-3 bg-background rounded-lg text-center">
                <div className="text-xl mb-1">{BATCH_ICONS[i]}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{s}</div>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
            onClick={() => toast.info('Batch simulation started (feature coming soon)')}
          >
            <Play className="h-3 w-3 mr-1" />
            Run Simulated Batch
          </Button>
        </CardContent>
      </Card>

      {/* Test Phone Whitelist */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">Test Phone Whitelist</CardTitle>
          <p className="text-xs text-muted-foreground">These numbers will receive real notifications even in test mode.</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap mb-3">
            {testPhones.map(num => (
              <span key={num} className="inline-flex items-center gap-2 px-3 py-1.5 bg-background rounded-full text-xs text-foreground border border-border">
                <Phone className="h-3 w-3" />
                {num}
                <button onClick={() => removePhone(num)} className="text-red-400 hover:text-red-300">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="08012345678"
              className="bg-background border-border text-foreground text-sm h-9 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addPhone()}
            />
            <Button onClick={addPhone} size="sm" variant="outline" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-9">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preview */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">Notification Preview</CardTitle>
          <p className="text-xs text-muted-foreground">See exactly what the customer will receive.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { event: 'order_placed', preview: 'My Shawarma Express: Order #ORD-20260312-0001 confirmed! Your shawarma will be delivered Today between 4:00 PM – 6:00 PM. Total: ₦7,000' },
            { event: 'batch_preparing', preview: 'My Shawarma Express: Your shawarma is on the grill! 🔥 We\'re preparing today\'s fresh batch. Expect delivery between 4:00 PM – 6:00 PM.' },
            { event: 'order_dispatched', preview: 'My Shawarma Express: Order #ORD-20260312-0001 is on its way! 🛵 Your rider is heading to you now. Estimated arrival: 30-45 mins.' },
          ].map((t) => (
            <div key={t.event} className="p-3 bg-background rounded-lg border border-border">
              <p className="text-[10px] font-mono text-orange-400 mb-1">{t.event}</p>
              <p className="text-xs text-foreground leading-relaxed">{t.preview}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
