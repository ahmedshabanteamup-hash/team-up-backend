import { roleEnum } from "../../DB/models/user.model.js";

export const endpoint = {
    profile: [roleEnum.admin, roleEnum.user],
    restoreAccount: [roleEnum.admin],
    deleteAccount:[roleEnum.admin]
}