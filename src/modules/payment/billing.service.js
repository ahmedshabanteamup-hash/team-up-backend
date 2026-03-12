import { paymentMethodModel } from "../../DB/models/paymentMethod.model.js";
import * as dbService from "../../DB/db.service.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import { generateEncryption } from "../../utils/security/encryption.js";
import { projectModel } from "../../DB/models/project.model.js";

export const addPaymentMethod = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;
  const { type, providerData = {} } = req.body;

  // 1️⃣ هات كل وسائل الدفع الحالية
  const existingMethods = await dbService.find({
    model: paymentMethodModel,
    filter: {
      user: userId,
      deletedAt: { $exists: false },
    },
  });

  // 2️⃣ أول واحدة تبقى default
  const isDefault = existingMethods.length === 0;

  // 3️⃣ تجهيز providerData حسب النوع
  const safeProviderData = { ...providerData };

  if (type === "bank") {
    if (!providerData.accountNumber) {
      return next(new Error("accountNumber is required", { cause: 400 }));
    }

    safeProviderData.accountNumberEncrypted =await generateEncryption({
      plainText: providerData.accountNumber,
    });

    safeProviderData.last4 = providerData.accountNumber.slice(-4);
    delete safeProviderData.accountNumber;
  }

  if (type === "card") {
    if (!providerData.cardNumber) {
      return next(new Error("cardNumber is required", { cause: 400 }));
    }

    safeProviderData.cardNumberEncrypted = generateEncryption({
      plainText: providerData.cardNumber,
    });

    safeProviderData.last4 = providerData.cardNumber.slice(-4);
    delete safeProviderData.cardNumber;
  }

  if (type === "paypal") {
    if (!providerData.email) {
      return next(new Error("paypal email is required", { cause: 400 }));
    }
    // paypal مفيهوش تشفير
  }

  // 4️⃣ إنشاء payment method
  const paymentMethod = await dbService.create({
    model: paymentMethodModel,
    data: [
      {
        user: userId,
        type,
        providerData: safeProviderData,
        isDefault,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "Payment method added successfully",
    data: { paymentMethod },
  });
});
////////////////////////////////////

export const removePaymentMethod = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;
  const { paymentMethodId } = req.params;

  // 1️⃣ هات الـ payment method وتأكد إنه بتاع اليوزر
  const paymentMethod = await dbService.findOne({
    model: paymentMethodModel,
    filter: {
      _id: paymentMethodId,
      user: userId,
      deletedAt: { $exists: false },
    },
  });

  if (!paymentMethod) {
    return next(new Error("payment method not found", { cause: 404 }));
  }

  const wasDefault = paymentMethod.isDefault;

  // 2️⃣ Soft delete
  await dbService.findOneAndUpdate({
    model: paymentMethodModel,
    filter: { _id: paymentMethodId },
    data: {
      deletedAt: new Date(),
      deletedBy: userId,
      isDefault: false,
    },
  });

  // 3️⃣ لو كان default → نعيّن واحد تاني
  if (wasDefault) {
    const nextDefault = await dbService.findOne({
      model: paymentMethodModel,
      filter: {
        user: userId,
        deletedAt: { $exists: false },
      },
      options: { sort: { createdAt: 1 } },
    });

    if (nextDefault) {
      await dbService.findOneAndUpdate({
        model: paymentMethodModel,
        filter: { _id: nextDefault._id },
        data: { isDefault: true },
      });
    }
  }

  return successResponse({
    res,
    message: "Payment method removed successfully",
  });
});

///////////////////////////////////////

export const getPaymentMethods = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;

  const paymentMethods = await dbService.find({
    model: paymentMethodModel,
    filter: {
      user: userId,
      deletedAt: { $exists: false },
    },
    select: "type providerData isDefault createdAt",
  });

  return successResponse({
    res,
    message: "Payment methods fetched successfully",
    data: { paymentMethods },
  });
});

////////////////////////////////////////////


export const getBillingHistory = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;

  const projects = await dbService.find({
    model: projectModel,
    filter: {
      client: userId,
      deletedAt: { $exists: false },
    },
    select: "title status teamSize rating createdAt",
    sort: { createdAt: -1 },
  });

  const history = projects.map((project) => ({
    projectId: project._id,
    projectName: project.title,
    status: project.status,
    teamSize: project.teamSize,
    rating: project.rating ?? null,
    action: {
      viewDetails: `/projects/${project._id}`,
    },
  }));

  return successResponse({
    res,
    message: "Billing history fetched successfully",
    data: history,
  });
});

