<?php

namespace App\Enums;

enum TransactionSource: string
{
    /** Anrejistre dirèkteman nan API a (telefòn nan te gen entènèt). */
    case Manual = 'manual';

    /** Anrejistre offline epi voye pita pa /api/sync/push. */
    case Sync = 'sync';

    /** Peman MonCash otomatik (v2). */
    case MonCash = 'moncash';
}
