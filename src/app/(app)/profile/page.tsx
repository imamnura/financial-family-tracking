"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  Lock,
} from "lucide-react";
import { Card, Button, Input, Loading } from "@/components/ui";
import { toast } from "@/store/useNotificationStore";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/me");
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Gagal memuat profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedProfile),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const updated = await response.json();
      setProfile(updated);
      setIsEditing(false);
      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Password baru tidak cocok");
      return;
    }

    if (passwords.new.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    try {
      const response = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      if (!response.ok) throw new Error("Failed to change password");

      setPasswords({ current: "", new: "", confirm: "" });
      setIsChangingPassword(false);
      toast.success("Password berhasil diubah");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Gagal mengubah password");
    }
  };

  const handleAvatarUpload = () => {
    toast.info("Fitur upload avatar akan segera hadir");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card variant="elevated" padding="lg">
          <p className="text-gray-600 dark:text-gray-400">
            Gagal memuat profil
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Profil Saya
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Kelola informasi profil Anda
          </p>
        </div>

        {/* Profile Card */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={handleAvatarUpload}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {profile.email}
                  </p>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    leftIcon={<Edit2 className="w-4 h-4" />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profil
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{profile.phone || "Belum diisi"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.address || "Belum diisi"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Bergabung{" "}
                    {new Date(profile.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        {isEditing && (
          <Card variant="elevated" padding="lg" className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Profil
            </h3>
            <div className="space-y-4">
              <Input
                label="Nama Lengkap"
                value={editedProfile.name || ""}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, name: e.target.value })
                }
                leftIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="Email"
                type="email"
                value={editedProfile.email || ""}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, email: e.target.value })
                }
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Nomor Telepon"
                value={editedProfile.phone || ""}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, phone: e.target.value })
                }
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Alamat"
                value={editedProfile.address || ""}
                onChange={(e) =>
                  setEditedProfile({
                    ...editedProfile,
                    address: e.target.value,
                  })
                }
                leftIcon={<MapPin className="w-4 h-4" />}
              />

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveProfile}
                >
                  Simpan
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<X className="w-4 h-4" />}
                  onClick={handleCancelEdit}
                >
                  Batal
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Change Password */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ubah Password
            </h3>
            {!isChangingPassword && (
              <Button
                variant="outline"
                leftIcon={<Lock className="w-4 h-4" />}
                onClick={() => setIsChangingPassword(true)}
              >
                Ubah Password
              </Button>
            )}
          </div>

          {isChangingPassword && (
            <div className="space-y-4">
              <Input
                label="Password Saat Ini"
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                leftIcon={<Lock className="w-4 h-4" />}
              />
              <Input
                label="Password Baru"
                type="password"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                leftIcon={<Lock className="w-4 h-4" />}
                hint="Minimal 8 karakter"
              />
              <Input
                label="Konfirmasi Password Baru"
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                leftIcon={<Lock className="w-4 h-4" />}
                error={
                  passwords.confirm && passwords.new !== passwords.confirm
                    ? "Password tidak cocok"
                    : undefined
                }
              />

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleChangePassword}
                >
                  Simpan Password
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<X className="w-4 h-4" />}
                  onClick={() => {
                    setPasswords({ current: "", new: "", confirm: "" });
                    setIsChangingPassword(false);
                  }}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
