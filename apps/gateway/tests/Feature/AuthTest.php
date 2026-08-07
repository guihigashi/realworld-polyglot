<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\postJson;
use function Pest\Laravel\withHeader;

// Automatically wipes the database between each test
uses(RefreshDatabase::class);

// A quick helper function to register a user and grab the token for subsequent tests
function authenticateAndGetToken(): string
{
    $response = postJson('/api/users', [
        'user' => [
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => 'password123',
        ],
    ]);

    return $response->json('user.token');
}

it('registers a user and returns a token', function () {
    $response = postJson('/api/users', [
        'user' => [
            'username' => 'newuser',
            'email' => 'newuser@example.com',
            'password' => 'password123',
        ],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('user.username', 'newuser')
        ->assertJsonPath('user.email', 'newuser@example.com')
        ->assertJsonPath('user.bio', null)
        ->assertJsonPath('user.image', null);

    // Pest's powerful expectation API
    expect($response->json('user.token'))->toBeString()->not->toBeEmpty();
});

it('logs in a user', function () {
    authenticateAndGetToken(); // Sets up the user

    $response = postJson('/api/users/login', [
        'user' => [
            'email' => 'test@example.com',
            'password' => 'password123',
        ],
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('user.username', 'testuser');
});

it('gets the current user using the token', function () {
    $token = authenticateAndGetToken();

    $response = withHeader('Authorization', "Token $token")
        ->getJson('/api/user');

    $response->assertStatus(200)
        ->assertJsonPath('user.email', 'test@example.com');
});

it('updates user bio and handles empty string normalization', function () {
    $token = authenticateAndGetToken();

    // 1. Set bio to a string
    withHeader('Authorization', "Token $token")
        ->putJson('/api/user', ['user' => ['bio' => 'Updated bio']])
        ->assertStatus(200)
        ->assertJsonPath('user.bio', 'Updated bio');

    // 2. Set bio to an empty string (should normalize to null in your Entity)
    withHeader('Authorization', "Token $token")
        ->putJson('/api/user', ['user' => ['bio' => '']])
        ->assertStatus(200)
        ->assertJsonPath('user.bio', null);
});

it('ignores missing fields during partial update to prevent data loss', function () {
    $token = authenticateAndGetToken();

    // 1. Set the initial bio
    withHeader('Authorization', "Token $token")
        ->putJson('/api/user', ['user' => ['bio' => 'Persistent bio']]);

    // 2. Update ONLY the image
    withHeader('Authorization', "Token $token")
        ->putJson('/api/user', ['user' => ['image' => 'https://example.com/photo.jpg']])
        ->assertStatus(200)
        ->assertJsonPath('user.image', 'https://example.com/photo.jpg')
        ->assertJsonPath('user.bio', 'Persistent bio'); // Confirms the bug we fixed!
});
