<?php

namespace App\Services;

use App\Enums\TransactionSource;
use App\Models\Business;
use App\Models\Customer;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Dates;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Senkronizasyon pou mòd offline la.
 *
 * PUSH: telefòn nan voye sa l te anrejistre offline. Tout bagay idanpotan
 *       (menm uuid voye 2 fwa = pa gen doub). Kliyan yo trete anvan
 *       tranzaksyon yo pou customer_uuid ka jwenn.
 *       - Kliyan: "dènye ki modifye a genyen" (updated_at).
 *       - Tranzaksyon: kreye si yo pa egziste, efase si deleted_at voye.
 *         Pou korije yon montan, efase tranzaksyon an epi kreye yon lòt.
 *
 * PULL: sèvè a voye tout sa ki chanje depi "since" (enkli sa ki efase).
 */
class SyncService
{
    /**
     * @param  array{customers?: array<int, array<string, mixed>>, transactions?: array<int, array<string, mixed>>}  $payload
     */
    public function push(Business $business, User $user, array $payload): array
    {
        $accepted = ['customers' => [], 'transactions' => []];
        $rejected = [];

        DB::transaction(function () use ($business, $user, $payload, &$accepted, &$rejected) {
            foreach ($payload['customers'] ?? [] as $row) {
                $error = $this->pushCustomer($business, $row);

                if ($error === null) {
                    $accepted['customers'][] = $row['uuid'];
                } else {
                    $rejected[] = ['type' => 'customer', 'uuid' => $row['uuid'], 'reason' => $error];
                }
            }

            foreach ($payload['transactions'] ?? [] as $row) {
                $error = $this->pushTransaction($business, $user, $row);

                if ($error === null) {
                    $accepted['transactions'][] = $row['uuid'];
                } else {
                    $rejected[] = ['type' => 'transaction', 'uuid' => $row['uuid'], 'reason' => $error];
                }
            }
        });

        return [
            'accepted' => $accepted,
            'rejected' => $rejected,
            'server_time' => now()->toJSON(),
        ];
    }

    private function pushCustomer(Business $business, array $row): ?string
    {
        $customer = Customer::withTrashed()->where('uuid', $row['uuid'])->first();

        if ($customer && $customer->business_id !== $business->id) {
            return 'uuid_conflict';
        }

        if (! $customer) {
            if ($business->customerLimitReached()) {
                return 'customer_limit';
            }

            $customer = $business->customers()->create([
                'uuid' => $row['uuid'],
                'name' => $row['name'],
                'phone' => $row['phone'] ?? null,
            ]);
        } else {
            $clientUpdatedAt = Dates::toLocal($row['updated_at'] ?? null);

            if ($clientUpdatedAt === null || $clientUpdatedAt->greaterThanOrEqualTo($customer->updated_at)) {
                $customer->fill([
                    'name' => $row['name'],
                    'phone' => $row['phone'] ?? null,
                ])->save();
            }
        }

        if (! empty($row['deleted_at']) && ! $customer->trashed()) {
            $customer->delete();
        }

        return null;
    }

    private function pushTransaction(Business $business, User $user, array $row): ?string
    {
        $existing = Transaction::withTrashed()->where('uuid', $row['uuid'])->first();

        if ($existing) {
            if ($existing->business_id !== $business->id) {
                return 'uuid_conflict';
            }

            if (! empty($row['deleted_at']) && ! $existing->trashed()) {
                $existing->delete();
            }

            return null;
        }

        $customer = $business->customers()->withTrashed()->where('uuid', $row['customer_uuid'])->first();

        if (! $customer) {
            return 'customer_not_found';
        }

        $transaction = $business->transactions()->create([
            'uuid' => $row['uuid'],
            'customer_id' => $customer->id,
            'type' => $row['type'],
            'amount' => $row['amount'],
            'currency' => $row['currency'] ?? $business->currency_default,
            'note' => $row['note'] ?? null,
            'occurred_at' => Dates::toLocal($row['occurred_at']),
            'source' => TransactionSource::Sync,
            'created_by' => $user->id,
            'synced_at' => now(),
        ]);

        if (! empty($row['deleted_at'])) {
            $transaction->delete();
        }

        return null;
    }

    /**
     * @return array{customers: \Illuminate\Support\Collection, transactions: \Illuminate\Support\Collection, has_more: bool, next_since: string}
     */
    public function pull(Business $business, ?Carbon $since): array
    {
        $serverTime = now();
        $limit = config('kane.sync_page_size');

        $customers = $business->customers()
            ->withTrashed()
            ->when($since, fn ($q) => $q->where('updated_at', '>=', $since))
            ->orderBy('updated_at')
            ->orderBy('id')
            ->limit($limit + 1)
            ->get();

        $transactions = $business->transactions()
            ->withTrashed()
            ->with('customer:id,uuid')
            ->when($since, fn ($q) => $q->where('updated_at', '>=', $since))
            ->orderBy('updated_at')
            ->orderBy('id')
            ->limit($limit + 1)
            ->get();

        // Si youn nan lis yo depase limit la, pwochen "since" la se pi piti
        // dènye updated_at nan lis ki koupe yo. Kliyan an rele pull ankò.
        $cursors = [];

        if ($customers->count() > $limit) {
            $customers = $customers->take($limit);
            $cursors[] = $customers->last()->updated_at;
        }

        if ($transactions->count() > $limit) {
            $transactions = $transactions->take($limit);
            $cursors[] = $transactions->last()->updated_at;
        }

        $hasMore = $cursors !== [];

        return [
            'customers' => $customers,
            'transactions' => $transactions,
            'has_more' => $hasMore,
            'next_since' => ($hasMore ? collect($cursors)->min() : $serverTime)->toJSON(),
        ];
    }
}
