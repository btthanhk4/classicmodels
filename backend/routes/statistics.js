const router = require('express').Router();
const ctrl = require('../controllers/statisticsController');

router.get('/overview', ctrl.getOverview);
router.get('/customers', ctrl.getCustomerStats);
router.get('/time', ctrl.getTimeStats);
router.get('/products', ctrl.getProductStats);
router.get('/pivot/customer-time', ctrl.getPivotCustomerTime);
router.get('/pivot/product-time', ctrl.getPivotProductTime);
router.get('/rollup/country-product', ctrl.getRollupCountryProduct);
router.get('/years', ctrl.getYears);

module.exports = router;
