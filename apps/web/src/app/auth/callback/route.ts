import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const mode = searchParams.get('mode') ?? 'login';
  // if "next" is in param, use that as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value, options } of cookies) {
          request.cookies.set({ name, value, ...options });
        }
      },
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: cookieStore,
      },
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Get user info
      const user = data.session.user;
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;
      const email = user.email;
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        email?.split('@')[0] ||
        'Google User';

      if (!email) {
        return NextResponse.redirect(`${origin}/login?error=no_email_from_google`);
      }

      // Exchange Supabase session for our own JWT by calling our backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
          supabaseUserId: user.id,
          providerToken,
          providerRefreshToken,
          mode,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(err?.error?.message ?? 'google_login_failed')}`,
        );
      }

      const json = await res.json();
      const accessToken = json.data?.tokens?.accessToken;
      const refreshToken = json.data?.tokens?.refreshToken;
      const userJson = JSON.stringify(json.data?.user);

      // Redirect to a client-side page that stores tokens + redirects to dashboard
      const redirectUrl = new URL(`${origin}/auth/success`);
      redirectUrl.searchParams.set('next', next);
      const response = NextResponse.redirect(redirectUrl);
      // Pass tokens via short-lived httpOnly cookies so the success page can pick them up
      response.cookies.set('smarterp_google_access', accessToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60,
      });
      response.cookies.set('smarterp_google_refresh', refreshToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60,
      });
      response.cookies.set('smarterp_google_user', userJson, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60,
      });
      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=google_callback_failed`);
}
