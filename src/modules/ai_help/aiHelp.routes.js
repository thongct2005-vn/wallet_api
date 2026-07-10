const express = require('express');
const router = express.Router();
const aiHelpController = require('./aiHelp.controller');

router.post('/ask', aiHelpController.askQuestion);

module.exports = router;
