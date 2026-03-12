import { auth, authentication } from '../../middelware/authentication.middelware.js';
import { validation } from '../../middelware/validation.middelware.js';
import { localFileUpload } from '../../utils/multer/local.maulter.js';
import { tokenTypeEnum } from '../../utils/security/token.security.js';
import { endpoint } from './user.authorization.js';
import * as userService from './user.service.js'
import * as validators from "./user.validation.js"
import { Router } from 'express'
const router = Router();

router.post("/logout", authentication(),
    validation(validators.logout), userService.logout)

router.get('/', authentication(), userService.profile)
router.get('/refresh-token'  , authentication({tokenType:tokenTypeEnum.refresh}), userService.getNewLoginCredentials)

router.get('/:userId' , validation(validators.shareProfile),userService.shareProfile)
router.patch('/', authentication(), validation(validators.updateBasicInfo), userService.updateBasicInfo)

// router.delete( "{/:userId}/freeze-account", authentication(),
//     // validation(validators.updateBasicInfo),
//     userService.freezeAccount
// )
router.delete(
  "/:userId/delete-account",
  authentication(),
  userService.deleteAccount
);

router.patch("/:userId/restore-account",
    auth({accessRoles:endpoint.restoreAccount}),
    validation(validators.restoreAccount),
    userService.restoreAccount
)

router.patch("/update-password",
    authentication(),
    validation(validators.updatePassword),
    userService.updatePassword
)

router.delete("/:userId",
    auth({accessRoles:endpoint.deleteAccount}),
    validation(validators.deleteAccount),
    userService.deleteAccount
)
router.patch("/profile-image",
    authentication(),
    localFileUpload().single("image"), // call it as afuunction to return multer function
    userService.profileImage
)

export default router