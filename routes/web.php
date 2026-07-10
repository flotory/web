<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Services\MediaStorageService;
use Illuminate\Support\Facades\Route;

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');

Route::get('/uploads/{path}', function (string $path) {
    $media = app(MediaStorageService::class);
    $storagePath = '/uploads/'.ltrim($path, '/');

    if ($media->usesRemoteDisk()) {
        $url = $media->url($storagePath);

        abort_unless(filled($url), 404);

        return redirect()->away($url, 301);
    }

    $fullPath = public_path('uploads/'.$path);

    abort_unless(is_file($fullPath), 404);

    return response()->file($fullPath);
})->where('path', '.*');

Route::view('/{path?}', 'app')->where('path', '.*');
