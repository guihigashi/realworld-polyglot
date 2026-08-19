package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

@Repository
public class JpaArticleRepositoryAdapter implements ArticleRepository {

    private final SpringDataArticleRepository jpaRepository;
    private final SpringDataTagRepository tagRepository;

    public JpaArticleRepositoryAdapter(SpringDataArticleRepository jpaRepository, SpringDataTagRepository tagRepository) {
        this.jpaRepository = jpaRepository;
        this.tagRepository = tagRepository;
    }

    @Override
    @Transactional
    public Article save(Article article) {
        ArticleEntity entity = (article.id() != null)
                ? jpaRepository.findById(article.id()).orElseGet(ArticleEntity::new)
                : new ArticleEntity();

        entity.setSlug(article.slug());
        entity.setTitle(article.title());
        entity.setDescription(article.description());
        entity.setBody(article.body());
        entity.setAuthorId(article.authorId());

        if (entity.getTags() == null) {
            entity.setTags(new HashSet<>());
        } else {
            entity.getTags().clear();
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
                entity.getTags().add(tagEntity);
            }
        }

        entity.setCreatedAt(article.createdAt());
        entity.setUpdatedAt(article.updatedAt());

        var saved = jpaRepository.save(entity);
        return mapToDomain(saved, article.authorId().toString());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Optional<Article> findBySlug(String slug) {
        return jpaRepository.findBySlug(slug).map(articleEntity -> mapToDomain(articleEntity, null));
    }

    @Override
    public List<Article> findAllArticles(String tag, String author, String favoritedBy, int limit, int offset) {
        Specification<ArticleEntity> spec = ((root, query, cb) -> {

            if (Long.class != query.getResultType()) {
                root.fetch("tags", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("favoritedByUsers", jakarta.persistence.criteria.JoinType.LEFT);
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            if (tag != null && !tag.isBlank()) {
                predicates.add(cb.equal(root.join("tags", JoinType.LEFT).get("name"), tag));
            }
            if (author != null && !author.isBlank()) {
                predicates.add(cb.equal(root.get("authorId"), UUID.fromString(author)));
            }
            if (favoritedBy != null && !favoritedBy.isBlank()) {
                predicates.add(cb.isMember(UUID.fromString(favoritedBy), root.get("favoritedByUsers")));
            }


            return cb.and(predicates.toArray(new Predicate[0]));
        });

        Pageable pageable = new OffsetPageRequest(offset, limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        return jpaRepository.findAll(spec, pageable)
                .stream()
                .map(articleEntity -> mapToDomain(articleEntity, null))
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public void deleteBySlug(String slug) {
        jpaRepository.deleteBySlug(slug);

    }

    @Override
    public List<String> findAllTags() {
        return jpaRepository.findAllDistinctTags();
    }

    @Override
    @Transactional
    public Article favoriteArticle(String slug, String requestorId) {
        ArticleEntity entity = jpaRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Article not found"));

        entity.addFavorite(UUID.fromString(requestorId));

        var saved = jpaRepository.save(entity);
        return mapToDomain(saved, requestorId);
    }

    @Override
    @Transactional
    public Article unfavoriteArticle(String slug, String requestorId) {
        ArticleEntity entity = jpaRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Article not found"));

        entity.removeFavorite(UUID.fromString(requestorId));

        var saved = jpaRepository.save(entity);
        return mapToDomain(saved, requestorId);
    }

    private Article mapToDomain(ArticleEntity entity, String currentUserId) {
        boolean isFavorited = currentUserId != null &&
                entity.getFavoritedByUsers().contains(UUID.fromString(currentUserId));
        return new Article(
                entity.getId(),
                entity.getSlug(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getBody(),
                entity.getTags() != null
                        ? entity.getTags().stream().map(TagEntity::getName).collect(Collectors.toList())
                        : Collections.emptyList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                isFavorited,
                entity.getFavoritedByUsers().size(),
                entity.getAuthorId()
        );
    }

    private record OffsetPageRequest(long offset, int limit, Sort sort) implements Pageable {
        @Override
        public int getPageNumber() {
            return (int) (offset / limit);
        }

        @Override
        public int getPageSize() {
            return limit;
        }

        @Override
        public long getOffset() {
            return offset;
        }

        @Override
        public Sort getSort() {
            return sort;
        }

        @Override
        public Pageable next() {
            return new OffsetPageRequest(offset + limit, limit, sort);
        }

        @Override
        public Pageable previousOrFirst() {
            return hasPrevious() ? new OffsetPageRequest(offset - limit, limit, sort) : this;
        }

        @Override
        public Pageable first() {
            return new OffsetPageRequest(0, limit, sort);
        }

        @Override
        public Pageable withPage(int pageNumber) {
            return new OffsetPageRequest((long) pageNumber * limit, limit, sort);
        }

        @Override
        public boolean hasPrevious() {
            return offset >= limit;
        }
    }
}
