'use client';

import { useEffect, useState } from 'react';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: Date;
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'MEMBER' | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/family/members');
      
      if (response.status === 403) {
        setCurrentUserRole('MEMBER');
        setError('Anda tidak memiliki akses ke halaman ini. Hanya admin yang dapat mengelola anggota keluarga.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Gagal memuat data anggota keluarga');
      }

      const data = await response.json();
      setMembers(data.members || []);
      setCurrentUserRole('ADMIN');
    } catch (err) {
      console.error('Fetch members error:', err);
      setError('Gagal memuat data anggota keluarga');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviteLink('');
    setInviting(true);

    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Gagal mengirim undangan');
        setInviting(false);
        return;
      }

      setInviteSuccess(`Undangan berhasil dibuat untuk ${inviteEmail}`);
      setInviteLink(data.invitation.inviteLink);
      setInviteEmail('');
    } catch (err) {
      console.error('Invite error:', err);
      setInviteError('Terjadi kesalahan saat mengirim undangan');
    } finally {
      setInviting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link berhasil disalin!');
    } catch (err) {
      console.error('Copy failed:', err);
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

  const getRoleBadge = (role: 'ADMIN' | 'MEMBER') => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
        Anggota
      </span>
    );
  };

  // If user is not ADMIN, show access denied
  if (!loading && currentUserRole === 'MEMBER') {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Akses Ditolak
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Hanya admin yang dapat mengelola anggota keluarga.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Keluarga
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola anggota keluarga dan undang anggota baru
        </p>
      </div>

      {/* Invite Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Undang Anggota Baru
        </h2>
        
        {inviteSuccess && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <p className="mb-2">{inviteSuccess}</p>
            {inviteLink && (
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1">Link Undangan:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(inviteLink)}
                    className="px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                    title="Salin link"
                  >
                    📋 Salin
                  </button>
                </div>
                <p className="text-xs mt-2 text-green-600 dark:text-green-400">
                  Kirimkan link ini ke email yang diundang.
                </p>
              </div>
            )}
          </div>
        )}

        {inviteError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {inviteError}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Masukkan email anggota baru"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required
            disabled={inviting}
          />
          <button
            type="submit"
            disabled={inviting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {inviting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Mengirim...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Undang
              </>
            )}
          </button>
        </form>

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          💡 <strong>Catatan MVP:</strong> Setelah membuat undangan, salin link yang muncul dan kirimkan ke email yang diundang. 
          Dalam versi produksi, link akan dikirim otomatis via email.
        </p>
      </div>

      {/* Error Message */}
      {error && !currentUserRole && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Memuat data...</p>
        </div>
      )}

      {/* Members List */}
      {!loading && currentUserRole === 'ADMIN' && members.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Anggota Keluarga ({members.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <div
                key={member.id}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {member.name}
                        </h3>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Bergabung
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(member.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && currentUserRole === 'ADMIN' && members.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Belum Ada Anggota
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Mulai undang anggota keluarga menggunakan form di atas
          </p>
        </div>
      )}
    </div>
  );
}
