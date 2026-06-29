const express = require('express');
const router = express.Router();
const redPacketController = require('./red_packet.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.post('/create', verifyToken, redPacketController.createRedPacket);

router.post('/:id/claim', verifyToken, redPacketController.claimRedPacket);

router.get('/:id', verifyToken, redPacketController.getRedPacketDetails);

module.exports = router;
