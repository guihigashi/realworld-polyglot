package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpringDataArticleRepository extends JpaRepository<ArticleEntity, UUID>, JpaSpecificationExecutor<ArticleEntity> {
    @EntityGraph(attributePaths = {"tags", "favoritedByUsers"})
    Optional<ArticleEntity> findBySlug(String slug);

    void deleteBySlug(String slug);

    @Query("select distinct t.name from ArticleEntity a join a.tags t")
    List<String> findAllDistinctTags();
}
