package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

@Repository
public class JpaArticleRepositoryAdapter implements ArticleRepository {

    private final SpringDataArticleRepository articleRepository;
    private final SpringDataTagRepository tagRepository;

    public JpaArticleRepositoryAdapter(SpringDataArticleRepository articleRepository, SpringDataTagRepository tagRepository) {
        this.articleRepository = articleRepository;
        this.tagRepository = tagRepository;
    }

    @Override
    @Transactional
    public Article save(Article article) {
        ArticleEntity entity = (article.id() != null)
                ? articleRepository.findById(article.id()).orElseGet(ArticleEntity::new)
                : new ArticleEntity();

        entity.setSlug(article.slug());
        entity.setTitle(article.title());
        entity.setDescription(article.description());
        entity.setBody(article.body());
        entity.setAuthorId(article.authorId());

        if (entity.getTagList() == null) {
            entity.setTagList(new HashSet<>());
        } else {
            entity.getTagList().clear();
        }

        if (article.tagList() != null) {
            for (String tagName : article.tagList()) {
                TagEntity tagEntity = tagRepository.findByName(tagName)
                        .orElseGet(() -> {
                            TagEntity newTag = new TagEntity();
                            // Omitted explicit UUID.randomUUID() assignment.
                            // Assigning an ID manually forces Spring Data JPA into a `merge`
                            // state for a non-existent record, causing the optimistic locking failure.
                            newTag.setName(tagName);
                            return tagRepository.save(newTag);
                        });
                entity.getTagList().add(tagEntity);
            }
        }

        entity.setCreatedAt(article.createdAt());
        entity.setUpdatedAt(article.updatedAt());

        var saved = articleRepository.save(entity);
        return mapToDomain(saved, article.authorId());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Optional<Article> findBySlug(String slug, UUID requestorId) {
        return articleRepository.findBySlug(slug).map(articleEntity -> mapToDomain(articleEntity, requestorId));
    }

    @Override
    public List<Article> findAllArticles(String tag, UUID authorId, UUID favoritedById, int limit, int offset) {
        Pageable pageable = PageRequest.of(offset / limit, limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        List<ArticleSummaryProjection> projections = articleRepository.findArticleSummaries(
                tag, authorId, favoritedById, pageable
        );

        if (projections.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> articleIds = projections.stream().map(ArticleSummaryProjection::id).toList();

        Map<UUID, List<String>> tagsByArticle = articleRepository.findTagsForArticles(articleIds).stream()
                .collect(Collectors.groupingBy(
                        TagForArticle::articleId,
                        Collectors.mapping(TagForArticle::tag, Collectors.toList())
                ));

        Map<UUID, Set<UUID>> favoritesByArticle = articleRepository.findFavoritesForArticles(articleIds).stream()
                .collect(Collectors.groupingBy(
                        FavoriteForArticle::articleId,
                        Collectors.mapping(FavoriteForArticle::userId, Collectors.toSet())
                ));

        // 3. Map safely across the Use Case boundary
        return projections.stream()
                .map(projection -> mapToDomain(
                        projection,
                        tagsByArticle.getOrDefault(projection.id(), Collections.emptyList()),
                        favoritesByArticle.getOrDefault(projection.id(), Collections.emptySet()),
                        null // currentUserId if contextually available
                ))
                .toList();
    }

    @Override
    public void deleteBySlug(String slug) {
        articleRepository.deleteBySlug(slug);

    }

    @Override
    public List<String> findAllTags() {
        return articleRepository.findAllDistinctTags();
    }

    @Override
    @Transactional
    public Article favoriteArticle(String slug, UUID requestorId) {
        ArticleEntity entity = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Article not found"));

        entity.addFavorite(requestorId);

        var saved = articleRepository.save(entity);
        return mapToDomain(saved, requestorId);
    }

    @Override
    @Transactional
    public Article unfavoriteArticle(String slug, UUID requestorId) {
        ArticleEntity entity = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Article not found"));

        entity.removeFavorite(requestorId);

        var saved = articleRepository.save(entity);
        return mapToDomain(saved, requestorId);
    }

    private Article mapToDomain(ArticleEntity entity, UUID currentUserId) {
        boolean isFavorited = currentUserId != null &&
                entity.getFavoritedBy().contains(currentUserId);

        return new Article(
                entity.getId(),
                entity.getSlug(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getBody(),
                entity.getTagList() != null
                        ? entity.getTagList().stream().map(TagEntity::getName).collect(Collectors.toList())
                        : Collections.emptyList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                isFavorited,
                entity.getFavoritedBy().size(),
                entity.getAuthorId()
        );
    }

    private Article mapToDomain(ArticleSummaryProjection projection, List<String> tags, Set<UUID> favoritedBy, String currentUserId) {
        boolean isFavorited = currentUserId != null && favoritedBy.contains(UUID.fromString(currentUserId));

        return new Article(
                projection.id(),
                projection.slug(),
                projection.title(),
                projection.description(),
                "", // Body is successfully omitted at the database level
                tags,
                projection.createdAt(),
                projection.updatedAt(),
                isFavorited,
                favoritedBy.size(),
                projection.authorId()
        );
    }
}
