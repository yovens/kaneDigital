<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncPushRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\TransactionResource;
use App\Services\SyncService;
use App\Support\Dates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function __construct(private readonly SyncService $sync) {}

    /** POST /api/sync/push */
    public function push(SyncPushRequest $request): JsonResponse
    {
        return response()->json(
            $this->sync->push($request->user()->business, $request->user(), $request->validated())
        );
    }

    /** GET /api/sync/pull?since=2026-10-29T15:00:00Z */
    public function pull(Request $request): JsonResponse
    {
        $request->validate(['since' => ['nullable', 'date']]);

        $result = $this->sync->pull(
            $request->user()->business,
            Dates::toLocal($request->query('since')),
        );

        return response()->json([
            'customers' => CustomerResource::collection($result['customers']),
            'transactions' => TransactionResource::collection($result['transactions']),
            'has_more' => $result['has_more'],
            'next_since' => $result['next_since'],
        ]);
    }
}
