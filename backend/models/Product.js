const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  productCode: { type: DataTypes.STRING(15), primaryKey: true },
  productName: DataTypes.STRING(70),
  productLine: DataTypes.STRING(50),
  productScale: DataTypes.STRING(10),
  productVendor: DataTypes.STRING(50),
  productDescription: DataTypes.TEXT,
  quantityInStock: DataTypes.SMALLINT,
  buyPrice: DataTypes.DECIMAL(10, 2),
  MSRP: DataTypes.DECIMAL(10, 2)
}, { tableName: 'products', timestamps: false });

module.exports = Product;
