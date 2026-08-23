package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import com.github.guihigashi.conduit.article.service.domain.Comment;
import org.springframework.stereotype.Repository;

@Repository
public class JpaCommentRepositoryAdapter implements CommentRepository {
    private final SpringDataArticleRepository articleRepository;
    private final SpringDataCommentRepository commentRepository;

    public JpaCommentRepositoryAdapter(
            SpringDataArticleRepository articleRepository,
            SpringDataCommentRepository commentRepository
    ) {
        this.articleRepository = articleRepository;
        this.commentRepository = commentRepository;
    }

    @Override
    public Comment save(String articleSlug, Comment comment) {
        ArticleEntity article = articleRepository.findBySlug(articleSlug)
                .orElseThrow(() -> new IllegalArgumentException("Article not found"));

        CommentEntity ce = new CommentEntity();
        ce.setArticle(article);
        ce.setAuthorId(comment.authorId());
        ce.setBody(comment.body());
        ce.setCreatedAt(comment.createdAt());
        ce.setUpdatedAt(comment.updatedAt());

        CommentEntity sce = commentRepository.save(ce);

        return new Comment(
                sce.getId(),
                sce.getCreatedAt(), sce.getUpdatedAt(), sce.getBody(),
                sce.getAuthorId()
        );
    }
}
