const { Op } = require('sequelize');
const { Product, ProductLine, OrderDetail } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { search = '', productLine = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) {
      where[Op.or] = [
        { productName: { [Op.like]: `%${search}%` } },
        { productVendor: { [Op.like]: `%${search}%` } }
      ];
    }
    if (productLine) where.productLine = productLine;

    const { count, rows } = await Product.findAndCountAll({
      where, limit: parseInt(limit), offset,
      order: [['productName', 'ASC']]
    });
    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.code);
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductLines = async (req, res) => {
  try {
    const lines = await ProductLine.findAll({ attributes: ['productLine'], order: [['productLine', 'ASC']] });
    res.json(lines.map(l => l.productLine));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
