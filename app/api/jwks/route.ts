import { NextRequest, NextResponse } from 'next/server';
import { fetchJWKS } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  try {
    const jwks = await fetchJWKS(url);
    return NextResponse.json(jwks);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch JWKS' },
      { status: 500 }
    );
  }
}

