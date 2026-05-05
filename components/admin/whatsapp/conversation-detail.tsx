'use client';

import { Loader2 } from 'lucide-react';
import { useWhatsappConversation } from '@/hooks/use-whatsapp-conversations';
import { MessageThread } from './message-thread';
import { ClaimBanner } from './claim-banner';
import { ReplyComposer } from './reply-composer';
import { CustomerContextPanel } from './customer-context-panel';
import { InternalNotesPanel } from './internal-notes-panel';

interface Props {
  phone: string;
}

export function ConversationDetail({ phone }: Props) {
  const { data: conversation, isLoading } = useWhatsappConversation(phone);

  if (isLoading || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full bg-slate-950">
      {/* Center column — chat */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-100">
                {conversation.customer_name || conversation.phone}
              </p>
              {conversation.customer_name && (
                <p className="text-xs text-slate-400">{conversation.phone}</p>
              )}
            </div>
          </div>
        </div>

        <ClaimBanner conversation={conversation} />

        <MessageThread key={conversation.phone} messages={conversation.messages} />

        <ReplyComposer conversation={conversation} />
      </div>

      {/* Right column — context + notes */}
      <aside className="hidden w-80 space-y-3 overflow-y-auto border-l border-slate-800 p-3 lg:block">
        <CustomerContextPanel conversation={conversation} />
        <InternalNotesPanel phone={conversation.phone} />
      </aside>
    </div>
  );
}
