package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataCommentRepository extends JpaRepository<CommentEntity, Long> {
}
