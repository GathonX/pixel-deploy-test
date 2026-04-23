<?php

namespace App\Http\Controllers;

use App\Models\BusinessKeyWords;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BusinessKeyWordController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $businessKeyWords = BusinessKeyWords::all();
        return response()->json($businessKeyWords);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'keyword' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'project_id' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        $businessKeyWords = BusinessKeyWords::create($request->all());
        return response()->json($businessKeyWords);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $businessKeyWords = BusinessKeyWords::find($id);
        return response()->json($businessKeyWords);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $businessKeyWords = BusinessKeyWords::find($id);
        $businessKeyWords->update($request->all());
        return response()->json($businessKeyWords);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $businessKeyWords = BusinessKeyWords::find($id);
        $businessKeyWords->delete();
        return response()->json(['message' => 'BusinessKeyWords deleted successfully']);
    }
}
