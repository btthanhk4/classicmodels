const router = require('express').Router();
const ctrl = require('../controllers/productController');

router.get('/', ctrl.getAll);
router.get('/lines', ctrl.getProductLines);
router.get('/:code', ctrl.getById);

module.exports = router;
