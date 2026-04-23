<?php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ChangePasswordController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password'      => 'required',
            'password'              => 'required|confirmed|min:8',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json(['message' => 'Mot de passe modifié.']);
    }
}
