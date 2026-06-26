import { NextResponse } from "next/server";

export interface ApiErrorResponse {
  error: string;
  errors?: Array<{ field: string; message: string }>;
}

export function apiError(
  message: string,
  status: number,
  fieldErrors?: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { error: message };
  if (fieldErrors && fieldErrors.length > 0) {
    body.errors = fieldErrors;
  }
  return NextResponse.json(body, { status });
}
