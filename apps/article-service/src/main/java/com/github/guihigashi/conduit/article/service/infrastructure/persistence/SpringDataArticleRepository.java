package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpringDataArticleRepository extends JpaRepository<ArticleEntity, UUID>, JpaSpecificationExecutor<ArticleEntity> {
    @EntityGraph(attributePaths = {"tagList", "favoritedBy"})
    Optional<ArticleEntity> findBySlug(String slug);

    void deleteBySlug(String slug);

    @Query("select distinct t.name from ArticleEntity a join a.tagList t")
    List<String> findAllDistinctTags();

    @Query("""
                SELECT DISTINCT new com.github.guihigashi.conduit.article.service.infrastructure.persistence.ArticleSummaryProjection(
                    a.id, a.slug, a.title, a.description, a.createdAt, a.updatedAt, a.authorId
                )
                FROM ArticleEntity a
                LEFT JOIN a.tagList t
                LEFT JOIN a.favoritedBy f
                WHERE (:tag IS NULL OR t.name = :tag)
                  AND (:authorId IS NULL OR a.authorId = :authorId)
                  AND (:favoritedById IS NULL OR f = :favoritedById)
            """)
    List<ArticleSummaryProjection> findArticleSummaries(
            @Param("tag") String tag,
            @Param("authorId") UUID authorId,
            @Param("favoritedById") UUID favoritedById,
            Pageable pageable
    );

    // Secondary fetch to hydrate tags for the current page
    @Query("""
            SELECT new com.github.guihigashi.conduit.article.service.infrastructure.persistence.TagForArticle(a.id, t.name)
            FROM ArticleEntity a JOIN a.tagList t WHERE a.id IN :articleIds
            """)
    List<TagForArticle> findTagsForArticles(@Param("articleIds") List<UUID> articleIds);

    // Secondary fetch to calculate favorites for the current page
    @Query("""
            SELECT new com.github.guihigashi.conduit.article.service.infrastructure.persistence.FavoriteForArticle(a.id, f)
            FROM ArticleEntity a JOIN a.favoritedBy f WHERE a.id IN :articleIds
            """)
    List<FavoriteForArticle> findFavoritesForArticles(@Param("articleIds") List<UUID> articleIds);
}
