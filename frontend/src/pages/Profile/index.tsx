import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { toast } from "react-hot-toast";
import { AvatarUpload } from "./AvatarUpload";
import { ProfileForm } from "./ProfileForm";
import styles from "./profile.module.css";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserProfile>("/profile")
      .then((res) => setProfile(res.data))
      .catch(() => toast.error("Erro ao carregar perfil"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    updateUser(updatedProfile);
    toast.success("Perfil atualizado com sucesso! ✅");
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Meu Perfil</h1>
        <p className={styles.subtitle}>
          Gerencie suas informações pessoais e segurança
        </p>
      </header>

      <div className={styles.content}>
        {/* Coluna Esquerda: Avatar + Info resumida */}
        <aside className={styles.sidebar}>
          <AvatarUpload profile={profile!} onUpdate={handleUpdate} />
          <div className={styles.memberSince}>
            <span>Membro desde</span>
            <strong>
              {new Date(profile!.createdAt).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>
        </aside>

        {/* Coluna Direita: Formulário */}
        <main className={styles.main}>
          <ProfileForm profile={profile!} onUpdate={handleUpdate} />
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
