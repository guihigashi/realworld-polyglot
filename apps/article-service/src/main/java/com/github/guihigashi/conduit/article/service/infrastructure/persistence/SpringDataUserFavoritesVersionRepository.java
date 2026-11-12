package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SpringDataUserFavoritesVersionRepository extends JpaRepository<UserFavoritesVersionEntity, UUID> {
}
