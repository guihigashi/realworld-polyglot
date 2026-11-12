ALTER TABLE articles
    ADD COLUMN version BIGINT NOT NULL DEFAULT 1;

CREATE TABLE user_favorites_version
(
    user_id UUID PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 1
);
