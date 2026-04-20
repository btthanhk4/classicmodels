const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  orderNumber: { type: DataTypes.INTEGER, primaryKey: true },
  orderDate: DataTypes.DATEONLY,
  requiredDate: DataTypes.DATEONLY,
  shippedDate: DataTypes.DATEONLY,
  status: DataTypes.STRING(15),
  comments: DataTypes.TEXT,
  customerNumber: DataTypes.INTEGER
}, { tableName: 'orders', timestamps: false });

module.exports = Order;
