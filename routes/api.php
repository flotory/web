<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BroadcastAuthController;
use App\Http\Controllers\Api\CustomerLoyaltyController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\VenueDashboardController;
use App\Http\Controllers\Api\VenueStaffRedemptionController;
use App\Http\Controllers\Api\VenueTeamController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\StaffScanController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/broadcasting/auth', BroadcastAuthController::class);

    Route::get('/venues/discover', [VenueController::class, 'discover']);
    Route::apiResource('venues', VenueController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/venues/current', [VenueController::class, 'current']);
    Route::get('/venues/{venue}', [VenueController::class, 'show']);
    Route::post('/venues/{venue}/select', [VenueController::class, 'select']);
    Route::post('/venues/{venue}/logo', [VenueController::class, 'uploadLogo']);
    Route::delete('/venues/{venue}/logo', [VenueController::class, 'destroyLogo']);
    Route::get('/venues/{venue}/customers', [VenueController::class, 'customers']);
    Route::post('/venues/{venue:slug}/join', [CustomerLoyaltyController::class, 'join']);

    Route::get('/customer/cards', [CustomerLoyaltyController::class, 'mine']);
    Route::get('/customers/{customer}/card', [CustomerLoyaltyController::class, 'card']);
    Route::get('/customers/{customer}/rewards', [CustomerLoyaltyController::class, 'rewards']);
    Route::post('/customers/{customer}/rewards/{reward}/redeem', [CustomerLoyaltyController::class, 'redeem']);
    Route::post('/venues/{venue}/customers/{customer}/rewards/{reward}/redeem', [VenueStaffRedemptionController::class, 'redeem']);

    Route::get('/dashboard', [VenueDashboardController::class, 'index']);
    Route::get('/venues/{venue}/dashboard', [VenueDashboardController::class, 'show']);
    Route::apiResource('/venues/{venue}/rewards', RewardController::class)->except(['show']);

    Route::post('/venues/{venue}/scanner/lookup', [StaffScanController::class, 'lookup']);
    Route::post('/venues/{venue}/scanner/stamps', [StaffScanController::class, 'addStamp']);

    Route::get('/venues/{venue}/team', [VenueTeamController::class, 'index']);
    Route::post('/venues/{venue}/team/invite', [VenueTeamController::class, 'invite']);
    Route::patch('/venues/{venue}/team/{user}', [VenueTeamController::class, 'update']);
    Route::delete('/venues/{venue}/team/{user}', [VenueTeamController::class, 'destroy']);
});
