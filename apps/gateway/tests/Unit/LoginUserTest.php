<?php

use App\Application\Auth\UseCases\LoginUser;
use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\PasswordHasherInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;
use App\Domain\Auth\Entities\User;
use App\Infrastructure\Messaging\InMemoryEventPublisher;

it('dispatches user.logged_in event upon successful authentication', function () {
    $userRepository = Mockery::mock(UserRepositoryInterface::class);
    $passwordHasher = Mockery::mock(PasswordHasherInterface::class);
    $jwtGenerator = Mockery::mock(JwtGeneratorInterface::class);
    $eventPublisher = new InMemoryEventPublisher;

    $user = new User(
        id: 'usr-123',
        username: 'johndoe',
        email: 'john@example.com',
        passwordHash: 'hashed_pw',
        bio: 'Hello world',
        image: 'https://example.com/avatar.jpg'
    );

    $userRepository->shouldReceive('findByEmail')
        ->with('john@example.com')
        ->once()
        ->andReturn($user);

    $passwordHasher->shouldReceive('verify')
        ->with('secret123', 'hashed_pw')
        ->once()
        ->andReturn(true);

    $jwtGenerator->shouldReceive('generateForUser')
        ->with($user)
        ->once()
        ->andReturn('sample-jwt-token');

    $useCase = new LoginUser(
        userRepository: $userRepository,
        passwordHasher: $passwordHasher,
        jwtGenerator: $jwtGenerator,
        eventPublisher: $eventPublisher
    );

    $result = $useCase->execute('john@example.com', 'secret123');

    expect($result)->toBe([
        'email' => 'john@example.com',
        'token' => 'sample-jwt-token',
        'username' => 'johndoe',
        'bio' => 'Hello world',
        'image' => 'https://example.com/avatar.jpg',
    ]);

    expect($eventPublisher->count())->toBe(1);
    $published = $eventPublisher->getEvents()[0];
    expect($published['routing_key'])->toBe('user.logged_in');
    expect($published['payload']['event'])->toBe('UserLoggedIn');
    expect($published['payload']['data'])->toBe([
        'user_id' => 'usr-123',
        'email' => 'john@example.com',
        'username' => 'johndoe',
    ]);
    expect($published['payload']['occurred_at'])->toBeString();
});

it('does not dispatch event when user is not found', function () {
    $userRepository = Mockery::mock(UserRepositoryInterface::class);
    $passwordHasher = Mockery::mock(PasswordHasherInterface::class);
    $jwtGenerator = Mockery::mock(JwtGeneratorInterface::class);
    $eventPublisher = new InMemoryEventPublisher;

    $userRepository->shouldReceive('findByEmail')
        ->with('unknown@example.com')
        ->once()
        ->andReturn(null);

    $useCase = new LoginUser(
        userRepository: $userRepository,
        passwordHasher: $passwordHasher,
        jwtGenerator: $jwtGenerator,
        eventPublisher: $eventPublisher
    );

    expect(fn () => $useCase->execute('unknown@example.com', 'secret123'))
        ->toThrow(Exception::class, 'Invalid email or password');

    expect($eventPublisher->count())->toBe(0);
});

it('does not dispatch event when password verification fails', function () {
    $userRepository = Mockery::mock(UserRepositoryInterface::class);
    $passwordHasher = Mockery::mock(PasswordHasherInterface::class);
    $jwtGenerator = Mockery::mock(JwtGeneratorInterface::class);
    $eventPublisher = new InMemoryEventPublisher;

    $user = new User(
        id: 'usr-123',
        username: 'johndoe',
        email: 'john@example.com',
        passwordHash: 'hashed_pw'
    );

    $userRepository->shouldReceive('findByEmail')
        ->with('john@example.com')
        ->once()
        ->andReturn($user);

    $passwordHasher->shouldReceive('verify')
        ->with('wrong_pw', 'hashed_pw')
        ->once()
        ->andReturn(false);

    $useCase = new LoginUser(
        userRepository: $userRepository,
        passwordHasher: $passwordHasher,
        jwtGenerator: $jwtGenerator,
        eventPublisher: $eventPublisher
    );

    expect(fn () => $useCase->execute('john@example.com', 'wrong_pw'))
        ->toThrow(Exception::class, 'Invalid email or password');

    expect($eventPublisher->count())->toBe(0);
});
