<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Route;
use Symfony\Component\Mime\MimeTypes;

Route::get('/{any?}', function (?string $any = null) {
    if ($any && File::exists(public_path("dist/{$any}"))) {
        $path = public_path("dist/{$any}");
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimeType = MimeTypes::getDefault()->getMimeTypes($extension)[0] ?? null;

        $headers = [];
        if ($mimeType) {
            $headers['Content-Type'] = $mimeType;
        }

        return Response::file($path, $headers);
    }

    $indexPath = public_path('dist/index.html');

    if (File::exists($indexPath)) {
        return Response::file($indexPath, [
            'Content-Type' => 'text/html; charset=utf-8',
        ]);
    }

    return response()->json([
        'message' => 'Frontend not built yet in public/dist.',
    ], 404);
})->where('any', '^(?!api).*$');
