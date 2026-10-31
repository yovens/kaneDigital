<?php

use App\Http\Controllers\PublicKaneController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/app/');
});

// Aplikasyon PWA a (fichye yo nan public/app). Apache/Nginx sèvi yo dirèkteman;
// wout sa a fè "php artisan serve" mache tou.
Route::get('/app', function (Request $request) {
    if (! str_ends_with($request->getPathInfo(), '/')) {
        return redirect('/app/', 301);
    }

    return response()->file(public_path('app/index.html'), [
        'Content-Type' => 'text/html; charset=utf-8',
        'Cache-Control' => 'no-cache',
    ]);
});

// Lyen piblik kliyan an resevwa nan rapèl WhatsApp/SMS la.
Route::get('/k/{token}', [PublicKaneController::class, 'show'])
    ->where('token', '[A-Za-z0-9]{40}')
    ->middleware('throttle:60,1')
    ->name('kane.public');
