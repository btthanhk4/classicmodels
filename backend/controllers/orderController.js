const { Op } = require('sequelize');
const { Order, Customer, OrderDetail, Product } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.orderDate = {};
      if (from) where.orderDate[Op.gte] = from;
      if (to) where.orderDate[Op.lte] = to;
    }

    const { count, rows } = await Order.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [
        { model: Customer, attributes: ['customerName', 'country'], where: search ? { customerName: { [Op.like]: `%${search}%` } } : {} }
      ],
      order: [['orderDate', 'DESC']]
    });
    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ['customerName', 'country', 'phone'] },
        { model: OrderDetail, include: [{ model: Product, attributes: ['productName', 'productLine'] }] }
      ]
    });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStatuses = async (req, res) => {
  try {
    const statuses = await Order.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('status')), 'status']],
      order: [['status', 'ASC']]
    });
    res.json(statuses.map(s => s.status));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
