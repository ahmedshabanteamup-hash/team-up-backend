import { projectModel } from "../../DB/models/project.model.js";
import * as dbService from "../../DB/db.service.js";
import {  asyncHandeler, successResponse } from "../../utils/response.js";
import { roleEnum } from "../../DB/models/user.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";

export const rateClient = asyncHandeler(async (req, res, next) => {
  const developerId = req.user._id;
  const { projectId, clientId, ratings } = req.body;

  // 1️⃣ role check 
  if (req.user.role !== roleEnum.developer) {
    return next(
      new Error("only developers can rate clients", { cause: 403 })
    );
  }

  // 2️⃣ check project exists
  const project = await dbService.findOne({
    model: projectModel,
    filter: {
      _id: projectId,
      deletedAt: { $exists: false }
    },
  });

  if (!project) {
    return next(new Error("project not found", { cause: 404 }));
  }

  // 3️⃣ check project belongs to client
  if (project.client.toString() !== clientId) {
    return next(
      new Error("project does not belong to this client", { cause: 400 })
    );
  }

  // 4️⃣ calculate overall rating
  const values = Object.values(ratings);
  const overall =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  // 5️⃣ create rating
  const rating = await dbService.create({
    model: ratingModel,
    data: [
      {
        developer: developerId,
        client: clientId,
        project: projectId,
        ratings,
        overall,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "client rated successfully",
    data: { rating },
  });
});

////////////////////////////////////////////////////////
export const getClientRatingSummary = asyncHandeler(async (req, res, next) => {
  const clientId = req.user._id;

  const summary = await ratingModel.aggregate([
    {
      $match: {
        client: clientId,
      },
    },
    {
      $group: {
        _id: "$client",
        totalRatings: { $sum: 1 },

        avgCommunication: { $avg: "$communication" },
        avgTimelyPayments: { $avg: "$timelyPayments" },
        avgClarity: { $avg: "$clarity" },
        avgProfessionalism: { $avg: "$professionalism" },

        overallRating: {
          $avg: {
            $avg: [
              "$communication",
              "$timelyPayments",
              "$clarity",
              "$professionalism",
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRatings: 1,
        overallRating: { $round: ["$overallRating", 1] },

        breakdown: {
          communication: { $round: ["$avgCommunication", 1] },
          timelyPayments: { $round: ["$avgTimelyPayments", 1] },
          clarity: { $round: ["$avgClarity", 1] },
          professionalism: { $round: ["$avgProfessionalism", 1] },
        },
      },
    },
  ]);

  return successResponse({
    res,
    data: summary[0] || {
      totalRatings: 0,
      overallRating: 0,
      breakdown: {
        communication: 0,
        timelyPayments: 0,
        clarity: 0,
        professionalism: 0,
      },
    },
  });
});
