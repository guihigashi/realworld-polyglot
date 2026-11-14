<?php

use App\Domain\Auth\Entities\User;
use App\Infrastructure\Auth\Providers\FirebaseJwtDecoder;
use App\Infrastructure\Auth\Providers\FirebaseJwtGenerator;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

it('decodes base64:-prefixed APP_KEY into raw bytes for HS256 JWTs', function () {
    $rawKey = random_bytes(32);
    config(['app.key' => 'base64:'.base64_encode($rawKey)]);

    $user = new User(
        id: '11111111-1111-1111-1111-111111111111',
        username: 'astrid',
        email: 'astrid@berk.org',
        passwordHash: 'hash',
    );

    $token = (new FirebaseJwtGenerator)->generateForUser($user);
    $directDecoded = JWT::decode($token, new Key($rawKey, 'HS256'));
    $providerDecoded = (new FirebaseJwtDecoder)->decode($token);

    expect($directDecoded->sub)->toBe($user->getId())
        ->and($providerDecoded?->username)->toBe('astrid');
});

it('supports plain non-base64 APP_KEY strings as well', function () {
    $secret = 'plain-raw-secret-with-at-least-32-bytes';
    config(['app.key' => $secret]);

    $user = new User(
        id: '11111111-1111-1111-1111-111111111111',
        username: 'hiccup',
        email: 'hiccup@berk.org',
        passwordHash: 'hash',
    );

    $token = (new FirebaseJwtGenerator)->generateForUser($user);
    $decoded = (new FirebaseJwtDecoder)->decode($token);

    expect($decoded)->not->toBeNull()
        ->and($decoded->sub)->toBe($user->getId())
        ->and($decoded->username)->toBe('hiccup');
});
