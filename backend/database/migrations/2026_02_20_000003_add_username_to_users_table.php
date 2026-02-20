<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // username: 3-30 chars, nullable para usuarios existentes
            $table->string('username', 30)->nullable()->after('name');
        });

        // Asignar username a usuarios existentes basado en su email
        DB::table('users')->whereNull('username')->get()->each(function ($user) {
            $base = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', explode('@', $user->email)[0]));
            $base = substr($base, 0, 28);
            $candidate = $base;
            $i = 1;
            while (DB::table('users')->where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                $candidate = $base . '_' . $i++;
            }
            DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
