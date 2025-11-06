'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InvitationInfo {
  id: string;
  email: string;
  familyId: string;
  familyName: string;
  inviterName: string;
  expiresAt: Date;
}

interface CurrentUser {
  userId: string;
  email: string;
  role: string;
  familyId: string | null;
}

export default function InvitePage(props: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [params, setParams] = useState<{ token: string } | null>(null);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  // Unwrap params
  useEffect(() => {
    props.params.then(setParams);
  }, [props.params]);

  useEffect(() => {
    if (!params) return;

    const checkSessionAndInvitation = async () => {
      try {
        setLoading(true);
        setError('');

        // Check current session
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        if (sessionResponse.ok && sessionData.user) {
          setCurrentUser(sessionData.user);
        }

        // Validate invitation
        const inviteResponse = await fetch(`/api/family/validate-invitation/${params.token}`);
        const inviteData = await inviteResponse.json();

        if (!inviteResponse.ok) {
          setError(inviteData.error || 'Undangan tidak valid');
          setLoading(false);
          return;
        }

        setInvitation(inviteData.invitation);
      } catch (err) {
        console.error('Validation error:', err);
        setError('Terjadi kesalahan saat memvalidasi undangan');
      } finally {
        setLoading(false);
      }
    };

    checkSessionAndInvitation();
  }, [params]);

  const handleAcceptInvite = async () => {
    if (!currentUser || !invitation || !params) return;

    setAccepting(true);
    setError('');

    try {
      const response = await fetch('/api/family/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal menerima undangan');
        setAccepting(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard?invited=true');
      router.refresh();
    } catch (err) {
      console.error('Accept invite error:', err);
      setError('Terjadi kesalahan saat menerima undangan');
      setAccepting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (!params || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memvalidasi undangan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Undangan Tidak Valid
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Undangan Tidak Ditemukan
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Link undangan tidak ditemukan atau sudah tidak berlaku.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  // Scenario 1: User already logged in
  if (currentUser) {
    // Check if user already has a family
    if (currentUser.familyId && currentUser.familyId !== invitation.familyId) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Sudah Bergabung dengan Keluarga Lain
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Anda sudah menjadi anggota keluarga lain. Untuk menerima undangan ini, Anda perlu keluar dari keluarga saat ini terlebih dahulu.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      );
    }

    // Check if user's email matches invitation
    if (currentUser.email !== invitation.email) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email Tidak Sesuai
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Undangan ini ditujukan untuk <strong>{invitation.email}</strong>, tetapi Anda login sebagai <strong>{currentUser.email}</strong>.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  fetch('/api/auth/logout', { method: 'POST' })
                    .then(() => router.push(`/login?redirect=/invite/${params.token}`));
                }}
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Logout & Login dengan Email yang Benar
              </button>
              <Link
                href="/dashboard"
                className="block w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // User is logged in with correct email
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Undangan Keluarga
            </h1>
          </div>

          {/* Invitation Details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Anda diundang untuk bergabung dengan:
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {invitation.familyName}
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Diundang oleh:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {invitation.inviterName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {invitation.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Berlaku hingga:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDate(invitation.expiresAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Current User Info */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✓ Anda login sebagai <strong>{currentUser.email}</strong>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </span>
              ) : (
                'Gabung Keluarga'
              )}
            </button>

            <Link
              href="/dashboard"
              className="block w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Batal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Scenario 2: User not logged in
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Undangan Keluarga
          </h1>
        </div>

        {/* Invitation Details */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Anda diundang untuk bergabung dengan:
          </p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {invitation.familyName}
          </h2>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Diundang oleh:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {invitation.inviterName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Email:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {invitation.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Berlaku hingga:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(invitation.expiresAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            💡 <strong>Catatan:</strong> Anda harus mendaftar menggunakan email{' '}
            <strong>{invitation.email}</strong> untuk menerima undangan ini.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href={`/register?token=${params.token}&email=${encodeURIComponent(invitation.email)}`}
            className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Daftar & Bergabung
          </Link>

          <Link
            href={`/login?redirect=/invite/${params.token}`}
            className="block w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Sudah punya akun? Login
          </Link>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
          Dengan bergabung, Anda akan menjadi anggota keluarga dan dapat mengakses
          semua data finansial keluarga.
        </p>
      </div>
    </div>
  );
}
