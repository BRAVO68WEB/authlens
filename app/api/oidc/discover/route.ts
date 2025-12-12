import { NextRequest, NextResponse } from 'next/server';
import { fetchDiscoveryDocument } from '@/lib/oidc';

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
    const discovery = await fetchDiscoveryDocument(url);
    return NextResponse.json(discovery);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}

