import {
  requestAccountDeletion,
  processAccountDeletion,
} from "../services/accountDeletion.service.js";
export async function deleteAccountController(req, res, next) {
  try {
    const result = await requestAccountDeletion({
      userId: req.user.userId,
      password: req.body.password,
    });
    const io = req.app.get("io");
    io?.in(`user:${req.user.userId}`).disconnectSockets(true);
    const completed = await processAccountDeletion({
      userId: req.user.userId,
      io,
    });
    const response = completed
      ? {
          status: "completed",
          message:
            "Your account and associated personal records have been deleted.",
        }
      : result;
    res.status(completed ? 200 : 202).json(response);
  } catch (error) {
    next(error);
  }
}
