<?php

use App\Presentation\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/users', [AuthController::class, 'register']);
