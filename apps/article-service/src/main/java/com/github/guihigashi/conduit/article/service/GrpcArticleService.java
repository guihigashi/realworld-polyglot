package com.github.guihigashi.conduit.article.service;

import com.github.guihigashi.conduit.article.grpc.Article;
import com.github.guihigashi.conduit.article.grpc.ArticleResponse;
import com.github.guihigashi.conduit.article.grpc.ArticleServiceGrpc;
import com.github.guihigashi.conduit.article.grpc.GetArticleRequest;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.grpc.server.service.GrpcService;

import java.time.Instant;

@GrpcService
public class GrpcArticleService extends ArticleServiceGrpc.ArticleServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(GrpcArticleService.class);

    @Override
    public void getArticle(GetArticleRequest request, StreamObserver<ArticleResponse> responseObserver) {
        log.info("GetArticle request received - Slug: {}, Requestor: {}",
                request.getSlug(), request.getRequestorId());

        Article article = Article.newBuilder()
                .setSlug(request.getSlug())
                .setTitle("Scaffolding a Spring Boot Microservice")
                .setDescription("A quick guide to Spring and gRPC")
                .setBody("This is the full body of the mock article served by Spring Boot...")
                .addTagList("spring")
                .addTagList("java")
                .addTagList("grpc")
                .setCreatedAt(Instant.now().toString())
                .setUpdatedAt(Instant.now().toString())
                .setFavorited(false)
                .setFavoritesCount(128)
                .setAuthorUsername("jane_doe")
                .setAuthorBio("Java enthusiast")
                .setAuthorImage("https://api.realworld.io/images/demo-avatar.png")
                .setAuthorFollowing(false)
                .build();

        ArticleResponse response = ArticleResponse.newBuilder()
                .setArticle(article)
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
