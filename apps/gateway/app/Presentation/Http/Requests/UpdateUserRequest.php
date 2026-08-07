<?php

namespace App\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->attributes->get('auth_user_id');

        return [
            'user' => ['required', 'array'],
            'user.username' => ['sometimes', 'string', 'max:255', Rule::unique('users', 'username')->ignore($userId)],
            'user.email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'user.password' => ['sometimes', 'string', 'min:8'],
            'user.bio' => ['sometimes', 'nullable', 'string'],
            'user.image' => ['sometimes', 'nullable', 'url'],
        ];
    }
}
