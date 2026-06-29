<?php

use App\Http\Controllers\Api\AdminActivityController;
use App\Http\Controllers\Api\AdminNfcTagController;
use App\Http\Controllers\Api\AdminPaletteController;
use App\Http\Controllers\Api\AdminVenueManagementController;
use App\Http\Controllers\Api\AdminVenueReviewController;
use App\Http\Controllers\Api\AdminVenueSetupFileController;
use App\Http\Controllers\Api\VenueSetupFileController;
use App\Http\Controllers\Api\VenueListingController;
use App\Http\Controllers\Api\PublicAppConfigController;
use App\Http\Controllers\Api\PublicDemoBookingController;
use App\Http\Controllers\Api\PublicPaletteController;
use App\Http\Controllers\Api\PublicOwnerInvitationController;
use App\Http\Controllers\Api\AdminOwnerInvitationController;
use App\Http\Controllers\Api\ContactInquiryController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerLoyaltyController;
use App\Http\Controllers\Api\NfcStampController;
use App\Http\Controllers\Api\VenueCampaignController;
use App\Http\Controllers\Api\VenueBranchController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\VenueCustomerController;
use App\Http\Controllers\Api\VenueDashboardController;
use App\Http\Controllers\Api\RewardController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/google', [AuthController::class, 'google']);
Route::post('/auth/apple', [AuthController::class, 'apple']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/venues/discover', [VenueController::class, 'discover']);
Route::get('/public/venues/{slug}/landing', [VenueController::class, 'publicLanding']);
Route::get('/public/nfc/t/{token}', [NfcStampController::class, 'show']);
Route::get('/public/palette', [PublicPaletteController::class, 'show']);
Route::get('/public/app-config', [PublicAppConfigController::class, 'show']);
Route::get('/public/demo-booking', [PublicDemoBookingController::class, 'show']);
Route::post('/contact', [ContactInquiryController::class, 'store'])->middleware('throttle:6,1');
Route::get('/public/owner-invitations/{token}', [PublicOwnerInvitationController::class, 'show']);
Route::post('/public/owner-invitations/{token}/accept', [PublicOwnerInvitationController::class, 'accept'])
    ->middleware('throttle:12,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::delete('/auth/account', [AuthController::class, 'deleteAccount']);
    Route::get('/campaigns/templates', [VenueCampaignController::class, 'templates']);

    Route::apiResource('venues', VenueController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/venues/current', [VenueController::class, 'current']);
    Route::get('/venues/{venue}', [VenueController::class, 'show']);
    Route::post('/venues/{venue}/select', [VenueController::class, 'select']);
    Route::get('/venues/{venue}/branches', [VenueBranchController::class, 'index']);
    Route::post('/venues/{venue}/branches', [VenueBranchController::class, 'store']);
    Route::patch('/venues/{venue}/branches/{branch}', [VenueBranchController::class, 'update']);
    Route::delete('/venues/{venue}/branches/{branch}', [VenueBranchController::class, 'destroy']);
    Route::get('/venues/{venue}/listing', [VenueListingController::class, 'show']);
    Route::post('/venues/{venue}/listing/submit', [VenueListingController::class, 'submit']);
    Route::get('/venues/{venue}/setup-files', [VenueSetupFileController::class, 'index']);
    Route::post('/venues/{venue}/setup-files', [VenueSetupFileController::class, 'store']);
    Route::delete('/venues/{venue}/setup-files/{setupFile}', [VenueSetupFileController::class, 'destroy']);
    Route::get('/venues/{venue}/customers', [VenueCustomerController::class, 'index']);
    Route::get('/venues/{venue}/customers/{customer}', [VenueCustomerController::class, 'show']);
    Route::patch('/venues/{venue}/customers/{customer}', [VenueCustomerController::class, 'update']);
    Route::post('/venues/{venue}/customers/{customer}/notes', [VenueCustomerController::class, 'storeNote']);
    Route::post('/venues/{venue:slug}/join', [CustomerLoyaltyController::class, 'join']);

    Route::post('/nfc/t/{token}/stamp', [NfcStampController::class, 'stamp']);
    Route::get('/customer/cards', [CustomerLoyaltyController::class, 'mine']);
    Route::get('/customer/rewards/wallet', [CustomerLoyaltyController::class, 'wallet']);
    Route::post('/customer/rewards/unlocks/{unlock}/redeem', [CustomerLoyaltyController::class, 'redeemUnlock']);
    Route::get('/customers/{customer}/card', [CustomerLoyaltyController::class, 'card']);
    Route::get('/customers/{customer}/rewards', [CustomerLoyaltyController::class, 'rewards']);
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

    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/activity', [AdminActivityController::class, 'index']);
        Route::get('/venues', [AdminVenueReviewController::class, 'index']);
        Route::post('/venues/{venue}/approve', [AdminVenueReviewController::class, 'approve']);
        Route::post('/venues/{venue}/reject', [AdminVenueReviewController::class, 'reject']);
        Route::post('/venues/{venue}/unpublish', [AdminVenueReviewController::class, 'unpublish']);
        Route::get('/manage-venues', [AdminVenueManagementController::class, 'index']);
        Route::post('/manage-venues', [AdminVenueManagementController::class, 'store']);
        Route::get('/manage-venues/{venue}', [AdminVenueManagementController::class, 'show']);
        Route::put('/manage-venues/{venue}', [AdminVenueManagementController::class, 'update']);
        Route::post('/manage-venues/{venue}/logo', [AdminVenueManagementController::class, 'uploadLogo']);
        Route::delete('/manage-venues/{venue}/logo', [AdminVenueManagementController::class, 'destroyLogo']);
        Route::post('/manage-venues/{venue}/cover', [AdminVenueManagementController::class, 'uploadCover']);
        Route::delete('/manage-venues/{venue}/cover', [AdminVenueManagementController::class, 'destroyCover']);
        Route::get('/manage-venues/{venue}/nfc-tags', [AdminNfcTagController::class, 'index']);
        Route::post('/manage-venues/{venue}/nfc-tags', [AdminNfcTagController::class, 'store']);
        Route::patch('/nfc-tags/{nfcTag}', [AdminNfcTagController::class, 'update']);
        Route::get('/manage-venues/{venue}/setup-files', [AdminVenueSetupFileController::class, 'index']);
        Route::get('/owner-invitations', [AdminOwnerInvitationController::class, 'index']);
        Route::post('/owner-invitations', [AdminOwnerInvitationController::class, 'store']);
        Route::delete('/owner-invitations/{invitation}', [AdminOwnerInvitationController::class, 'destroy']);
        Route::get('/palette', [AdminPaletteController::class, 'show']);
        Route::patch('/palette', [AdminPaletteController::class, 'update']);
        Route::post('/palette/reset', [AdminPaletteController::class, 'reset']);
    });
});
