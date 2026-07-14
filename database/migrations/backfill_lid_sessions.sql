-- One-shot backfill: merge any whatsapp_ai_sessions rows that are still
-- keyed by a bare LID into their canonical phone-keyed row. Idempotent.
--
-- Why: when a customer's first inbound message arrives on `<lid>@lid` and
-- Baileys hasn't yet supplied a senderPn, lib/whatsapp/identity.ts falls back
-- to writing the session under the bare LID digits. The admin comms panel
-- then displays the LID instead of the customer's phone, and replies to that
-- "phone" hit `<lid_digits>@s.whatsapp.net` — which doesn't exist on WhatsApp.
--
-- whatsapp_lid_map fills as senderPn arrives on later messages (or via
-- recordLidForPhone on outbound). This migration walks the map and, for each
-- bare-LID session whose LID is now mapped, either:
--   (a) merges its messages into the existing phone-keyed session
--       (concat → sort by timestamp → keep last 40), then deletes the
--       bare-LID row;
--   (b) renames it in place (UPDATE phone = mapped_phone) when no
--       phone-keyed row exists yet.
--
-- Constants mirror MAX_HISTORY_MESSAGES = 40 in lib/ai/session-log.ts:11.

BEGIN;

DO $$
DECLARE
  map_row    RECORD;
  bare_lid   TEXT;
  lid_sess   RECORD;
  phone_sess RECORD;
  merged     JSONB;
BEGIN
  FOR map_row IN
    SELECT lid_jid, phone FROM whatsapp_lid_map
  LOOP
    bare_lid := regexp_replace(map_row.lid_jid, '@lid$', '');

    -- Skip pathological rows where the LID equals the mapped phone.
    IF bare_lid = map_row.phone THEN
      CONTINUE;
    END IF;

    SELECT * INTO lid_sess
    FROM whatsapp_ai_sessions
    WHERE phone = bare_lid;

    -- Nothing to do if the bare-LID session was already cleaned up.
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT * INTO phone_sess
    FROM whatsapp_ai_sessions
    WHERE phone = map_row.phone;

    IF NOT FOUND THEN
      -- (b) Rename in place — the phone-keyed row doesn't exist yet, so the
      --     UNIQUE(phone) constraint won't fire.
      UPDATE whatsapp_ai_sessions
      SET phone = map_row.phone
      WHERE id = lid_sess.id;
    ELSE
      -- (a) Merge: concat both message arrays, sort by timestamp ascending
      --     (rows without a timestamp keep their original ordinal), then
      --     keep the trailing 40 entries to match MAX_HISTORY_MESSAGES.
      WITH concatenated AS (
        SELECT m AS msg, ord
        FROM jsonb_array_elements(COALESCE(phone_sess.messages, '[]'::jsonb))
          WITH ORDINALITY AS t(m, ord)
        UNION ALL
        SELECT m,
               (SELECT COALESCE(jsonb_array_length(phone_sess.messages), 0)) + ord
        FROM jsonb_array_elements(COALESCE(lid_sess.messages, '[]'::jsonb))
          WITH ORDINALITY AS t(m, ord)
      ),
      sorted AS (
        SELECT msg
        FROM concatenated
        ORDER BY COALESCE(msg->>'timestamp', '') ASC, ord ASC
      ),
      tail AS (
        SELECT jsonb_agg(msg) AS msgs
        FROM (
          SELECT msg FROM sorted
          OFFSET GREATEST(0, (SELECT COUNT(*) FROM sorted) - 40)
        ) trimmed
      )
      SELECT msgs INTO merged FROM tail;

      UPDATE whatsapp_ai_sessions
      SET messages       = COALESCE(merged, '[]'::jsonb),
          last_activity  = GREATEST(
                             COALESCE(phone_sess.last_activity, '-infinity'::timestamptz),
                             COALESCE(lid_sess.last_activity,   '-infinity'::timestamptz)
                           ),
          ai_muted_until = GREATEST(
                             COALESCE(phone_sess.ai_muted_until, '-infinity'::timestamptz),
                             COALESCE(lid_sess.ai_muted_until,   '-infinity'::timestamptz)
                           ),
          -- Prefer whichever side has a more recent assignment timestamp.
          assigned_agent_id = CASE
            WHEN COALESCE(lid_sess.assigned_at, '-infinity'::timestamptz)
                 > COALESCE(phone_sess.assigned_at, '-infinity'::timestamptz)
            THEN lid_sess.assigned_agent_id
            ELSE phone_sess.assigned_agent_id
          END,
          assigned_at = GREATEST(
                          COALESCE(phone_sess.assigned_at, '-infinity'::timestamptz),
                          COALESCE(lid_sess.assigned_at,   '-infinity'::timestamptz)
                        ),
          -- Carry forward an awaiting_feedback_order_id from either side.
          awaiting_feedback_order_id = COALESCE(
                                         phone_sess.awaiting_feedback_order_id,
                                         lid_sess.awaiting_feedback_order_id
                                       )
      WHERE id = phone_sess.id;

      DELETE FROM whatsapp_ai_sessions WHERE id = lid_sess.id;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Sanity: any session rows still keyed by a non-Nigerian phone? If so they're
-- LIDs that haven't been mapped yet — they'll auto-heal as senderPn arrives.
-- Run this read-only afterwards:
--   SELECT phone, LENGTH(phone) FROM whatsapp_ai_sessions
--   WHERE NOT (phone ~ '^234[0-9]{10}$')
--   ORDER BY last_activity DESC NULLS LAST LIMIT 50;
