package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import com.github.guihigashi.conduit.article.service.domain.Comment;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AddCommentUseCase {

    private final CommentRepository commentRepository;

    public AddCommentUseCase(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public Comment execute(String slug, String body, UUID authorId) {
        var now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);

        var comment = new Comment(
                0L,
                now, now, body,
                authorId
        );

        var savedComment = commentRepository.save(slug, comment);

        return savedComment;
    }
}
