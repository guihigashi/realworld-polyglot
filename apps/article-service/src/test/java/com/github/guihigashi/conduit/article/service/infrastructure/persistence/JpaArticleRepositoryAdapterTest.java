package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JpaArticleRepositoryAdapterTest {

    @Mock
    private SpringDataArticleRepository articleRepository;

    @Mock
    private SpringDataTagRepository tagRepository;

    @Mock
    private SpringDataUserFavoritesVersionRepository userFavoritesVersionRepository;

    @InjectMocks
    private JpaArticleRepositoryAdapter adapter;

    @Test
    void findUserFavoritedArticlesDefaultsMissingVersionToZero() {
        UUID userId = UUID.randomUUID();
        when(articleRepository.findFavoritedArticleIdsByUserId(userId)).thenReturn(List.of());
        when(userFavoritesVersionRepository.findById(userId)).thenReturn(Optional.empty());

        var result = adapter.findUserFavoritedArticles(userId);

        assertThat(result.articleIds()).isEmpty();
        assertThat(result.favoritesVersion()).isZero();
    }

    @Test
    void firstFavoriteProducesVersionOneGreaterThanInitialZero() {
        UUID userId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID articleId = UUID.randomUUID();
        String slug = "test-article-123";

        ArticleEntity entity = new ArticleEntity();
        entity.setId(articleId);
        entity.setSlug(slug);
        entity.setTitle("Test Article");
        entity.setDescription("Desc");
        entity.setBody("Body");
        entity.setAuthorId(authorId);
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());

        when(articleRepository.findBySlug(slug)).thenReturn(Optional.of(entity));
        when(articleRepository.save(entity)).thenReturn(entity);
        when(userFavoritesVersionRepository.findById(userId)).thenReturn(Optional.empty());
        when(userFavoritesVersionRepository.saveAndFlush(any(UserFavoritesVersionEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var favResult = adapter.favoriteArticle(slug, userId);

        assertThat(favResult.changed()).isTrue();
        assertThat(favResult.favoritesVersion()).isEqualTo(1L);
        assertThat(favResult.article().favorited()).isTrue();
        assertThat(favResult.article().favoritesCount()).isEqualTo(1);
    }

    @Test
    void subsequentUnfavoriteIncrementsExistingVersion() {
        UUID userId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID articleId = UUID.randomUUID();
        String slug = "test-article-123";

        ArticleEntity entity = new ArticleEntity();
        entity.setId(articleId);
        entity.setSlug(slug);
        entity.setTitle("Test Article");
        entity.setDescription("Desc");
        entity.setBody("Body");
        entity.setAuthorId(authorId);
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.addFavorite(userId);

        when(articleRepository.findBySlug(slug)).thenReturn(Optional.of(entity));
        when(articleRepository.save(entity)).thenReturn(entity);
        when(userFavoritesVersionRepository.findById(userId))
                .thenReturn(Optional.of(new UserFavoritesVersionEntity(userId, 1L)));
        when(userFavoritesVersionRepository.saveAndFlush(any(UserFavoritesVersionEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var unfavResult = adapter.unfavoriteArticle(slug, userId);

        assertThat(unfavResult.changed()).isTrue();
        assertThat(unfavResult.favoritesVersion()).isEqualTo(2L);
        assertThat(unfavResult.article().favorited()).isFalse();
        assertThat(unfavResult.article().favoritesCount()).isZero();
    }
}
