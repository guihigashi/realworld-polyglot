package com.github.guihigashi.conduit.article.service.presentation.grpc;

import com.github.guihigashi.conduit.article.grpc.*;
import com.github.guihigashi.conduit.article.service.application.*;
import com.github.guihigashi.conduit.article.service.application.exception.ArticleNotFoundException;
import com.github.guihigashi.conduit.article.service.application.exception.CommentNotFoundException;
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

    private final ListArticlesUseCase listArticlesUseCase;
    private final GetArticleUseCase getArticleUseCase;
    private final CreateArticleUseCase createArticleUseCase;
    private final UpdateArticleUseCase updateArticleUseCase;
    private final DeleteArticleUseCase deleteArticleUseCase;
    private final GetTagsUseCase getTagsUseCase;
    private final AddCommentUseCase addCommentUseCase;
    private final GetCommentsUseCase getCommentsUseCase;
    private final DeleteCommentUseCase deleteCommentUseCase;
    private final FavoriteArticleUseCase favoriteArticleUseCase;
    private final UnfavoriteArticleUseCase unfavoriteArticleUseCase;
    private final GetArticlesFeedUseCase getArticlesFeedUseCase;
    private final UserFavoritedArticlesUseCase userFavoritedArticlesUseCase;

    public GrpcArticleService(
            ListArticlesUseCase listArticlesUseCase,
            GetArticleUseCase getArticleUseCase,
            CreateArticleUseCase createArticleUseCase,
            UpdateArticleUseCase updateArticleUseCase,
            DeleteArticleUseCase deleteArticleUseCase,
            GetTagsUseCase getTagsUseCase,
            AddCommentUseCase addCommentUseCase,
            GetCommentsUseCase getCommentsUseCase,
            DeleteCommentUseCase deleteCommentUseCase,
            FavoriteArticleUseCase favoriteArticleUseCase,
            UnfavoriteArticleUseCase unfavoriteArticleUseCase,
            GetArticlesFeedUseCase getArticlesFeedUseCase,
            UserFavoritedArticlesUseCase userFavoritedArticlesUseCase) {
        this.listArticlesUseCase = listArticlesUseCase;
        this.getArticleUseCase = getArticleUseCase;
        this.createArticleUseCase = createArticleUseCase;
        this.updateArticleUseCase = updateArticleUseCase;
        this.deleteArticleUseCase = deleteArticleUseCase;
        this.getTagsUseCase = getTagsUseCase;
        this.addCommentUseCase = addCommentUseCase;
        this.getCommentsUseCase = getCommentsUseCase;
        this.deleteCommentUseCase = deleteCommentUseCase;
        this.favoriteArticleUseCase = favoriteArticleUseCase;
        this.unfavoriteArticleUseCase = unfavoriteArticleUseCase;
        this.getArticlesFeedUseCase = getArticlesFeedUseCase;
        this.userFavoritedArticlesUseCase = userFavoritedArticlesUseCase;
    }

    @Override
    public void listArticles(ListArticlesRequest request, StreamObserver<ListArticlesResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();

            int limit = request.getLimit() > 0 ? request.getLimit() : 20;
            int offset = Math.max(request.getOffset(), 0);

            var paginatedArticles = listArticlesUseCase.execute(
                    request.hasTag() ? request.getTag() : null,
                    request.hasAuthorId() ? UUID.fromString(request.getAuthorId()) : null,
                    request.hasFavoritedById() ? UUID.fromString(request.getFavoritedById()) : null,
                    limit,
                    offset,
                    parseUuidOrNull(requestorId)
            );

            ListArticlesResponse response = ListArticlesResponse.newBuilder()
                    .addAllArticles(
                            paginatedArticles.articles().stream()
                                    .map(ArticleGrpcMapper::toSummaryProto)
                                    .toList()
                    )
                    .setTotalCount(paginatedArticles.articlesCount())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void getArticle(GetArticleRequest request, StreamObserver<ArticleResponse> responseObserver) {
        String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();

        try {
            var article = getArticleUseCase.execute(request.getSlug(), parseUuidOrNull(requestorId));

            var response = ArticleResponse.newBuilder()
                    .setArticle(ArticleGrpcMapper.toProto(article))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
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
        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (SecurityException e) {
            responseObserver.onError(Status.PERMISSION_DENIED.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void deleteArticle(DeleteArticleRequest request, StreamObserver<Empty> responseObserver) {
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
        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (SecurityException e) {
            responseObserver.onError(Status.PERMISSION_DENIED.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void addComment(AddCommentRequest request, StreamObserver<AddCommentResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            var comment = addCommentUseCase.execute(request.getSlug(), request.getBody(), UUID.fromString(requestorId));

            responseObserver.onNext(AddCommentResponse.newBuilder()
                    .setComment(CommentGrpcMapper.toProto(comment))
                    .build());
            responseObserver.onCompleted();

        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void getComments(GetCommentsRequest request, StreamObserver<GetCommentsResponse> responseObserver) {
        String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();

        try {
            var comments = getCommentsUseCase.execute(request.getSlug());
            var response = GetCommentsResponse.newBuilder()
                    .addAllComments(comments.stream().map(CommentGrpcMapper::toProto).toList())
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void deleteComment(DeleteCommentRequest request, StreamObserver<Empty> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            deleteCommentUseCase.execute(request.getSlug(), request.getId(), UUID.fromString(requestorId));
            responseObserver.onNext(Empty.newBuilder().build());
            responseObserver.onCompleted();
        } catch (ArticleNotFoundException | CommentNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (SecurityException e) {
            responseObserver.onError(Status.PERMISSION_DENIED.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void favoriteArticle(FavoriteArticleRequest request, StreamObserver<ArticleResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            var article = favoriteArticleUseCase.execute(request.getSlug(), UUID.fromString(requestorId));

            var response = ArticleResponse.newBuilder()
                    .setArticle(ArticleGrpcMapper.toProto(article))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void unfavoriteArticle(UnfavoriteArticleRequest request, StreamObserver<ArticleResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            var article = unfavoriteArticleUseCase.execute(request.getSlug(), UUID.fromString(requestorId));

            var response = ArticleResponse.newBuilder()
                    .setArticle(ArticleGrpcMapper.toProto(article))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (ArticleNotFoundException e) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void getTags(Empty request, StreamObserver<GetTagsResponse> responseObserver) {
        try {
            var tags = getTagsUseCase.execute();
            var response = GetTagsResponse.newBuilder()
                    .addAllTags(tags.stream().sorted().toList())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void getArticlesFeed(GetArticlesFeedRequest request, StreamObserver<ListArticlesResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            int limit = request.getLimit() > 0 ? request.getLimit() : 20;
            int offset = Math.max(request.getOffset(), 0);

            var paginatedArticles = getArticlesFeedUseCase.execute(
                    request.getFollowingIdsList().stream().map(UUID::fromString).toList(),
                    limit,
                    offset,
                    UUID.fromString(requestorId)
            );

            ListArticlesResponse response = ListArticlesResponse.newBuilder()
                    .addAllArticles(
                            paginatedArticles.articles().stream()
                                    .map(ArticleGrpcMapper::toSummaryProto)
                                    .toList()
                    )
                    .setTotalCount(paginatedArticles.articlesCount())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void userFavoritedArticles(Empty request, StreamObserver<UserFavoritedArticlesResponse> responseObserver) {
        try {
            String requestorId = RequestorIdInterceptor.REQUESTOR_ID_CONTEXT_KEY.get();
            if (requestorId == null) {
                responseObserver.onError(Status.UNAUTHENTICATED.asRuntimeException());
                return;
            }

            List<UUID> articlesIds = userFavoritedArticlesUseCase.execute(UUID.fromString(requestorId));

            UserFavoritedArticlesResponse response = UserFavoritedArticlesResponse.newBuilder()
                    .addAllArticlesIds(
                            articlesIds.stream()
                                    .map(UUID::toString)
                                    .toList()
                    )
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    private UUID parseUuidOrNull(String id) {
        if (id == null || id.trim().isEmpty()) {
            return null;
        }

        return UUID.fromString(id);
    }
}
