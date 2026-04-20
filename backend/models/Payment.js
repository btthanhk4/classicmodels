const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  customerNumber: { type: DataTypes.INTEGER, primaryKey: true },
  checkNumber: { type: DataTypes.STRING(50), primaryKey: true },
  paymentDate: DataTypes.DATEONLY,
  amount: DataTypes.DECIMAL(10, 2)
}, { tableName: 'payments', timestamps: false });

module.exports = Payment;
