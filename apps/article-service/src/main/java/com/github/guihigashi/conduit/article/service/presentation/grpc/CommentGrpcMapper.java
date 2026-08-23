package com.github.guihigashi.conduit.article.service.presentation.grpc;

import com.github.guihigashi.conduit.article.grpc.Comment;

import java.time.format.DateTimeFormatter;

public class CommentGrpcMapper {
    public static Comment toProto(com.github.guihigashi.conduit.article.service.domain.Comment domain) {
        return Comment.newBuilder()
                .setId(domain.id())
                .setCreatedAt(domain.createdAt().format(DateTimeFormatter.ISO_INSTANT))
                .setUpdatedAt(domain.updatedAt().format(DateTimeFormatter.ISO_INSTANT))
                .setBody(domain.body())
                .setAuthorId(domain.authorId().toString())
                .build();
    }
}
