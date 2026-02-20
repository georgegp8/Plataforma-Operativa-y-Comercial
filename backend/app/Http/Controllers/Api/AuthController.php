<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Login por nombre de usuario (o email como fallback).
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        // Buscar por username; si no existe, intentar por email (compatibilidad)
        $user = User::where('username', $request->username)
            ->orWhere('email', $request->username)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario o contraseña incorrectos.',
            ], 401);
        }

        if (! $user->activo) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario inactivo. Contacte al administrador.',
            ], 403);
        }

        // Una sesión activa por usuario
        $user->tokens()->delete();

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => $this->userData($user),
        ]);
    }

    /**
     * Registro de nuevo usuario (rol operador por defecto).
     * POST /api/auth/register
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'username' => ['required', 'string', 'min:3', 'max:30', 'unique:users,username', 'regex:/^[a-zA-Z][a-zA-Z0-9_.]{2,29}$/'],
            'password' => 'required|string|min:8|confirmed',
        ], [
            'username.regex'     => 'El usuario debe comenzar con una letra y solo puede contener letras, números, puntos y guiones bajos.',
            'username.unique'    => 'Ese nombre de usuario ya está en uso.',
            'username.min'       => 'El usuario debe tener al menos 3 caracteres.',
            'username.max'       => 'El usuario no puede superar 30 caracteres.',
            'password.min'       => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
        ]);

        $user = User::create([
            'name'     => trim($request->name),
            'username' => strtolower($request->username),
            'email'    => strtolower($request->username) . '@nubofact.internal',
            'password' => Hash::make($request->password),
            'rol'      => 'operador',
            'activo'   => true,
        ]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => $this->userData($user),
        ], 201);
    }

    /**
     * Logout: revoca el token actual.
     * POST /api/auth/logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Me: retorna el usuario autenticado.
     * GET /api/auth/me
     */
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user'    => $this->userData($request->user()),
        ]);
    }

    private function userData(User $user): array
    {
        return [
            'id'       => $user->id,
            'name'     => $user->name,
            'username' => $user->username,
            'email'    => $user->email,
            'rol'      => $user->rol,
        ];
    }
}
