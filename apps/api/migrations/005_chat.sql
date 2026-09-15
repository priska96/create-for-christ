-- Conversations are the existing collaborations: every match has exactly one chat,
-- including matches created before this migration.
ALTER TABLE messages ADD COLUMN sequence bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE messages ADD COLUMN client_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX messages_sequence ON messages(sequence);
CREATE UNIQUE INDEX messages_retry ON messages(collaboration_id,sender_id,client_id);
CREATE INDEX messages_chat_page ON messages(collaboration_id,sequence DESC);
CREATE TABLE conversation_reads (
  collaboration_id uuid NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  through_sequence bigint NOT NULL CHECK (through_sequence > 0),
  PRIMARY KEY(collaboration_id,profile_id)
);
