package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "user_favorites_version")
public class UserFavoritesVersionEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "version", nullable = false)
    private Long version = 1L;

    public UserFavoritesVersionEntity() {
    }

    public UserFavoritesVersionEntity(UUID userId, Long version) {
        this.userId = userId;
        this.version = version;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
