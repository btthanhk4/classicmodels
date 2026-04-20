const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

exports.getOverview = async (req, res) => {
  try {
    const [result] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS totalCustomers,
        (SELECT COUNT(*) FROM orders) AS totalOrders,
        (SELECT COUNT(*) FROM products) AS totalProducts,
        (SELECT COALESCE(SUM(amount),0) FROM payments) AS totalRevenue,
        (SELECT COUNT(*) FROM orders WHERE status='Shipped') AS shippedOrders,
        (SELECT COUNT(*) FROM orders WHERE status='In Process') AS pendingOrders,
        (SELECT COUNT(*) FROM orders WHERE status='Cancelled') AS cancelledOrders
    `, { type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomerStats = async (req, res) => {
  try {
    const { search = '', limit = 20, offset = 0 } = req.query;
    const results = await sequelize.query(`
      SELECT
        c.customerNumber,
        c.customerName,
        c.country,
        c.city,
        COUNT(DISTINCT o.orderNumber) AS orderCount,
        COALESCE(SUM(od.quantityOrdered * od.priceEach), 0) AS totalRevenue,
        COALESCE(AVG(od.quantityOrdered * od.priceEach), 0) AS avgOrderLine,
        MAX(o.orderDate) AS lastOrderDate,
        COALESCE(SUM(p.amount), 0) AS totalPayments
      FROM customers c
      LEFT JOIN orders o ON c.customerNumber = o.customerNumber AND o.status != 'Cancelled'
      LEFT JOIN orderdetails od ON o.orderNumber = od.orderNumber
      LEFT JOIN payments p ON c.customerNumber = p.customerNumber
      WHERE c.customerName LIKE :search OR c.country LIKE :search OR c.city LIKE :search
      GROUP BY c.customerNumber, c.customerName, c.country, c.city
      ORDER BY totalRevenue DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { search: `%${search}%`, limit: parseInt(limit), offset: parseInt(offset) },
      type: QueryTypes.SELECT
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTimeStats = async (req, res) => {
  try {
    const { groupBy = 'month', year } = req.query;
    let selectExpr, groupExpr, orderExpr;

    if (groupBy === 'year') {
      selectExpr = "YEAR(o.orderDate) AS period, YEAR(o.orderDate) AS sortKey";
      groupExpr = "YEAR(o.orderDate)";
      orderExpr = "sortKey";
    } else if (groupBy === 'quarter') {
      selectExpr = "CONCAT(YEAR(o.orderDate), '-Q', QUARTER(o.orderDate)) AS period, CONCAT(YEAR(o.orderDate), QUARTER(o.orderDate)) AS sortKey";
      groupExpr = "YEAR(o.orderDate), QUARTER(o.orderDate)";
      orderExpr = "sortKey";
    } else {
      // month - must include BOTH expressions in GROUP BY for MySQL strict mode
      selectExpr = "DATE_FORMAT(o.orderDate, '%Y-%m') AS period, DATE_FORMAT(o.orderDate, '%Y%m') AS sortKey";
      groupExpr = "DATE_FORMAT(o.orderDate, '%Y-%m'), DATE_FORMAT(o.orderDate, '%Y%m')";
      orderExpr = "sortKey";
    }

    const yearFilter = year ? `AND YEAR(o.orderDate) = ${parseInt(year)}` : '';

    const results = await sequelize.query(`
      SELECT
        ${selectExpr},
        COUNT(DISTINCT o.orderNumber) AS orderCount,
        COUNT(DISTINCT o.customerNumber) AS customerCount,
        COALESCE(SUM(od.quantityOrdered * od.priceEach), 0) AS revenue,
        COALESCE(SUM(od.quantityOrdered), 0) AS totalUnits,
        COALESCE(AVG(od.quantityOrdered * od.priceEach), 0) AS avgOrderLine
      FROM orders o
      JOIN orderdetails od ON o.orderNumber = od.orderNumber
      WHERE o.status != 'Cancelled' ${yearFilter}
      GROUP BY ${groupExpr}
      ORDER BY ${orderExpr}
    `, { type: QueryTypes.SELECT });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductStats = async (req, res) => {
  try {
    const { groupBy = 'product', limit = 20 } = req.query;
    let selectExpr, groupExpr;

    if (groupBy === 'productline') {
      selectExpr = "p.productLine AS groupKey, p.productLine AS name, NULL AS productLine";
      groupExpr = "p.productLine";
    } else {
      selectExpr = "p.productCode AS groupKey, p.productName AS name, p.productLine";
      groupExpr = "p.productCode, p.productName, p.productLine";
    }

    const results = await sequelize.query(`
      SELECT
        ${selectExpr},
        COALESCE(SUM(od.quantityOrdered), 0) AS totalSold,
        COALESCE(SUM(od.quantityOrdered * od.priceEach), 0) AS revenue,
        COALESCE(AVG(od.priceEach), 0) AS avgPrice,
        COUNT(DISTINCT o.orderNumber) AS orderCount
      FROM products p
      JOIN orderdetails od ON p.productCode = od.productCode
      JOIN orders o ON od.orderNumber = o.orderNumber
      WHERE o.status != 'Cancelled'
      GROUP BY ${groupExpr}
      ORDER BY revenue DESC
      LIMIT :limit
    `, {
      replacements: { limit: parseInt(limit) },
      type: QueryTypes.SELECT
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Pivot: Customer x Time (top N customers)
exports.getPivotCustomerTime = async (req, res) => {
  try {
    const { year = 2004, topN = 10 } = req.query;
    const results = await sequelize.query(`
      SELECT
        c.customerName,
        DATE_FORMAT(o.orderDate, '%Y-%m') AS period,
        COALESCE(SUM(od.quantityOrdered * od.priceEach), 0) AS revenue
      FROM customers c
      JOIN orders o ON c.customerNumber = o.customerNumber
      JOIN orderdetails od ON o.orderNumber = od.orderNumber
      WHERE o.status != 'Cancelled' AND YEAR(o.orderDate) = :year
        AND c.customerNumber IN (
          SELECT customerNumber FROM (
            SELECT c2.customerNumber
            FROM customers c2
            JOIN orders o2 ON c2.customerNumber = o2.customerNumber
            JOIN orderdetails od2 ON o2.orderNumber = od2.orderNumber
            WHERE o2.status != 'Cancelled' AND YEAR(o2.orderDate) = :year
            GROUP BY c2.customerNumber
            ORDER BY SUM(od2.quantityOrdered * od2.priceEach) DESC
            LIMIT :topN
          ) top
        )
      GROUP BY c.customerNumber, c.customerName, DATE_FORMAT(o.orderDate, '%Y-%m')
      ORDER BY c.customerName, period
    `, {
      replacements: { year: parseInt(year), topN: parseInt(topN) },
      type: QueryTypes.SELECT
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Pivot: ProductLine x Time
exports.getPivotProductTime = async (req, res) => {
  try {
    const { year } = req.query;
    const yearFilter = year ? `AND YEAR(o.orderDate) = ${parseInt(year)}` : '';
    const results = await sequelize.query(`
      SELECT
        p.productLine,
        DATE_FORMAT(o.orderDate, '%Y-%m') AS period,
        COALESCE(SUM(od.quantityOrdered * od.priceEach), 0) AS revenue,
        COALESCE(SUM(od.quantityOrdered), 0) AS units
      FROM products p
      JOIN orderdetails od ON p.productCode = od.productCode
      JOIN orders o ON od.orderNumber = o.orderNumber
      WHERE o.status != 'Cancelled' ${yearFilter}
      GROUP BY p.productLine, DATE_FORMAT(o.orderDate, '%Y-%m')
      ORDER BY p.productLine, period
    `, { type: QueryTypes.SELECT });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ROLLUP: Country x ProductLine with subtotals
exports.getRollupCountryProduct = async (req, res) => {
  try {
    const { year } = req.query;
    const yearFilter = year ? `AND YEAR(o.orderDate) = ${parseInt(year)}` : '';
    const results = await sequelize.query(`
      SELECT
        COALESCE(c.country, '--- TỔNG CỘNG ---') AS country,
        COALESCE(p.productLine, '--- TỔNG DÒNG SP ---') AS productLine,
        COALESCE(SUM(od.quantityOrdered * od.priceEach), 0) AS revenue,
        COALESCE(SUM(od.quantityOrdered), 0) AS units,
        COUNT(DISTINCT o.orderNumber) AS orders
      FROM customers c
      JOIN orders o ON c.customerNumber = o.customerNumber
      JOIN orderdetails od ON o.orderNumber = od.orderNumber
      JOIN products p ON od.productCode = p.productCode
      WHERE o.status != 'Cancelled' ${yearFilter}
      GROUP BY c.country, p.productLine WITH ROLLUP
      ORDER BY c.country, p.productLine
    `, { type: QueryTypes.SELECT });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getYears = async (req, res) => {
  try {
    const results = await sequelize.query(`
      SELECT DISTINCT YEAR(orderDate) AS year FROM orders ORDER BY year
    `, { type: QueryTypes.SELECT });
    res.json(results.map(r => r.year));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
