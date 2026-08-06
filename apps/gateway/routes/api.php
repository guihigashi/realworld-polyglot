<?php

use App\Presentation\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/users/login', [AuthController::class, 'login']);
Route::post('/users', [AuthController::class, 'register']);
