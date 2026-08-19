package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SpringDataTagRepository extends JpaRepository<TagEntity, UUID> {
    Optional<TagEntity> findByName(String name);
}
