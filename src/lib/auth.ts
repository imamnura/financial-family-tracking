import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';

/**
 * User Role Type
 */
export type Role = 'ADMIN' | 'MEMBER';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  familyId: string | null;
  iat?: number;
  exp?: number;
}

/**
 * Session User Interface
 */
export interface SessionUser {
  userId: string;
  email: string;
  role: Role;
  familyId: string | null;
}

/**
 * Auth Cookie Configuration
 */
const AUTH_COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get secret key for JWT signing/verification
 */
function getSecretKey(): Uint8Array {
  const secret = env.jwt.secret;
  return new TextEncoder().encode(secret);
}

/**
 * Sign JWT token
 * 
 * @param payload - User data to encode in token
 * @returns JWT token string
 * 
 * @example
 * ```typescript
 * const token = await signToken({
 *   userId: 'user-id',
 *   email: 'user@example.com',
 *   role: 'ADMIN',
 *   familyId: 'family-id'
 * });
 * ```
 */
export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    const secret = getSecretKey();
    
    const token = await new SignJWT(payload as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.jwt.expiresIn)
      .sign(secret);

    return token;
  } catch (error) {
    console.error('Error signing token:', error);
    throw new Error('Failed to sign token');
  }
}

/**
 * Verify JWT token
 * 
 * @param token - JWT token to verify
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 * 
 * @example
 * ```typescript
 * try {
 *   const payload = await verifyToken(token);
 *   console.log('User ID:', payload.userId);
 * } catch (error) {
 *   console.error('Invalid token');
 * }
 * ```
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const secret = getSecretKey();
    
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as Role,
      familyId: payload.familyId as string | null,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Token expired');
      }
      if (error.message.includes('signature')) {
        throw new Error('Invalid token signature');
      }
    }
    throw new Error('Invalid token');
  }
}

/**
 * Set authentication cookie with JWT token
 * 
 * @param payload - User data to encode in token
 * @returns The generated token
 * 
 * @example
 * ```typescript
 * await setAuthCookie({
 *   userId: user.id,
 *   email: user.email,
 *   role: user.role,
 *   familyId: user.familyId
 * });
 * ```
 */
export async function setAuthCookie(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    const token = await signToken(payload);
    
    const cookieStore = await cookies();
    
    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: env.cookie.secure,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return token;
  } catch (error) {
    console.error('Error setting auth cookie:', error);
    throw new Error('Failed to set authentication cookie');
  }
}

/**
 * Clear authentication cookie (logout)
 * 
 * @example
 * ```typescript
 * await clearAuthCookie();
 * ```
 */
export async function clearAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    
    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: env.cookie.secure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  } catch (error) {
    console.error('Error clearing auth cookie:', error);
    throw new Error('Failed to clear authentication cookie');
  }
}

/**
 * Get current user session from cookie
 * 
 * @returns User session or null if not authenticated
 * 
 * @example
 * ```typescript
 * const session = await getCurrentSession();
 * if (session) {
 *   console.log('Logged in as:', session.email);
 * } else {
 *   console.log('Not logged in');
 * }
 * ```
 */
export async function getCurrentSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME);

    if (!token?.value) {
      return null;
    }

    const payload = await verifyToken(token.value);

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      familyId: payload.familyId,
    };
  } catch (error) {
    // Invalid or expired token
    console.error('Error getting current session:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 * 
 * @returns User session
 * @throws Error if not authenticated
 * 
 * @example
 * ```typescript
 * const session = await requireAuth();
 * // Guaranteed to have session here
 * ```
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('Unauthorized: Authentication required');
  }

  return session;
}

/**
 * Require admin role - throws error if not admin
 * 
 * @returns Admin user session
 * @throws Error if not authenticated or not admin
 * 
 * @example
 * ```typescript
 * const adminSession = await requireAdmin();
 * // Guaranteed to be admin here
 * ```
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();

  if (session.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required');
  }

  return session;
}

/**
 * Check if user belongs to a family
 * 
 * @param session - User session
 * @throws Error if user has no family
 * 
 * @example
 * ```typescript
 * const session = await requireAuth();
 * await requireFamily(session);
 * // User has a family
 * ```
 */
export async function requireFamily(session: SessionUser): Promise<void> {
  if (!session.familyId) {
    throw new Error('Forbidden: Family membership required');
  }
}

/**
 * Validate family access - checks if user belongs to the specified family
 * 
 * @param session - User session
 * @param familyId - Family ID to check
 * @throws Error if user doesn't belong to the family
 * 
 * @example
 * ```typescript
 * await validateFamilyAccess(session, 'family-id');
 * ```
 */
export async function validateFamilyAccess(
  session: SessionUser,
  familyId: string
): Promise<void> {
  if (session.familyId !== familyId) {
    throw new Error('Forbidden: Access denied to this family');
  }
}

/**
 * Get token from request headers (for API calls)
 * 
 * @param authHeader - Authorization header value
 * @returns Token string or null
 * 
 * @example
 * ```typescript
 * const token = getTokenFromHeader(request.headers.get('authorization'));
 * ```
 */
export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Verify session from either cookie or Authorization header
 * Useful for API routes that can accept both
 * 
 * @param authHeader - Optional Authorization header
 * @returns User session or null
 * 
 * @example
 * ```typescript
 * const session = await getSessionFromRequest(
 *   request.headers.get('authorization')
 * );
 * ```
 */
export async function getSessionFromRequest(
  authHeader?: string | null
): Promise<SessionUser | null> {
  // Try cookie first
  const cookieSession = await getCurrentSession();
  if (cookieSession) {
    return cookieSession;
  }

  // Try Authorization header
  if (authHeader) {
    const token = getTokenFromHeader(authHeader);
    if (token) {
      try {
        const payload = await verifyToken(token);
        return {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          familyId: payload.familyId,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}
