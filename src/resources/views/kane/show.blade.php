@use('App\Enums\Currency')
@php
    $htg = (float) $customer->balance_htg;
    $usd = (float) $customer->balance_usd;
@endphp
<!DOCTYPE html>
<html lang="ht">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $business->name }} · Kanè {{ $customer->name }}</title>
    <style>
        :root { --ink:#1f2933; --muted:#6b7280; --line:#e5e7eb; --red:#b42318; --green:#067647; --bg:#f7f7f5; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--ink); background:var(--bg); }
        main { max-width: 480px; margin: 0 auto; padding: 24px 16px 48px; }
        header p { margin: 0; color: var(--muted); font-size: 14px; }
        h1 { margin: 4px 0 20px; font-size: 22px; }
        .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:20px; margin-bottom:16px; }
        .label { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
        .amount { font-size: 30px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
        .debt { color: var(--red); } .ok { color: var(--green); }
        ul { list-style:none; margin:0; padding:0; }
        li { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid var(--line); }
        li:last-child { border-bottom:0; }
        .meta { font-size:13px; color:var(--muted); }
        .tx-amount { font-weight:600; white-space:nowrap; font-variant-numeric: tabular-nums; }
        footer { text-align:center; font-size:12px; color:var(--muted); margin-top:24px; }
    </style>
</head>
<body>
<main>
    <header>
        <p>{{ $business->name }}</p>
        <h1>Kanè {{ $customer->name }}</h1>
    </header>

    <section class="card">
        @if ($htg <= 0 && $usd <= 0)
            <div class="label">Balans</div>
            <div class="amount ok">Ou pa dwe anyen</div>
        @else
            <div class="label">Ou dwe</div>
            @if ($htg > 0)
                <div class="amount debt">{{ Currency::HTG->format($htg) }}</div>
            @endif
            @if ($usd > 0)
                <div class="amount debt">{{ Currency::USD->format($usd) }}</div>
            @endif
        @endif

        @if ($htg < 0)
            <p class="meta">Ou gen yon avans {{ Currency::HTG->format(abs($htg)) }}.</p>
        @endif
        @if ($usd < 0)
            <p class="meta">Ou gen yon avans {{ Currency::USD->format(abs($usd)) }}.</p>
        @endif
    </section>

    <section class="card">
        <div class="label" style="margin-bottom:8px">Dènye operasyon yo</div>
        @if ($transactions->isEmpty())
            <p class="meta">Poko gen operasyon.</p>
        @else
            <ul>
                @foreach ($transactions as $tx)
                    <li>
                        <div>
                            <div>{{ $tx->type->label() }}@if ($tx->note) · {{ $tx->note }}@endif</div>
                            <div class="meta">{{ $tx->occurred_at->format('d/m/Y H:i') }}</div>
                        </div>
                        <div class="tx-amount {{ $tx->type === \App\Enums\TransactionType::Credit ? 'debt' : 'ok' }}">
                            {{ $tx->type === \App\Enums\TransactionType::Credit ? '+' : '−' }}{{ $tx->currency->format($tx->amount) }}
                        </div>
                    </li>
                @endforeach
            </ul>
        @endif
    </section>

    <footer>Kanè Dijital · Si gen yon erè, kontakte {{ $business->name }}.</footer>
</main>
</body>
</html>
