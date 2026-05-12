import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nome deve ter ao menos 2 caracteres")
      .max(100)
      .optional(),

    email: z
      .string()
      .email("E-mail inválido")
      .optional(),

    currentPassword: z.string().optional(),

    newPassword: z
      .string()
      .min(8, "A nova senha deve ter ao menos 8 caracteres")
      .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter ao menos um número")
      .optional(),

    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword || data.confirmNewPassword) {
        return data.newPassword === data.confirmNewPassword;
      }
      return true;
    },
    {
      message: "As senhas não coincidem",
      path: ["confirmNewPassword"],
    }
  )
  .refine(
    (data) => {
      if (data.newPassword) {
        return !!data.currentPassword;
      }
      return true;
    },
    {
      message: "Informe a senha atual para alterá-la",
      path: ["currentPassword"],
    }
  );
