// Upload an image attachment for the WhatsApp comms panel composer.
// Returns the storage path; the /send route signs it before forwarding to Baileys.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import crypto from 'node:crypto';

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'whatsapp-media';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5 MB' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext || 'bin'}`;

    const supabase = createServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error('[whatsapp:media:upload]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ path });
  } catch (error) {
    console.error('[whatsapp:media:upload] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
