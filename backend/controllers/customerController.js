const { Op } = require('sequelize');
const { Customer, Order, OrderDetail, Payment, Employee } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { search = '', country = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) {
      where[Op.or] = [
        { customerName: { [Op.like]: `%${search}%` } },
        { contactLastName: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } }
      ];
    }
    if (country) where.country = country;

    const { count, rows } = await Customer.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [{ model: Employee, as: 'salesRep', attributes: ['firstName', 'lastName'] }],
      order: [['customerName', 'ASC']]
    });
    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'salesRep', attributes: ['firstName', 'lastName', 'email'] },
        { model: Payment, attributes: ['paymentDate', 'amount', 'checkNumber'] }
      ]
    });
    if (!customer) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerNumber: req.params.id },
      include: [{ model: OrderDetail, include: ['Product'] }],
      order: [['orderDate', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCountries = async (req, res) => {
  try {
    const countries = await Customer.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('country')), 'country']],
      order: [['country', 'ASC']]
    });
    res.json(countries.map(c => c.country));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
