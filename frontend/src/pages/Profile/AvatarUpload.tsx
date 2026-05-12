import React, { useRef, useState } from "react";
import { api } from "@/services/api";
import { toast } from "react-hot-toast";
import { FiCamera, FiTrash2 } from "react-icons/fi";
import { UserProfile } from "./index";
import styles from "./profile.module.css";

interface Props {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

export const AvatarUpload: React.FC<Props> = ({ profile, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const getAvatarSrc = () => {
    if (profile.avatarUrl) {
      return profile.avatarUrl.startsWith("http")
        ? profile.avatarUrl
        : `${import.meta.env.VITE_API_URL}${profile.avatarUrl}`;
    }
    return null;
  };

  const getInitials = () => {
    return profile.name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setUploading(true);
    try {
      const res = await api.put<{ user: UserProfile }>("/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpdate(res.data.user);
      toast.success("Avatar atualizado!");
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
      // Reset input para permitir reenvio do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile.avatarUrl) return;
    try {
      const res = await api.delete<{ user: UserProfile }>("/profile/avatar");
      onUpdate(res.data.user);
      toast.success("Avatar removido");
    } catch {
      toast.error("Erro ao remover avatar");
    }
  };

  return (
    <div className={styles.avatarWrapper}>
      <div className={styles.avatarContainer}>
        {getAvatarSrc() ? (
          <img
            src={getAvatarSrc()!}
            alt={profile.name}
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarInitials}>{getInitials()}</div>
        )}

        {uploading && (
          <div className={styles.avatarOverlay}>
            <div className={styles.spinnerSmall} />
          </div>
        )}

        <button
          className={styles.avatarEditBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Alterar foto"
        >
          <FiCamera size={16} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      <div className={styles.avatarInfo}>
        <strong>{profile.name}</strong>
        <span>{profile.email}</span>
      </div>

      {profile.avatarUrl && (
        <button
          className={styles.removeAvatarBtn}
          onClick={handleRemoveAvatar}
        >
          <FiTrash2 size={14} />
          Remover foto
        </button>
      )}
    </div>
  );
};
