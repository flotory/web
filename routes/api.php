<?php

use App\Http\Controllers\Api\AdminActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BroadcastAuthController;
use App\Http\Controllers\Api\CustomerLoyaltyController;
use App\Http\Controllers\Api\VenueCampaignController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\VenueCustomerController;
use App\Http\Controllers\Api\VenueDashboardController;
use App\Http\Controllers\Api\VenueStaffRedemptionController;
use App\Http\Controllers\Api\VenueTeamController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\StaffInvitationController;
use App\Http\Controllers\Api\StaffScanController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/public/venues/{slug}/landing', [VenueController::class, 'publicLanding']);

Route::get('/invites/{token}', [StaffInvitationController::class, 'show']);
Route::post('/invites/{token}/register', [StaffInvitationController::class, 'register']);
Route::post('/invites/{token}/accept', [StaffInvitationController::class, 'accept'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/broadcasting/auth', BroadcastAuthController::class);

    Route::get('/campaigns/templates', [VenueCampaignController::class, 'templates']);

    Route::get('/venues/discover', [VenueController::class, 'discover']);
    Route::apiResource('venues', VenueController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/venues/current', [VenueController::class, 'current']);
    Route::get('/venues/{venue}', [VenueController::class, 'show']);
    Route::post('/venues/{venue}/select', [VenueController::class, 'select']);
    Route::post('/venues/{venue}/logo', [VenueController::class, 'uploadLogo']);
    Route::delete('/venues/{venue}/logo', [VenueController::class, 'destroyLogo']);
    Route::post('/venues/{venue}/cover', [VenueController::class, 'uploadCover']);
    Route::delete('/venues/{venue}/cover', [VenueController::class, 'destroyCover']);
    Route::get('/venues/{venue}/customers', [VenueCustomerController::class, 'index']);
    Route::get('/venues/{venue}/customers/{customer}', [VenueCustomerController::class, 'show']);
    Route::patch('/venues/{venue}/customers/{customer}', [VenueCustomerController::class, 'update']);
    Route::post('/venues/{venue}/customers/{customer}/notes', [VenueCustomerController::class, 'storeNote']);
    Route::post('/venues/{venue:slug}/join', [CustomerLoyaltyController::class, 'join']);

    Route::get('/customer/cards', [CustomerLoyaltyController::class, 'mine']);
    Route::get('/customer/rewards/wallet', [CustomerLoyaltyController::class, 'wallet']);
    Route::post('/customer/rewards/unlocks/{unlock}/claim-session', [CustomerLoyaltyController::class, 'createClaimSession']);
    Route::get('/customer/rewards/claim-sessions/{token}', [CustomerLoyaltyController::class, 'claimSessionStatus']);
    Route::get('/customers/{customer}/card', [CustomerLoyaltyController::class, 'card']);
    Route::get('/customers/{customer}/rewards', [CustomerLoyaltyController::class, 'rewards']);
    Route::post('/customers/{customer}/rewards/{reward}/redeem', [CustomerLoyaltyController::class, 'redeem']);
    Route::post('/venues/{venue}/customers/{customer}/rewards/{reward}/redeem', [VenueStaffRedemptionController::class, 'redeem']);

    Route::get('/dashboard', [VenueDashboardController::class, 'index']);
    Route::get('/venues/{venue}/dashboard', [VenueDashboardController::class, 'show']);
    Route::apiResource('/venues/{venue}/rewards', RewardController::class)->except(['show']);
    Route::get('/venues/{venue}/campaigns', [VenueCampaignController::class, 'index']);
    Route::post('/venues/{venue}/campaigns/preview', [VenueCampaignController::class, 'preview']);
    Route::post('/venues/{venue}/campaigns', [VenueCampaignController::class, 'store']);
    Route::patch('/venues/{venue}/campaigns/{campaign}', [VenueCampaignController::class, 'update']);
    Route::delete('/venues/{venue}/campaigns/{campaign}', [VenueCampaignController::class, 'destroy']);

    Route::patch('/venues/{venue}/rewards/{reward}/archive', [RewardController::class, 'archive']);
    Route::patch('/venues/{venue}/rewards/{reward}/reactivate', [RewardController::class, 'reactivate']);
    Route::delete('/venues/{venue}/rewards/{reward}/purge', [RewardController::class, 'purge']);

    Route::post('/venues/{venue}/scanner/lookup', [StaffScanController::class, 'lookup']);
    Route::post('/venues/{venue}/scanner/scan', [StaffScanController::class, 'scan']);
    Route::post('/venues/{venue}/scanner/stamps', [StaffScanController::class, 'addStamp']);
    Route::post('/venues/{venue}/scanner/redeem', [StaffScanController::class, 'redeem']);

    Route::get('/venues/{venue}/team', [VenueTeamController::class, 'index']);
    Route::post('/venues/{venue}/team/invite', [VenueTeamController::class, 'invite']);
    Route::post('/venues/{venue}/team/invitations/{invitation}/resend', [VenueTeamController::class, 'resendInvitation']);
    Route::delete('/venues/{venue}/team/invitations/{invitation}', [VenueTeamController::class, 'cancelInvitation']);
    Route::patch('/venues/{venue}/team/{user}', [VenueTeamController::class, 'update']);
    Route::delete('/venues/{venue}/team/{user}', [VenueTeamController::class, 'destroy']);

    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/activity', [AdminActivityController::class, 'index']);
    });
});
