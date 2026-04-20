const router = require('express').Router();
const ctrl = require('../controllers/orderController');

router.get('/', ctrl.getAll);
router.get('/statuses', ctrl.getStatuses);
router.get('/:id', ctrl.getById);

module.exports = router;
