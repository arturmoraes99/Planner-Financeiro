import { prisma } from "@/lib/prisma";
import { AppError } from "@/errors/AppError";
import { UpdateProfileDTO } from "../dtos/UpdateProfileDTO";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

interface UpdateProfileParams extends UpdateProfileDTO {
  userId: string;
  avatarFilename?: string;
}

export class UpdateProfileService {
  async execute({
    userId,
    name,
    email,
    currentPassword,
    newPassword,
    avatarFilename,
  }: UpdateProfileParams) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    // Verifica se e-mail já está em uso por outro usuário
    if (email && email !== user.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse) {
        throw new AppError("E-mail já está em uso", 409);
      }
    }

    // Validação e troca de senha
    let hashedPassword: string | undefined;
    if (newPassword) {
      if (!currentPassword) {
        throw new AppError("Informe a senha atual", 400);
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        throw new AppError("Senha atual incorreta", 401);
      }

      hashedPassword = await bcrypt.hash(newPassword, 12);
    }

    // Remove avatar antigo se novo for enviado
    if (avatarFilename && user.avatarUrl) {
      const oldAvatarPath = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "uploads",
        "avatars",
        path.basename(user.avatarUrl)
      );
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(avatarFilename && {
          avatarUrl: `/uploads/avatars/${avatarFilename}`,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }
}
