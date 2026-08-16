CREATE TABLE tags
(
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE article_tags
(
    article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE comments
(
    id         UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    body       TEXT NOT NULL,
    article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    author_id  UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE favorites
(
    article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    PRIMARY KEY (article_id, user_id)
);

CREATE INDEX idx_article_tags_article_id ON article_tags (article_id);
CREATE INDEX idx_comments_article_id ON comments (article_id);
CREATE INDEX idx_favorites_user_id ON favorites (user_id);