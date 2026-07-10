const express = require('express');
const router = express.Router();
const wealthBagController = require('./wealth_bag.controller');
const auth = require('../../middlewares/auth.middleware');

router.get('/status', auth, wealthBagController.getStatus);
router.post('/activate', auth, wealthBagController.activate);
router.post('/deposit', auth, wealthBagController.deposit);
router.post('/withdraw', auth, wealthBagController.withdraw);
router.post('/generate-qr', auth, wealthBagController.generateQr);
router.get('/history', auth, wealthBagController.getHistory);

module.exports = router;
