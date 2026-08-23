package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringDataCommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByArticleSlug(String slug);
}
