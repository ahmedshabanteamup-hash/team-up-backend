import { asyncHandeler, successResponse } from "../../utils/response.js";
import { userModel } from "../../DB/models/user.model.js";
import { projectModel } from "../../DB/models/project.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";

export const getLandingStats = asyncHandeler(async (req, res, next) => {
  const [totalUsers, projectsCompleted, activeTeams, ratingSummary] = await Promise.all([
    userModel.countDocuments({}),
    projectModel.countDocuments({ status: "completed", deletedAt: { $exists: false } }),
    projectModel.countDocuments({ status: "ongoing", deletedAt: { $exists: false } }),
    ratingModel.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$overall" },
        },
      },
    ]),
  ]);

  const averageRatingRaw = ratingSummary[0]?.averageRating || 0;
  const averageRating = Number(averageRatingRaw.toFixed(1));

  return successResponse({
    res,
    message: "landing stats fetched successfully",
    data: {
      totalUsers,
      projectsCompleted,
      activeTeams,
      averageRating,
    },
  });
});
