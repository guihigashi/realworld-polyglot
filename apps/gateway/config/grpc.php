<?php

return [
    'article-service' => [
        'target' => env('ARTICLE_SERVICE_TARGET', 'localhost:9092'),
    ],
    'feed-aggregator' => [
        'target' => env('FEED_AGGREGATOR_TARGET', 'localhost:9091'),
    ],
    'social-graph' => [
        'target' => env('SOCIAL_GRAPH_TARGET', 'localhost:9090'),
    ],
];
