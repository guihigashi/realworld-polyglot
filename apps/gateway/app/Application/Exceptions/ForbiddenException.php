<?php

namespace App\Application\Exceptions;

class ForbiddenException extends \Exception
{
    public function __construct(
        public string $entity,
    ) {
        parent::__construct();
    }
}
