package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import com.github.guihigashi.conduit.article.service.domain.Comment;
import org.springframework.stereotype.Repository;

import java.util.List;

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

        CommentEntity commentEntity = new CommentEntity();
        commentEntity.setArticle(article);
        commentEntity.setAuthorId(comment.authorId());
        commentEntity.setBody(comment.body());
        commentEntity.setCreatedAt(comment.createdAt());
        commentEntity.setUpdatedAt(comment.updatedAt());

        CommentEntity savedCommentEntity = commentRepository.save(commentEntity);

        return new Comment(
                savedCommentEntity.getId(),
                savedCommentEntity.getCreatedAt(),
                savedCommentEntity.getUpdatedAt(),
                savedCommentEntity.getBody(),
                savedCommentEntity.getAuthorId()
        );
    }

    @Override
    public List<Comment> findByArticleSlug(String slug) {
        var commentEntities = commentRepository.findByArticleSlug(slug);

        return commentEntities.stream()
                .map(ce -> new Comment(
                        ce.getId(),
                        ce.getCreatedAt(),
                        ce.getUpdatedAt(),
                        ce.getBody(),
                        ce.getAuthorId()
                ))
                .toList();
    }

    @Override
    public Comment findById(Long id) {
        var comment = commentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        return new Comment(
                comment.getId(),
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                comment.getBody(),
                comment.getAuthorId()
        );
    }

    @Override
    public void delete(String articleSlug, Long commentId) {
        commentRepository.deleteById(commentId);
    }
}
