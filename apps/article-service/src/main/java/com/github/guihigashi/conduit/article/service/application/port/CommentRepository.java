package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.domain.Comment;

import java.util.List;

public interface CommentRepository {
    Comment save(String articleSlug, Comment comment);

    List<Comment> findByArticleSlug(String slug);

    Comment findById(Long id);

    void delete(String articleSlug, Long commentId);
}
