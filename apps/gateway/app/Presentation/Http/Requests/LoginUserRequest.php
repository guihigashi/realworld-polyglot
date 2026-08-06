<?php

namespace App\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user' => ['required', 'array'],
            'user.email' => ['required', 'string', 'email'],
            'user.password' => ['required', 'string'],
        ];
    }
}
