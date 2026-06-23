import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_req: NextRequest) {
  const store = await cookies();
  const accessToken = store.get('smarterp_google_access')?.value;
  const refreshToken = store.get('smarterp_google_refresh')?.value;
  const userJson = store.get('smarterp_google_user')?.value;

  // Clear the short-lived cookies immediately
  store.delete('smarterp_google_access');
  store.delete('smarterp_google_refresh');
  store.delete('smarterp_google_user');

  if (!accessToken || !refreshToken || !userJson) {
    return NextResponse.json({ error: 'No Google session to consume' }, { status: 400 });
  }

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: JSON.parse(userJson),
  });
}
