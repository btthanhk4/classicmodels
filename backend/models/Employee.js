const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  employeeNumber: { type: DataTypes.INTEGER, primaryKey: true },
  lastName: DataTypes.STRING(50),
  firstName: DataTypes.STRING(50),
  extension: DataTypes.STRING(10),
  email: DataTypes.STRING(100),
  officeCode: DataTypes.STRING(10),
  reportsTo: DataTypes.INTEGER,
  jobTitle: DataTypes.STRING(50)
}, { tableName: 'employees', timestamps: false });

module.exports = Employee;
