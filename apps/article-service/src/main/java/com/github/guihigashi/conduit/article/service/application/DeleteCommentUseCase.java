package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.UUID;

@Service
public class DeleteCommentUseCase {

    private final CommentRepository commentRepository;

    public DeleteCommentUseCase(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public void execute(String articleSlug, Long commentId, UUID requestorId) {
        var comment = commentRepository.findById(commentId);

        if (!Objects.equals(comment.authorId(), requestorId)) {
            throw new SecurityException("User is not the author of the comment");
        }

        commentRepository.delete(articleSlug, commentId);
    }
}
