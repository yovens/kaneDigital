<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'pin' => $data['pin'],
                'plan' => 'free',
                'trial_ends_at' => now()->addDays(config('kane.trial_days')),
            ]);

            $user->business()->create([
                'name' => $data['business_name'],
                'currency_default' => $data['currency_default'] ?? 'HTG',
            ]);

            return $user;
        });

        return response()->json([
            'token' => $user->createToken($data['device_name'] ?? 'telefòn')->plainTextToken,
            'user' => new UserResource($user->load('business')),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('phone', $request->validated('phone'))->first();

        if (! $user || ! Hash::check($request->validated('pin'), $user->pin)) {
            throw ValidationException::withMessages([
                'phone' => 'Nimewo telefòn oswa PIN nan pa kòrèk.',
            ]);
        }

        return response()->json([
            'token' => $user->createToken($request->validated('device_name') ?? 'telefòn')->plainTextToken,
            'user' => new UserResource($user->load('business')),
        ]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('business'));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Ou dekonekte.']);
    }
}
