import { Request, Response } from "express";
import { UpdateProfileService } from "../services/UpdateProfileService";
import { updateProfileSchema } from "../validators/profileValidator";
import { ZodError } from "zod";

export class ProfileController {
  // GET /profile
  async show(req: Request, res: Response): Promise<Response> {
    const { id, name, email, avatarUrl, createdAt } = req.user!;

    return res.json({
      id,
      name,
      email,
      avatarUrl,
      createdAt,
    });
  }

  // PUT /profile
  async update(req: Request, res: Response): Promise<Response> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const avatarFilename = req.file?.filename;

      const service = new UpdateProfileService();
      const updatedUser = await service.execute({
        userId: req.user!.id,
        ...validated,
        avatarFilename,
      });

      return res.json({
        message: "Perfil atualizado com sucesso",
        user: updatedUser,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: err.flatten().fieldErrors,
        });
      }
      throw err;
    }
  }

  // DELETE /profile/avatar
  async removeAvatar(req: Request, res: Response): Promise<Response> {
    const service = new UpdateProfileService();
    const updatedUser = await service.execute({
      userId: req.user!.id,
      avatarFilename: "remove",
    });

    return res.json({
      message: "Avatar removido com sucesso",
      user: updatedUser,
    });
  }
}
