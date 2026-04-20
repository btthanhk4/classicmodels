const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductLine = sequelize.define('ProductLine', {
  productLine: { type: DataTypes.STRING(50), primaryKey: true },
  textDescription: DataTypes.STRING(4000),
  htmlDescription: DataTypes.TEXT,
  image: DataTypes.BLOB
}, { tableName: 'productlines', timestamps: false });

module.exports = ProductLine;
