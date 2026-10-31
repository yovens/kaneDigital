<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateBusinessRequest;
use App\Http\Resources\BusinessResource;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function show(Request $request): BusinessResource
    {
        return new BusinessResource($request->user()->business);
    }

    public function update(UpdateBusinessRequest $request): BusinessResource
    {
        $business = $request->user()->business;
        $business->update($request->validated());

        return new BusinessResource($business);
    }
}
