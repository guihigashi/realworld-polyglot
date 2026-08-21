<?php

use App\Presentation\Http\Controllers\ArticleController;
use App\Presentation\Http\Controllers\Auth\AuthController;
use App\Presentation\Http\Controllers\Auth\UserController;
use App\Presentation\Http\Controllers\ProfileController;
use App\Presentation\Http\Controllers\TagController;
use App\Presentation\Http\Middleware\JwtAuthenticationMiddleware;
use App\Presentation\Http\Middleware\OptionalJwtAuthenticationMiddleware;
use Illuminate\Support\Facades\Route;

Route::post('/users/login', [AuthController::class, 'login']);
Route::post('/users', [AuthController::class, 'register']);

Route::middleware([JwtAuthenticationMiddleware::class])->group(function () {
    Route::get('/user', [UserController::class, 'show']);
    Route::put('/user', [UserController::class, 'update']);

    Route::post('/profiles/{username}/follow', [ProfileController::class, 'follow']);
    Route::delete('/profiles/{username}/follow', [ProfileController::class, 'unfollow']);

    Route::post('/articles', [ArticleController::class, 'store']);
    Route::put('/articles/{slug}', [ArticleController::class, 'update']);
    Route::delete('/articles/{slug}', [ArticleController::class, 'destroy']);
});

Route::middleware([OptionalJwtAuthenticationMiddleware::class])->group(function () {
    Route::get('/profiles/{username}', [ProfileController::class, 'show']);

    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slug}', [ArticleController::class, 'show']);
    Route::get('/tags', [TagController::class, 'index']);
});
