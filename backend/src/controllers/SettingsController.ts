import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SettingsController {
  async getProfile(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      return res.json(user);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar perfil.' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const { name, email } = req.body;

      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, id: { not: req.userId } },
        });
        if (existing) {
          return res.status(400).json({ error: 'E-mail já está em uso.' });
        }
      }

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { name, email },
        select: { id: true, name: true, email: true, avatarUrl: true },
      });

      return res.json(user);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(400).json({ error: 'Senha atual incorreta.' });

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.userId },
        data: { password: hashed },
      });

      return res.json({ message: 'Senha alterada com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao alterar senha.' });
    }
  }

  async getPreferences(req: Request, res: Response) {
    try {
      let prefs = await prisma.userPreference.findUnique({
        where: { userId: req.userId },
      });

      if (!prefs) {
        prefs = await prisma.userPreference.create({
          data: {
            userId: req.userId!,
            currency: 'BRL',
            theme: 'light',
            language: 'pt-BR',
            notificationsEnabled: true,
          },
        });
      }

      return res.json(prefs);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar preferências.' });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    try {
      const { currency, theme, language, notificationsEnabled } = req.body;

      const prefs = await prisma.userPreference.upsert({
        where: { userId: req.userId },
        update: { currency, theme, language, notificationsEnabled },
        create: {
          userId: req.userId!,
          currency: currency ?? 'BRL',
          theme: theme ?? 'light',
          language: language ?? 'pt-BR',
          notificationsEnabled: notificationsEnabled ?? true,
        },
      });

      return res.json(prefs);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar preferências.' });
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
      const { password } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(400).json({ error: 'Senha incorreta.' });

      await prisma.user.delete({ where: { id: req.userId } });

      return res.json({ message: 'Conta excluída com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao excluir conta.' });
    }
  }

  async exportData(req: Request, res: Response) {
    try {
      const [transactions, budgets, goals] = await Promise.all([
        prisma.transaction.findMany({ where: { userId: req.userId } }),
        prisma.budget.findMany({ where: { userId: req.userId } }),
        prisma.goal.findMany({ where: { userId: req.userId } }),
      ]);

      return res.json({ transactions, budgets, goals });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao exportar dados.' });
    }
  }
}
