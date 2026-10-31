<?php

return [

    // Konbyen jou esè gratis yon nouvo kont jwenn (tout fonksyon debloke).
    'trial_days' => (int) env('KANE_TRIAL_DAYS', 30),

    // Limit kliyan pou plan gratis la apre esè a fini.
    'free_customer_limit' => (int) env('KANE_FREE_CUSTOMER_LIMIT', 30),

    // Apre konbyen jou san peman yon kliyan konsidere "an reta".
    'overdue_days' => (int) env('KANE_OVERDUE_DAYS', 14),

    // Maksimòm liy chak koleksyon nan yon repons /api/sync/pull.
    'sync_page_size' => (int) env('KANE_SYNC_PAGE_SIZE', 1000),

];
