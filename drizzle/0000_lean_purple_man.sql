-- ==========================================
-- 0. SETUP & EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Required for 'geography' type

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('master');

-- ==========================================
-- 2. AUTHENTICATION (NextAuth + Custom)
-- ==========================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  email_verified TIMESTAMP,
  password_hash VARCHAR(255),
  role user_role DEFAULT 'master',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  -- Relationship defined in input
  CONSTRAINT fk_reset_email FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Compound unique index for accounts
CREATE UNIQUE INDEX idx_accounts_provider_compound 
ON accounts(provider, provider_account_id);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  expires TIMESTAMP NOT NULL,
  
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ==========================================
-- 3. MASTER PROFILES & LOGISTICS
-- ==========================================

CREATE TABLE master_profiles (
  user_id UUID PRIMARY KEY, -- 1:1 Relationship (PK is also FK)
  business_name VARCHAR(255) NOT NULL,
  bio VARCHAR(255),
  avatar_url TEXT,
  
  -- Location
  address_text VARCHAR(255),
  city VARCHAR(255),
  zip_code VARCHAR(20),
  -- Geography type (assuming Point coordinates SRID 4326)
  location GEOGRAPHY(POINT, 4326), 

  -- Contact
  phone_country_code VARCHAR(10) DEFAULT '+1',
  phone_number VARCHAR(50) NOT NULL,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 4. PORTFOLIO & TAGS
-- ==========================================

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  name_translations JSONB NOT NULL, -- Stores {'en': 'Shape', 'pl': 'Kształt'}
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL,
  slug VARCHAR(255) NOT NULL,
  name_translations JSONB NOT NULL,
  
  CONSTRAINT fk_tags_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Unique index per category
CREATE UNIQUE INDEX idx_tags_category_slug ON tags(category_id, slug);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID,
  image_url TEXT NOT NULL,
  price INTEGER,
  currency VARCHAR(10) DEFAULT 'PLN',
  duration_minutes INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Linking to master_profiles (which shares ID with users)
  CONSTRAINT fk_posts_master FOREIGN KEY (master_id) REFERENCES master_profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE post_tags (
  post_id UUID NOT NULL,
  tag_id INTEGER NOT NULL,
  
  PRIMARY KEY (post_id, tag_id),
  
  CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ==========================================
-- 5. OPTIONAL: AUTOMATIC TIMESTAMP UPDATES
-- ==========================================

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_profiles_updated_at
    BEFORE UPDATE ON master_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();