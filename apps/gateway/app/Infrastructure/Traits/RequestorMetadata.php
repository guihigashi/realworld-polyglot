<?php

namespace App\Infrastructure\Traits;

trait RequestorMetadata
{
    private function metadataOfRequestor(?string $requestorId): array
    {
        if ($requestorId !== null) {
            return [
                'x-requestor-id' => [$requestorId],
            ];
        }

        return [];
    }
}
