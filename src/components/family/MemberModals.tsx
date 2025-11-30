"use client";

import { useState } from "react";
import { useZodForm } from "@/hooks/useZodForm";
import { inviteMemberSchema, updateMemberRoleSchema } from "@/lib/validation";
import type {
  InviteMemberInput,
  UpdateMemberRoleInput,
} from "@/lib/validation";
import { analytics } from "@/lib/monitoring";

interface Props {
  onSuccess?: () => void;
}

/**
 * Add Family Member Modal
 * Form to invite new family member with validation
 */
export function AddMemberModal({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useZodForm(inviteMemberSchema);

  const onSubmit = async (data: InviteMemberInput) => {
    setIsSubmitting(true);
    setInviteLink("");

    try {
      const response = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mengirim undangan");
      }

      const result = await response.json();
      setInviteLink(result.invitation.inviteLink);

      // Track event
      analytics.trackFormSubmit("Invite Member", true);

      // Reset form
      reset();

      // Call success callback
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      alert(error.message || "Gagal mengirim undangan");
      analytics.trackFormSubmit("Invite Member", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Link berhasil disalin!");
      analytics.trackButtonClick("Copy Invite Link");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          analytics.trackButtonClick("Open Add Member Modal");
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
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
        Undang Anggota
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Undang Anggota Baru
          </h2>
          <button
            onClick={() => {
              setIsOpen(false);
              reset();
              setInviteLink("");
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Success Message with Invite Link */}
        {inviteLink && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 font-semibold mb-2">
              ✅ Undangan berhasil dibuat!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mb-3">
              Salin link di bawah dan kirimkan ke email yang diundang:
            </p>
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
              >
                📋 Salin
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Anggota Baru
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="contoh@email.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.email
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Undangan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                reset();
                setInviteLink("");
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>

        {/* Info */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          💡 Anggota baru akan menerima link undangan yang harus mereka gunakan
          untuk bergabung dengan keluarga Anda.
        </p>
      </div>
    </div>
  );
}

/**
 * Edit Member Role Modal
 */
interface EditRoleModalProps {
  member: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "VIEWER";
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditMemberRoleModal({
  member,
  onClose,
  onSuccess,
}: EditRoleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(updateMemberRoleSchema, {
    defaultValues: {
      userId: member.id,
      role: member.role,
    },
  });

  const onSubmit = async (data: UpdateMemberRoleInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/family/members/${member.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: data.role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mengubah role");
      }

      // Track event
      analytics.trackFormSubmit("Update Member Role", true);

      alert("Role berhasil diubah!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating role:", error);
      alert(error.message || "Gagal mengubah role");
      analytics.trackFormSubmit("Update Member Role", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Ubah Role Anggota
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Member Info */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {member.name}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {member.email}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register("userId")} />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              {...register("role")}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.role
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              disabled={isSubmitting}
            >
              <option value="ADMIN">Admin - Akses penuh</option>
              <option value="MEMBER">Member - Akses terbatas</option>
              <option value="VIEWER">Viewer - Hanya lihat</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Role Descriptions */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
            <p className="mb-1">
              <strong>Admin:</strong> Dapat mengelola anggota, budget, dan semua
              data
            </p>
            <p className="mb-1">
              <strong>Member:</strong> Dapat melihat dan menambah transaksi
            </p>
            <p>
              <strong>Viewer:</strong> Hanya dapat melihat data, tidak dapat
              mengubah
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
