const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  customerNumber: { type: DataTypes.INTEGER, primaryKey: true },
  customerName: { type: DataTypes.STRING(50), allowNull: false },
  contactLastName: DataTypes.STRING(50),
  contactFirstName: DataTypes.STRING(50),
  phone: DataTypes.STRING(50),
  addressLine1: DataTypes.STRING(50),
  addressLine2: DataTypes.STRING(50),
  city: DataTypes.STRING(50),
  state: DataTypes.STRING(50),
  postalCode: DataTypes.STRING(15),
  country: DataTypes.STRING(50),
  salesRepEmployeeNumber: DataTypes.INTEGER,
  creditLimit: DataTypes.DECIMAL(10, 2)
}, { tableName: 'customers', timestamps: false });

module.exports = Customer;
