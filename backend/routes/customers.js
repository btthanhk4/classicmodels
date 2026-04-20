const router = require('express').Router();
const ctrl = require('../controllers/customerController');

router.get('/', ctrl.getAll);
router.get('/countries', ctrl.getCountries);
router.get('/:id', ctrl.getById);
router.get('/:id/orders', ctrl.getOrders);

module.exports = router;
