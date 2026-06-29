const express = require('express');
const router = express.Router();
const splitBillController = require('./split_bill.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.use(verifyToken);

router.post('/create', splitBillController.create);
router.get('/me', splitBillController.getMe);
router.post('/pay', splitBillController.pay);
router.post('/remind/:id', splitBillController.remind);
router.post('/cancel/:id', splitBillController.cancel);

module.exports = router;
