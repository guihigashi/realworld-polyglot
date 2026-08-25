package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.exception.ArticleNotFoundException;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.UUID;

@Service
public class DeleteCommentUseCase {

    private final ArticleRepository articleRepository;
    private final CommentRepository commentRepository;

    public DeleteCommentUseCase(
            ArticleRepository articleRepository,
            CommentRepository commentRepository) {
        this.articleRepository = articleRepository;
        this.commentRepository = commentRepository;
    }

    public void execute(String articleSlug, Long commentId, UUID requestorId) {
        if (!articleRepository.existsBySlug(articleSlug)) {
            throw new ArticleNotFoundException(articleSlug);
        }

        var comment = commentRepository.findById(commentId);

        if (!Objects.equals(comment.authorId(), requestorId)) {
            throw new SecurityException("User is not the author of the comment");
        }

        commentRepository.delete(articleSlug, commentId);
    }
}
