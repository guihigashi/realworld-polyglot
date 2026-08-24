<?php

namespace App\Presentation\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RegisterUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user' => ['required', 'array'],
            'user.username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'user.email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'user.password' => ['required', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'user.username.required' => "can't be blank",
            'user.email.required' => "can't be blank",
            'user.password.required' => "can't be blank",
            'user.username.unique' => 'has already been taken',
            'user.email.unique' => 'has already been taken',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        $failedRules = $validator->failed();

        $statusCode = 422;

        foreach (['username', 'email'] as $field) {
            if (isset($failedRules["user.$field"]['Unique'])) {
                $statusCode = 409;
            }
        }

        $formattedErrors = [];
        foreach ($validator->errors()->messages() as $path => $messages) {
            $cleanKey = Str::replaceFirst('user.', '', $path);
            $formattedErrors[$cleanKey] = $messages;
        }

        throw (new ValidationException($validator,
            response()->json([
                'errors' => $formattedErrors,
            ], $statusCode)));
    }
}
