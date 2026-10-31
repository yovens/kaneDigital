<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 20)->default('whatsapp'); // whatsapp | sms
            $table->text('message');
            $table->decimal('amount_htg', 14, 2)->default(0);
            $table->decimal('amount_usd', 14, 2)->default(0);
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->index(['customer_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
