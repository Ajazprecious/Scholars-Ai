CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL, email varchar(254) NOT NULL UNIQUE,
 password_hash text, google_sub text UNIQUE, role varchar(20) NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
 email_verified boolean NOT NULL DEFAULT false, avatar_url text, voice_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS refresh_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS refresh_sessions_user_idx ON refresh_sessions(user_id);
CREATE TABLE IF NOT EXISTS email_verification_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS password_reset_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL, subject text, original_filename text NOT NULL, file_type varchar(10) NOT NULL CHECK(file_type IN ('pdf','docx','pptx','txt','jpg','jpeg','png','webp')),
 storage_key text NOT NULL, file_size bigint NOT NULL DEFAULT 0, extracted_text text, status varchar(20) NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','processing','ready','error')),
 total_sections integer NOT NULL DEFAULT 0, sections_completed integer NOT NULL DEFAULT 0, completion_percentage numeric(5,2) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS sections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 heading_title text NOT NULL, order_index integer NOT NULL, raw_content text, simplified_summary text, key_concepts text, related_materials text,
 exam_tips text, real_world_context text, diagram_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','generated','completed')),
 easy_quiz_generated boolean NOT NULL DEFAULT false, advanced_quiz_generated boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id,order_index)
);
CREATE TABLE IF NOT EXISTS quizzes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
 document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE, difficulty varchar(12) NOT NULL CHECK(difficulty IN ('easy','advanced')),
 questions jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(section_id,difficulty)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE, document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE, difficulty varchar(12) NOT NULL CHECK(difficulty IN ('easy','advanced')),
 answers jsonb NOT NULL, score numeric(6,2) NOT NULL, total_questions integer NOT NULL, passed boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_document_idx ON quiz_attempts(user_id,document_id,created_at DESC);
CREATE TABLE IF NOT EXISTS learning_progress (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE, section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
 last_position jsonb NOT NULL DEFAULT '{}'::jsonb, last_opened_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,section_id)
);
CREATE TABLE IF NOT EXISTS tutor_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 document_id uuid REFERENCES documents(id) ON DELETE SET NULL, section_id uuid REFERENCES sections(id) ON DELETE SET NULL,
 title text, mode varchar(20) NOT NULL DEFAULT 'text' CHECK(mode IN ('text','voice','realtime')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tutor_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
 role varchar(20) NOT NULL CHECK(role IN ('user','assistant','system')), content text NOT NULL, audio_storage_key text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON quiz_attempts(user_id,created_at DESC);

ALTER TABLE sections ADD COLUMN IF NOT EXISTS diagram_mermaid text;
