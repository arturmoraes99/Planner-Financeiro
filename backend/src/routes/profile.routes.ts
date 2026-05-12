import { Router } from "express";
import { ProfileController } from "@/modules/users/controllers/ProfileController";
import { ensureAuthenticated } from "@/middlewares/ensureAuthenticated";
import { uploadAvatar } from "@/middlewares/uploadMiddleware";

const profileRouter = Router();
const controller = new ProfileController();

profileRouter.use(ensureAuthenticated);

profileRouter.get("/", controller.show);
profileRouter.put("/", uploadAvatar.single("avatar"), controller.update);
profileRouter.delete("/avatar", controller.removeAvatar);

export { profileRouter };
