import http from 'k6/http';
import { check } from 'k6';

/**
 * Pre-authenticates test users during setup() phase.
 * Prevents CPU-heavy PBKDF2 password hashing inside the main benchmark loop.
 */
export function initTokenPool(baseUrl, userList) {
  console.log(`[Token Pool] Authenticating ${userList.length} test users during setup()...`);
  const tokenPool = [];

  for (const user of userList) {
    const res = http.post(
      `${baseUrl}/api/auth/login`,
      JSON.stringify({
        emailOrUsername: user.email,
        password: user.password,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const ok = check(res, {
      [`Login OK for ${user.email}`]: (r) => r.status === 200,
    });

    if (ok) {
      const data = res.json();
      tokenPool.push({
        email: user.email,
        token: data.token,
        userId: data.user ? data.user.id : null,
      });
    } else {
      console.warn(`[Token Pool] Failed to login user: ${user.email}, Status: ${res.status}`);
    }
  }

  if (tokenPool.length === 0) {
    throw new Error('[Token Pool] Critical: Could not authenticate any users in setup()!');
  }

  console.log(`[Token Pool] Successfully initialized pool with ${tokenPool.length} active JWT tokens.`);
  return tokenPool;
}

/**
 * Obtains an authenticated session for a specific Virtual User.
 * Distributes users cyclically: VU 1 -> User A, VU 2 -> User B, etc.
 */
export function getVuSession(tokenPool, vuId) {
  const session = tokenPool[vuId % tokenPool.length];
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
    userEmail: session.email,
    userId: session.userId,
  };
}
