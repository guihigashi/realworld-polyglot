package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import com.github.guihigashi.conduit.article.service.domain.Comment;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetCommentsUseCase {
    private final CommentRepository commentRepository;

    public GetCommentsUseCase(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public List<Comment> execute(String slug) {
        return commentRepository.findByArticleSlug(slug);
    }
}
