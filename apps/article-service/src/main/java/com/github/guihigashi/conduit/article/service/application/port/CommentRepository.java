package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.domain.Comment;
import com.github.guihigashi.conduit.article.service.infrastructure.persistence.CommentEntity;

public interface CommentRepository {
    Comment save(String articleSlug, Comment comment);
}
