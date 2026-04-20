const router = require('express').Router();
const ctrl = require('../controllers/chatbotController');

router.post('/', ctrl.chat);

module.exports = router;
