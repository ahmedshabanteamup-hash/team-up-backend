import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.join("./src/config/.env.dev") });

import express from "express";
import authcontroller from "./modules/auth/auth.controller.js";
import usercontroller from "./modules/user/user.controller.js";
import developercontroller from "./modules/developer/developer.controller.js";
import billingController from "./modules/payment/billing.controller.js";
import projectController from "./modules/projects/project.controller.js";
import ratingController from "./modules/rating/rating.controller.js";
import companyController from "./modules/companyProfile/company.controller.js";
import landingController from "./modules/landing/landing.controller.js";
import aiController from "./modules/ai/ai.controller.js";
import connectDB from "./DB/connection.db.js";
import { globalErorrHandeling } from "./utils/response.js";
import cors from "cors";

const bootsrap = async () => {
  const app = express();
  const port = process.env.PORT || 5000;

  // DB
  await connectDB();

  app.use(express.json());
  app.use(cors());

  app.get("/", (req, res, next) => res.json({ message: "hello ahmed" }));
  app.use("/auth", authcontroller);
  app.use("/user", usercontroller);
  app.use("/developer", developercontroller);
  app.use("/billing", billingController);
  app.use("/project", projectController);
  app.use("/rating", ratingController);
  app.use("/company", companyController);
  app.use("/landing", landingController);
  app.use("/ai", aiController);

  app.all("{/*dummy}", (req, res, next) =>
    res.status(404).json({ message: "not valid routing" })
  );

  app.use(globalErorrHandeling);

  return app.listen(port, () =>
    console.log({ message: `app is listenning on port ${port}` })
  );
};

export default bootsrap;
