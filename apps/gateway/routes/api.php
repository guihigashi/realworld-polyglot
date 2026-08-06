<?php

use App\Presentation\Http\Controllers\Auth\AuthController;
use App\Presentation\Http\Controllers\Auth\UserController;
use App\Presentation\Http\Middleware\JwtAuthenticationMiddleware;
use Illuminate\Support\Facades\Route;

Route::post('/users/login', [AuthController::class, 'login']);
Route::post('/users', [AuthController::class, 'register']);

Route::middleware([JwtAuthenticationMiddleware::class])->group(function () {
    Route::get('/user', [UserController::class, 'show']);
});
