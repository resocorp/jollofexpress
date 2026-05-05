'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConversationList } from '@/components/admin/whatsapp/conversation-list';
import { ConversationDetail } from '@/components/admin/whatsapp/conversation-detail';
import type { ConversationFilter } from '@/hooks/use-whatsapp-conversations';

function WhatsappPanelInner() {
  const router = useRouter();
  const search = useSearchParams();
  const phone = search.get('phone');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchInput, setSearchInput] = useState('');

  const handleSelect = (newPhone: string) => {
    const params = new URLSearchParams(search.toString());
    params.set('phone', newPhone);
    router.replace(`/admin/whatsapp?${params.toString()}`);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8">
      <div className="w-80 shrink-0">
        <ConversationList
          filter={filter}
          onFilterChange={setFilter}
          search={searchInput}
          onSearchChange={setSearchInput}
          selectedPhone={phone}
          onSelect={handleSelect}
        />
      </div>
      {phone ? (
        <ConversationDetail phone={phone} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to view the thread.
        </div>
      )}
    </div>
  );
}

export default function WhatsappPanelPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <WhatsappPanelInner />
    </Suspense>
  );
}
