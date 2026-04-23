<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * ✅ AJUSTÉ : Rate limiting plus flexible selon environnement
     * 
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        // ✅ LIMITE AJUSTÉE selon environnement
        $maxAttempts = $this->getMaxAttempts();
        
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), $maxAttempts)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * ✅ NOUVEAU : Obtenir le nombre max de tentatives selon environnement
     */
    private function getMaxAttempts(): int
    {
        // ✅ DÉVELOPPEMENT : Plus permissif pour les tests
        if (app()->environment(['local', 'testing', 'development'])) {
            return 15; // 15 tentatives en développement
        }
        
        // ✅ PRODUCTION : Sécurisé mais raisonnable
        return 8; // 8 tentatives en production (au lieu de 5)
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->input('email')).'|'.$this->ip());
    }

    /**
     * ✅ NOUVEAU : Méthode pour obtenir le temps de blocage restant
     */
    public function getRemainingLockoutTime(): int
    {
        return RateLimiter::availableIn($this->throttleKey());
    }

    /**
     * ✅ NOUVEAU : Méthode pour obtenir le nombre de tentatives restantes
     */
    public function getRemainingAttempts(): int
    {
        $maxAttempts = $this->getMaxAttempts();
        $attempts = RateLimiter::attempts($this->throttleKey());
        
        return max(0, $maxAttempts - $attempts);
    }

    /**
     * ✅ NOUVEAU : Réinitialiser manuellement le rate limiter (pour admin)
     */
    public function clearRateLimit(): void
    {
        RateLimiter::clear($this->throttleKey());
    }
}