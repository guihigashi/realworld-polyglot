<?php

return [
    'middleware' => [
        'request-duration' => filter_var(env('MIDDLEWARE_REQUEST_DURATION'), FILTER_VALIDATE_BOOL),
    ],
];
