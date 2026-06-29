const express = require('express');
const router = express.Router();
const kycController = require('./kyc.controller');

router.get('/', kycController.getList);
router.get('/:id', kycController.getDetails);
router.put('/:id/approve', kycController.approve);
router.put('/:id/reject', kycController.reject);

module.exports = router;
