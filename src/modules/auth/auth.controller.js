import { validation } from '../../middelware/validation.middelware.js';
import * as authservice from './auth.service.js'
import *  as validators from './auth.validation.js'
import { Router } from 'express'
const router = Router();

router.post('/signup',validation(validators.signup ),authservice.signup)
router.post('/signup/gmail',validation(validators.loginWithGmail), authservice.signupWithGmail)
router.post('/login/gmail',validation(validators.loginWithGmail), authservice.loginWithGmail)
// router.post('/confirm-email',validation(validators.confirmEmail), authservice.confirmEmail)

router.post('/login', validation(validators.login), authservice.login)

router.patch('/send-forgot-password', validation(validators.sendForgotPassword),authservice.sendForgotPassword)
export default router;