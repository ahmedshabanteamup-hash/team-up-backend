import { projectModel } from "../../DB/models/project.model.js";
import * as dbService from "../../DB/db.service.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import { roleEnum } from "../../DB/models/user.model.js";

export const createProject = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;
  const { title, description, teamSize } = req.body;

  // 1️⃣ role check
  if (req.user.role !== roleEnum.client) {
    return next(new Error("only client can create project", { cause: 403 }));
  }

  // 2️⃣ create project
  const project = await dbService.create({
    model: projectModel,
    data: [
      {
        client: userId,
        title,
        description,
        teamSize,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "project created successfully",
    data: { project },
  });
});





