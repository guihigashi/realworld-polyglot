import { Module } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { join } from "node:path"
import { AddCommentUseCase } from "@/application/article/use-cases/add-comment.use-case.js"
import { CreateArticleUseCase } from "@/application/article/use-cases/create-article.use-case.js"
import { DeleteArticleUseCase } from "@/application/article/use-cases/delete-article.use-case.js"
import { DeleteCommentUseCase } from "@/application/article/use-cases/delete-comment.use-case.js"
import { FavoriteArticleUseCase } from "@/application/article/use-cases/favorite-article.use-case.js"
import { GetArticleUseCase } from "@/application/article/use-cases/get-article.use-case.js"
import { GetCommentsUseCase } from "@/application/article/use-cases/get-comments.use-case.js"
import { GetTagsUseCase } from "@/application/article/use-cases/get-tags.use-case.js"
import { ListArticlesUseCase } from "@/application/article/use-cases/list-articles.use-case.js"
import { UnfavoriteArticleUseCase } from "@/application/article/use-cases/unfavorite-article.use-case.js"
import { UpdateArticleUseCase } from "@/application/article/use-cases/update-article.use-case.js"
import { AuthModule } from "@/auth.module.js"
import { grpcConfig } from "@/config/configuration.js"
import { ARTICLE_SERVICE } from "@/domain/article/contracts/article.service.js"
import { FeedModule } from "@/feed.module.js"
import { COM_GITHUB_GUIHIGASHI_CONDUIT_ARTICLE_PACKAGE_NAME } from "@/generated/grpc/article.js"
import { ARTICLE_GRPC_CLIENT, GrpcArticleService } from "@/infrastructure/article/grpc-article.service.js"
import { DEFAULT_GRPC_CHANNEL_OPTIONS } from "@/infrastructure/grpc/grpc-channel-options.js"
import { SocialGraphModule } from "@/infrastructure/profile/social-graph.module.js"
import { ArticleController } from "@/presentation/http/controllers/article.controller.js"
import { CommentController } from "@/presentation/http/controllers/comment.controller.js"
import { FavoriteController } from "@/presentation/http/controllers/favorite.controller.js"
import { TagController } from "@/presentation/http/controllers/tag.controller.js"

@Module({
  imports: [
    AuthModule,
    SocialGraphModule,
    FeedModule,
    ClientsModule.registerAsync([
      {
        name: ARTICLE_GRPC_CLIENT,
        inject: [grpcConfig.KEY],
        useFactory: (grpcCfg: ConfigType<typeof grpcConfig>) => ({
          transport: Transport.GRPC,
          options: {
            url: grpcCfg.articleServiceTarget,
            package: COM_GITHUB_GUIHIGASHI_CONDUIT_ARTICLE_PACKAGE_NAME,
            protoPath: join(import.meta.dirname, "proto/article.proto"),
            channelOptions: DEFAULT_GRPC_CHANNEL_OPTIONS,
          },
        }),
      },
    ]),
  ],
  controllers: [ArticleController, CommentController, FavoriteController, TagController],
  providers: [
    GrpcArticleService,
    { provide: ARTICLE_SERVICE, useExisting: GrpcArticleService },
    ListArticlesUseCase,
    GetArticleUseCase,
    CreateArticleUseCase,
    UpdateArticleUseCase,
    DeleteArticleUseCase,
    AddCommentUseCase,
    GetCommentsUseCase,
    DeleteCommentUseCase,
    FavoriteArticleUseCase,
    UnfavoriteArticleUseCase,
    GetTagsUseCase,
  ],
})
export class ArticleModule {}
