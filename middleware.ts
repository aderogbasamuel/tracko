import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Minimal passthrough middleware to satisfy Next.js export requirement.
  return NextResponse.next();
}
