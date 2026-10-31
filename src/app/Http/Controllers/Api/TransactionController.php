<?php

namespace App\Http\Controllers\Api;

use App\Enums\TransactionSource;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\TransactionResource;
use App\Models\Customer;
use App\Models\Transaction;
use App\Support\Dates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class TransactionController extends Controller
{
    /** GET /api/customers/{customer}/transactions */
    public function index(Request $request, Customer $customer): AnonymousResourceCollection
    {
        Gate::authorize('view', $customer);

        $transactions = $customer->transactions()
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(min((int) $request->query('per_page', 50), 100));

        $transactions->getCollection()->each->setRelation('customer', $customer);

        return TransactionResource::collection($transactions);
    }

    /** POST /api/customers/{customer}/transactions — bouton "Bay kredi" / "Resevwa peman" */
    public function store(StoreTransactionRequest $request, Customer $customer): JsonResponse
    {
        Gate::authorize('update', $customer);

        $data = $request->validated();

        // Idanpotan: menm uuid la pa janm kreye 2 tranzaksyon.
        if (! empty($data['uuid'])) {
            $existing = Transaction::withTrashed()->where('uuid', $data['uuid'])->first();

            if ($existing) {
                abort_if($existing->customer_id !== $customer->id, 422, 'uuid sa a deja itilize.');

                return $this->respond($existing, $customer, 200);
            }
        }

        $transaction = $customer->business->transactions()->create([
            'uuid' => $data['uuid'] ?? null,
            'customer_id' => $customer->id,
            'type' => $data['type'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? $customer->business->currency_default,
            'note' => $data['note'] ?? null,
            'occurred_at' => Dates::toLocal($data['occurred_at'] ?? null) ?? now(),
            'source' => TransactionSource::Manual,
            'created_by' => $request->user()->id,
        ]);

        return $this->respond($transaction, $customer, 201);
    }

    /** PATCH /api/transactions/{transaction} — korije yon erè */
    public function update(UpdateTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        Gate::authorize('update', $transaction);

        $data = $request->validated();

        if (array_key_exists('occurred_at', $data)) {
            $data['occurred_at'] = Dates::toLocal($data['occurred_at']);
        }

        $transaction->update($data);

        return $this->respond($transaction, $transaction->customer, 200);
    }

    /** DELETE /api/transactions/{transaction} */
    public function destroy(Transaction $transaction): JsonResponse
    {
        Gate::authorize('delete', $transaction);

        $customer = $transaction->customer;
        $transaction->delete();

        return response()->json([
            'message' => 'Tranzaksyon an efase.',
            'customer' => new CustomerResource($customer->refresh()),
        ]);
    }

    /** Toujou retounen nouvo balans kliyan an ansanm ak tranzaksyon an. */
    private function respond(Transaction $transaction, Customer $customer, int $status): JsonResponse
    {
        $customer->refresh();
        $transaction->setRelation('customer', $customer);

        return (new TransactionResource($transaction))
            ->additional(['customer' => new CustomerResource($customer)])
            ->response()
            ->setStatusCode($status);
    }
}
