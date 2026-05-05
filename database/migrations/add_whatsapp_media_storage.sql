-- Private Storage bucket for images sent from the WhatsApp comms panel.
-- The agent uploads to this bucket; the API issues a short-lived signed URL
-- that the Baileys sidecar fetches before sending via WhatsApp.

INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO NOTHING;

-- Service role has full access (server-side uploads + signed URL generation).
CREATE POLICY "Service role manages whatsapp-media"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'whatsapp-media' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'service_role');
