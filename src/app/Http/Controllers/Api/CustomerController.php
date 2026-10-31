<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CustomerController extends Controller
{
    /**
     * GET /api/customers?search=jak&filter=owing&sort=balance|name|recent&per_page=50
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = trim((string) $request->query('search', ''));
        $digits = preg_replace('/\D+/', '', $search) ?? '';

        $customers = $request->user()->business->customers()
            ->when($search !== '', function ($query) use ($search, $digits) {
                $query->where(function ($q) use ($search, $digits) {
                    $q->where('name', 'like', '%'.$search.'%');

                    if (strlen($digits) >= 3) {
                        $q->orWhere('phone', 'like', '%'.$digits.'%');
                    }
                });
            })
            ->when($request->query('filter') === 'owing', fn ($q) => $q->owing())
            ->when(
                $request->query('sort', 'recent'),
                fn ($q, $sort) => match ($sort) {
                    'balance' => $q->orderByDesc('balance_htg')->orderByDesc('balance_usd'),
                    'name' => $q->orderBy('name'),
                    default => $q->orderByDesc('last_activity_at')->orderByDesc('created_at'),
                }
            )
            ->paginate(min((int) $request->query('per_page', 50), 100));

        return CustomerResource::collection($customers);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $business = $request->user()->business;
        $data = $request->validated();

        // Idanpotan: si telefòn nan voye menm uuid la ankò, nou retounen menm kliyan an.
        if (! empty($data['uuid'])) {
            $existing = Customer::withTrashed()->where('uuid', $data['uuid'])->first();

            if ($existing) {
                abort_if($existing->business_id !== $business->id, 422, 'uuid sa a deja itilize.');

                return (new CustomerResource($existing))->response()->setStatusCode(200);
            }
        }

        if ($business->customerLimitReached()) {
            return response()->json([
                'message' => 'Ou rive nan limit '.config('kane.free_customer_limit').' kliyan plan gratis la. Pase nan plan Pro pou w ajoute plis kliyan.',
                'code' => 'customer_limit',
            ], 403);
        }

        $customer = $business->customers()->create($data);

        return (new CustomerResource($customer->refresh()))->response()->setStatusCode(201);
    }

    public function show(Customer $customer): CustomerResource
    {
        Gate::authorize('view', $customer);

        $customer->load(['transactions' => fn ($q) => $q->latest('occurred_at')->latest('id')->limit(20)]);

        return new CustomerResource($customer);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): CustomerResource
    {
        Gate::authorize('update', $customer);

        $customer->update($request->validated());

        return new CustomerResource($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        Gate::authorize('delete', $customer);

        $customer->delete();

        return response()->json(['message' => 'Kliyan an efase.']);
    }
}
