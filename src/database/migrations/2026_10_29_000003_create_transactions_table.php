<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            // Kreye sou telefòn nan: si menm tranzaksyon an voye 2 fwa, li pa double.
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);            // credit | payment
            $table->decimal('amount', 14, 2);      // toujou pozitif
            $table->string('currency', 3)->default('HTG');
            $table->string('note')->nullable();
            $table->timestamp('occurred_at');
            $table->string('source', 10)->default('manual'); // manual | sync | moncash
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['customer_id', 'occurred_at']);
            $table->index(['business_id', 'occurred_at']);
            $table->index(['business_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
