<?php

namespace App\Http\Controllers\Api;

use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Models\Business;
use App\Models\Transaction;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** GET /api/dashboard */
    public function __invoke(Request $request): JsonResponse
    {
        $business = $request->user()->business;
        $cutoff = now()->subDays(config('kane.overdue_days'));

        $lastPaymentSubquery = Transaction::select('occurred_at')
            ->whereColumn('customer_id', 'customers.id')
            ->where('type', TransactionType::Payment->value)
            ->orderByDesc('occurred_at')
            ->limit(1);

        // An reta = gen yon kredi ki pi ansyen pase limit la, epi pa peye anyen depi lè sa a.
        $overdue = $business->customers()
            ->owing()
            ->whereHas('transactions', fn ($q) => $q
                ->where('type', TransactionType::Credit->value)
                ->where('occurred_at', '<', $cutoff))
            ->whereDoesntHave('transactions', fn ($q) => $q
                ->where('type', TransactionType::Payment->value)
                ->where('occurred_at', '>=', $cutoff))
            ->addSelect(['last_payment_at' => $lastPaymentSubquery])
            ->orderByDesc('balance_htg')
            ->limit(10)
            ->get();

        $topDebtors = $business->customers()
            ->owing()
            ->orderByDesc('balance_htg')
            ->orderByDesc('balance_usd')
            ->limit(5)
            ->get();

        return response()->json([
            'total_owed' => [
                'HTG' => round((float) $business->customers()->where('balance_htg', '>', 0)->sum('balance_htg'), 2),
                'USD' => round((float) $business->customers()->where('balance_usd', '>', 0)->sum('balance_usd'), 2),
            ],
            'customers_count' => $business->customers()->count(),
            'debtors_count' => $business->customers()->owing()->count(),
            'today' => $this->periodTotals($business, now()->startOfDay()),
            'this_week' => $this->periodTotals($business, now()->startOfWeek()),
            'top_debtors' => CustomerResource::collection($topDebtors),
            'overdue' => CustomerResource::collection($overdue),
            'overdue_days' => config('kane.overdue_days'),
        ]);
    }

    /**
     * @return array{credits: array{HTG: float, USD: float}, payments: array{HTG: float, USD: float}, count: int}
     */
    private function periodTotals(Business $business, CarbonInterface $from): array
    {
        $result = [
            'credits' => ['HTG' => 0.0, 'USD' => 0.0],
            'payments' => ['HTG' => 0.0, 'USD' => 0.0],
            'count' => 0,
        ];

        $rows = $business->transactions()
            ->toBase()
            ->where('occurred_at', '>=', $from)
            ->selectRaw('type, currency, SUM(amount) AS total, COUNT(*) AS n')
            ->groupBy('type', 'currency')
            ->get();

        foreach ($rows as $row) {
            $bucket = $row->type === TransactionType::Credit->value ? 'credits' : 'payments';
            $result[$bucket][$row->currency] = round((float) $row->total, 2);
            $result['count'] += (int) $row->n;
        }

        return $result;
    }
}
