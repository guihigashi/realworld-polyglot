CREATE TABLE profiles
(
    user_id    UUID PRIMARY KEY,
    username   VARCHAR UNIQUE NOT NULL,
    bio        TEXT,
    image      VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_username ON profiles (username);