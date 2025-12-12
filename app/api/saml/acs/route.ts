import { NextRequest, NextResponse } from 'next/server';

/**
 * SAML Assertion Consumer Service (ACS) API endpoint
 * Handles POST requests from IdP with SAMLResponse
 * This is a separate API route that redirects to the callback page
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = formData.get('RelayState') as string | null;

    if (!samlResponse) {
      return NextResponse.json(
        { error: 'No SAML response received' },
        { status: 400 }
      );
    }

    // Redirect to the callback page with the SAMLResponse in query params
    const callbackUrl = new URL('/callback/saml', request.url);
    callbackUrl.searchParams.set('SAMLResponse', samlResponse);
    if (relayState) {
      callbackUrl.searchParams.set('RelayState', relayState);
    }

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

