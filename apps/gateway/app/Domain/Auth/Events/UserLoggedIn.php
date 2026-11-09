<?php

namespace App\Domain\Auth\Events;

use App\Domain\Auth\Entities\User;
use DateTimeImmutable;
use DateTimeInterface;

readonly class UserLoggedIn
{
    public DateTimeImmutable $occurredAt;

    public function __construct(
        public User $user,
        ?DateTimeImmutable $occurredAt = null,
    ) {
        $this->occurredAt = $occurredAt ?? new DateTimeImmutable;
    }

    public function eventName(): string
    {
        return 'user.logged_in';
    }

    /**
     * @return array{
     *     event: string,
     *     occurred_at: string,
     *     data: array{
     *         user_id: string,
     *         email: string,
     *         username: string,
     *     }
     * }
     */
    public function toArray(): array
    {
        return [
            'event' => 'UserLoggedIn',
            'occurred_at' => $this->occurredAt->format(DateTimeInterface::ATOM),
            'data' => [
                'user_id' => $this->user->getId(),
                'email' => $this->user->getEmail(),
                'username' => $this->user->getUsername(),
            ],
        ];
    }
}
