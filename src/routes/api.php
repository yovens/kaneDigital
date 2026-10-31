<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Support\Facades\Route;

Route::middleware(ForceJsonResponse::class)->group(function () {

    // --- Koneksyon (piblik) ---
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:kane-register');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:kane-login');

    // --- Tout rès la mande yon token Sanctum ---
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('business', [BusinessController::class, 'show']);
        Route::put('business', [BusinessController::class, 'update']);

        Route::get('dashboard', DashboardController::class);

        Route::apiResource('customers', CustomerController::class);

        Route::get('customers/{customer}/transactions', [TransactionController::class, 'index']);
        Route::post('customers/{customer}/transactions', [TransactionController::class, 'store']);
        Route::patch('transactions/{transaction}', [TransactionController::class, 'update']);
        Route::delete('transactions/{transaction}', [TransactionController::class, 'destroy']);

        Route::get('customers/{customer}/reminders', [ReminderController::class, 'index']);
        Route::post('customers/{customer}/reminders', [ReminderController::class, 'store']);

        Route::get('sync/pull', [SyncController::class, 'pull']);
        Route::post('sync/push', [SyncController::class, 'push']);
    });
});
