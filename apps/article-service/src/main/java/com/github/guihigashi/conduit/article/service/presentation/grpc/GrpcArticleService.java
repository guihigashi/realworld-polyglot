package com.github.guihigashi.conduit.article.service.presentation.grpc;

import com.github.guihigashi.conduit.article.grpc.*;
import com.github.guihigashi.conduit.article.service.application.CreateArticleUseCase;
import com.github.guihigashi.conduit.article.service.application.DeleteArticleUseCase;
import com.github.guihigashi.conduit.article.service.application.GetTagsUseCase;
import com.github.guihigashi.conduit.article.service.application.UpdateArticleUseCase;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.google.protobuf.Empty;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.grpc.server.service.GrpcService;

import java.util.List;
import java.util.UUID;

@GrpcService(interceptors = RequestorIdInterceptor.class)
public class GrpcArticleService extends ArticleServiceGrpc.ArticleServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(GrpcArticleService.class);

    private final CreateArticleUseCase createArticleUseCase;
    private final UpdateArticleUseCase updateArticleUseCase;
    private final DeleteArticleUseCase deleteArticleUseCase;
    private final GetTagsUseCase getTagsUseCase;
    private final ArticleRepository articleRepository;

    public GrpcArticleService(
            CreateArticleUseCase createArticleUseCase,
            UpdateArticleUseCase updateArticleUseCase,
            DeleteArticleUseCase deleteArticleUseCase,
            GetTagsUseCase getTagsUseCase,
            ArticleRepository articleRepository) {
        this.createArticleUseCase = createArticleUseCase;
        this.updateArticleUseCase = updateArticleUseCase;
        this.deleteArticleUseCase = deleteArticleUseCase;
        this.getTagsUseCase = getTagsUseCase;
        this.articleRepository = articleRepository;
    }

    @Override
    public void listArticles(ListArticlesRequest request, StreamObserver<ListArticlesResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();

            int limit = request.getLimit() > 0 ? request.getLimit() : 20;
            int offset = Math.max(request.getOffset(), 0);

            List<com.github.guihigashi.conduit.article.service.domain.Article> articles = articleRepository.findAllArticles(
                    request.hasTag() ? request.getTag() : null,
                    request.hasAuthorId() ? UUID.fromString(request.getAuthorId()) : null,
                    request.hasFavoritedById() ? UUID.fromString(request.getFavoritedById()) : null,
                    limit,
                    offset
            );

            ListArticlesResponse response = ListArticlesResponse.newBuilder()
                    .addAllArticles(
                            articles.stream()
                                    .map(ArticleGrpcMapper::toSummaryProto)
                                    .toList()
                    )
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Error processing ListArticles request", e);
            responseObserver.onError(Status.INTERNAL
                    .withDescription("An internal error occurred while listing articles: " + e.getMessage())
                    .withCause(e)
                    .asRuntimeException());
        }
    }

    @Override
    public void getArticle(SlugMessage request, StreamObserver<ArticleResponse> responseObserver) {
        if (request.getSlug().isBlank()) {
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription("Article slug cannot be empty")
                    .asRuntimeException());
            return;
        }

        try {
            articleRepository.findBySlug(request.getSlug())
                    .map(ArticleGrpcMapper::toProto)
                    .ifPresentOrElse(
                            article -> {
                                var response = ArticleResponse.newBuilder()
                                        .setArticle(article)
                                        .build();
                                responseObserver.onNext(response);
                                responseObserver.onCompleted();
                            },
                            () -> responseObserver.onError(Status.NOT_FOUND
                                    .withDescription("Article not found")
                                    .asRuntimeException())
                    );
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                    .withDescription("An internal error occurred while retrieving the article")
                    .withCause(e)
                    .asRuntimeException());
        }
    }

    @Override
    public void createArticle(CreateArticleRequest request, StreamObserver<ArticleResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            var article = createArticleUseCase.execute(
                    request.getTitle(),
                    request.getDescription(),
                    request.getBody(),
                    request.getTagListList(),
                    UUID.fromString(requestorId)
            );

            var response = ArticleResponse.newBuilder()
                    .setArticle(ArticleGrpcMapper.toProto(article))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (IllegalArgumentException e) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void updateArticle(UpdateArticleRequest request, StreamObserver<ArticleResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            var updatedArticle = updateArticleUseCase.execute(
                    request.getSlug(),
                    request.hasTitle() ? request.getTitle() : null,
                    request.hasDescription() ? request.getDescription() : null,
                    request.hasBody() ? request.getBody() : null,
                    request.hasTagList() ? request.getTagList().getTagsList() : null,
                    UUID.fromString(requestorId)
            );

            var response = ArticleResponse.newBuilder()
                    .setArticle(ArticleGrpcMapper.toProto(updatedArticle))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void deleteArticle(SlugMessage request, StreamObserver<Empty> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            deleteArticleUseCase.execute(
                    request.getSlug(),
                    UUID.fromString(requestorId)
            );

            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
        } catch (SecurityException e) {
            responseObserver.onError(Status.PERMISSION_DENIED.withDescription(e.getMessage()).asRuntimeException());
        } catch (IllegalArgumentException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void favoriteArticle(SlugMessage request, StreamObserver<ArticleResponse> responseObserver) {
        super.favoriteArticle(request, responseObserver);
    }

    @Override
    public void unfavoriteArticle(SlugMessage request, StreamObserver<ArticleResponse> responseObserver) {
        super.unfavoriteArticle(request, responseObserver);
    }

    @Override
    public void getTags(Empty request, StreamObserver<TagListMessage> responseObserver) {
        try {
            var tags = getTagsUseCase.execute();
            var response = TagListMessage.newBuilder()
                    .addAllTags(tags)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }
}
