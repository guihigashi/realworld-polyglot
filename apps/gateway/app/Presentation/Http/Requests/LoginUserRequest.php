<?php

namespace App\Presentation\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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

    public function messages(): array
    {
        return [
            'user.email.required' => "can't be blank",
            'user.password.required' => "can't be blank",
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        $statusCode = 422;

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
