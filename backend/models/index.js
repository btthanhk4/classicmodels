const Customer = require('./Customer');
const Order = require('./Order');
const OrderDetail = require('./OrderDetail');
const Product = require('./Product');
const ProductLine = require('./ProductLine');
const Employee = require('./Employee');
const Payment = require('./Payment');

// Associations
Customer.hasMany(Order, { foreignKey: 'customerNumber' });
Order.belongsTo(Customer, { foreignKey: 'customerNumber' });

Order.hasMany(OrderDetail, { foreignKey: 'orderNumber' });
OrderDetail.belongsTo(Order, { foreignKey: 'orderNumber' });

Product.hasMany(OrderDetail, { foreignKey: 'productCode' });
OrderDetail.belongsTo(Product, { foreignKey: 'productCode' });

ProductLine.hasMany(Product, { foreignKey: 'productLine' });
Product.belongsTo(ProductLine, { foreignKey: 'productLine' });

Customer.hasMany(Payment, { foreignKey: 'customerNumber' });
Payment.belongsTo(Customer, { foreignKey: 'customerNumber' });

Customer.belongsTo(Employee, { foreignKey: 'salesRepEmployeeNumber', as: 'salesRep' });

module.exports = { Customer, Order, OrderDetail, Product, ProductLine, Employee, Payment };
