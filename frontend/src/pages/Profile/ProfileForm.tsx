import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/services/api";
import { UserProfile } from "./index";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import styles from "./profile.module.css";

const schema = z
  .object({
    name: z.string().min(2, "Nome muito curto"),
    email: z.string().email("E-mail inválido"),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Deve ter ao menos uma maiúscula")
      .regex(/[0-9]/, "Deve ter ao menos um número")
      .optional()
      .or(z.literal("")),
    confirmNewPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.newPassword || d.newPassword === d.confirmNewPassword,
    { message: "As senhas não coincidem", path: ["confirmNewPassword"] }
  );

type FormData = z.infer<typeof schema>;

interface Props {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

export const ProfileForm: React.FC<Props> = ({ profile, onUpdate }) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Record<string, string> = {
        name: data.name,
        email: data.email,
      };

      if (data.newPassword) {
        payload.currentPassword = data.currentPassword ?? "";
        payload.newPassword = data.newPassword;
        payload.confirmNewPassword = data.confirmNewPassword ?? "";
      }

      const res = await api.put<{ user: UserProfile }>("/profile", payload);
      onUpdate(res.data.user);
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof FormData, {
            message: (messages as string[])[0],
          });
        });
      } else {
        setError("root", {
          message: err.response?.data?.message ?? "Erro ao salvar perfil",
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      {/* Informações Pessoais */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Informações Pessoais</h2>

        {/* Nome */}
        <div className={styles.fieldGroup}>
          <label htmlFor="name">Nome completo</label>
          <div className={styles.inputWrapper}>
            <FiUser className={styles.inputIcon} />
            <input
              id="name"
              type="text"
              placeholder="Seu nome completo"
              className={errors.name ? styles.inputError : ""}
              {...register("name")}
            />
          </div>
          {errors.name && (
            <span className={styles.errorMsg}>{errors.name.message}</span>
          )}
        </div>

        {/* E-mail */}
        <div className={styles.fieldGroup}>
          <label htmlFor="email">E-mail</label>
          <div className={styles.inputWrapper}>
            <FiMail className={styles.inputIcon} />
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className={errors.email ? styles.inputError : ""}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <span className={styles.errorMsg}>{errors.email.message}</span>
          )}
        </div>
      </section>

      {/* Segurança */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Segurança</h2>
        <p className={styles.sectionHint}>
          Preencha apenas se desejar alterar sua senha
        </p>

        {/* Senha Atual */}
        <div className={styles.fieldGroup}>
          <label htmlFor="currentPassword">Senha atual</label>
          <div className={styles.inputWrapper}>
            <FiLock className={styles.inputIcon} />
            <input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              placeholder="••••••••"
              {...register("currentPassword")}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowCurrent((v) => !v)}
            >
              {showCurrent ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.currentPassword && (
            <span className={styles.errorMsg}>
              {errors.currentPassword.message}
            </span>
          )}
        </div>

        {/* Nova Senha */}
        <div className={styles.fieldGroup}>
          <label htmlFor="newPassword">Nova senha</label>
          <div className={styles.inputWrapper}>
            <FiLock className={styles.inputIcon} />
            <input
              id="newPassword"
              type={showNew ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              {...register("newPassword")}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.newPassword && (
            <span className={styles.errorMsg}>{errors.newPassword.message}</span>
          )}

          {/* Indicador de força da senha */}
          {newPasswordValue && (
            <PasswordStrength password={newPasswordValue} />
          )}
        </div>

        {/* Confirmar Nova Senha */}
        <div className={styles.fieldGroup}>
          <label htmlFor="confirmNewPassword">Confirmar nova senha</label>
          <div className={styles.inputWrapper}>
            <FiLock className={styles.inputIcon} />
            <input
              id="confirmNewPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repita a nova senha"
              {...register("confirmNewPassword")}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.confirmNewPassword && (
            <span className={styles.errorMsg}>
              {errors.confirmNewPassword.message}
            </span>
          )}
        </div>
      </section>

      {errors.root && (
        <div className={styles.rootError}>{errors.root.message}</div>
      )}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.btnSave}
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
};

// PasswordStrength helper
const getStrength = (pwd: string): { label: string; score: number } => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"];
  return { label: labels[score] ?? "Muito fraca", score };
};

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const { label, score } = getStrength(password);
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

  return (
    <div style={{ marginTop: "6px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i < score ? colors[score] : "#e5e7eb",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "0.75rem", color: colors[score] }}>
        {label}
      </span>
    </div>
  );
};
