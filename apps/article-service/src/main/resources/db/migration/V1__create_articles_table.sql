CREATE TABLE articles
(
    id          UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    slug        VARCHAR(255) UNIQUE NOT NULL,
    title       VARCHAR(255)        NOT NULL,
    description TEXT                NOT NULL,
    body        TEXT                NOT NULL,
    author_id   UUID                NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_slug ON articles (slug);
CREATE INDEX idx_articles_author_id ON articles (author_id);