'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Hand, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  useClaimConversation,
  useHandbackConversation,
  useReleaseConversation,
  type ConversationDetail,
} from '@/hooks/use-whatsapp-conversations';

interface Props {
  conversation: ConversationDetail;
}

export function ClaimBanner({ conversation }: Props) {
  const claim = useClaimConversation(conversation.phone);
  const release = useReleaseConversation(conversation.phone);
  const handback = useHandbackConversation(conversation.phone);

  // Other agent currently holds it — show force-takeover banner.
  if (conversation.assigned_agent_id && !conversation.is_mine) {
    return (
      <Alert className="border-yellow-500/40 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>
            Claimed by <strong>{conversation.assigned_agent_name || 'another agent'}</strong>
            {conversation.assigned_at && ` at ${new Date(conversation.assigned_at).toLocaleTimeString()}`}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              claim.mutate(true, {
                onSuccess: () => toast.success('Took over conversation'),
                onError: (e: Error) => toast.error(e.message),
              })
            }
          >
            Force take over
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // I hold it — show release / hand-back actions.
  if (conversation.is_mine) {
    return (
      <Alert className="border-blue-500/40 bg-blue-500/10">
        <UserCheck className="h-4 w-4 text-blue-400" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>You&apos;re handling this conversation. AI is muted.</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                release.mutate(undefined, {
                  onSuccess: () => toast.success('Released claim (AI still muted)'),
                })
              }
            >
              Release
            </Button>
            <Button
              size="sm"
              onClick={() =>
                handback.mutate(undefined, {
                  onSuccess: () => toast.success('Handed back to AI'),
                })
              }
            >
              <Hand className="mr-2 h-4 w-4" />
              Hand back to AI
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Unclaimed — show claim button.
  return (
    <div className="flex items-center justify-between gap-3 border-l-4 border-orange-600 bg-orange-950 px-4 py-3">
      <span className="text-sm text-orange-100">
        {conversation.is_muted
          ? 'AI is muted but no agent has claimed this conversation yet.'
          : 'AI is currently handling this conversation.'}
      </span>
      <Button
        size="sm"
        onClick={() =>
          claim.mutate(false, {
            onSuccess: () => toast.success('Claimed'),
            onError: (e: Error) => toast.error(e.message),
          })
        }
      >
        <UserCheck className="mr-2 h-4 w-4" />
        Claim
      </Button>
    </div>
  );
}
