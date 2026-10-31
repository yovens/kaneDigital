<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            // Kreye sou telefòn nan pou mòd offline la: idantifyan piblik kliyan an.
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('phone', 20)->nullable();
            $table->string('photo_path')->nullable();

            // Kach balans yo (kredi - peman). Customer::recalculateBalance() mete yo ajou.
            $table->decimal('balance_htg', 14, 2)->default(0);
            $table->decimal('balance_usd', 14, 2)->default(0);
            $table->timestamp('last_activity_at')->nullable();

            // Lyen piblik /k/{token} kliyan an ka louvri pou l wè sa l dwe.
            $table->string('public_token', 64)->unique();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['business_id', 'name']);
            $table->index(['business_id', 'balance_htg']);
            $table->index(['business_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
