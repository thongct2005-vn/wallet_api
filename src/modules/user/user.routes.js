const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.use(verifyToken);


router.get('/search', userController.search);

router.post('/check-contacts', userController.checkContacts);

router.get('/me', userController.getProfile);

router.post('/email/request-otp', userController.requestEmailOtp);
router.post('/email/verify-otp', userController.verifyEmailOtp);


module.exports = router;