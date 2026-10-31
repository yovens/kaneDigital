<?php

namespace App\Providers;

use App\Support\HaitiPhone;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Yon PIN 4 chif fasil pou devine: nou limite tantativ yo pa nimewo.
        RateLimiter::for('kane-login', function (Request $request) {
            $phone = HaitiPhone::normalize((string) $request->input('phone')) ?? 'none';

            return [
                Limit::perMinute(5)->by('login:'.$phone.'|'.$request->ip()),
                Limit::perHour(20)->by('login:'.$phone),
            ];
        });

        RateLimiter::for('kane-register', function (Request $request) {
            return Limit::perHour(10)->by('register:'.$request->ip());
        });
    }
}
