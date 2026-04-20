const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const queryDB = async (sql, replacements = {}) => {
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
};

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Vui lòng nhập câu hỏi' });

    const msg = normalize(message);
    let reply = '';
    let data = null;

    // Top khách hàng
    if ((msg.includes('top') || msg.includes('hang dau') || msg.includes('nhieu nhat')) &&
        (msg.includes('khach hang') || msg.includes('customer') || msg.includes('khach'))) {
      data = await queryDB(`
        SELECT c.customerName, c.country,
          ROUND(SUM(od.quantityOrdered * od.priceEach), 2) AS revenue,
          COUNT(DISTINCT o.orderNumber) AS orderCount
        FROM customers c
        JOIN orders o ON c.customerNumber = o.customerNumber
        JOIN orderdetails od ON o.orderNumber = od.orderNumber
        WHERE o.status != 'Cancelled'
        GROUP BY c.customerNumber, c.customerName, c.country
        ORDER BY revenue DESC LIMIT 5
      `);
      reply = `👥 Top 5 khách hàng có doanh thu cao nhất:\n${data.map((d, i) => 
        `${i+1}. ${d.customerName} (${d.country}) - $${d.revenue} từ ${d.orderCount} đơn`).join('\n')}`;
    }
    // Doanh thu theo tháng/năm
    else if (msg.includes('doanh thu') || msg.includes('revenue') || msg.includes('oanh thu')) {
      const yearMatch = msg.match(/20\d\d/);
      const year = yearMatch ? yearMatch[0] : '2004';
      data = await queryDB(`
        SELECT DATE_FORMAT(o.orderDate, '%Y-%m') AS thang,
          ROUND(SUM(od.quantityOrdered * od.priceEach), 2) AS revenue,
          COUNT(DISTINCT o.orderNumber) AS sodon
        FROM orders o 
        JOIN orderdetails od ON o.orderNumber = od.orderNumber
        WHERE o.status != 'Cancelled' AND YEAR(o.orderDate) = :year
        GROUP BY DATE_FORMAT(o.orderDate, '%Y-%m')
        ORDER BY thang
      `, { year });
      const totalRevenue = data.reduce((sum, d) => sum + parseFloat(d.revenue), 0);
      reply = `💰 Doanh thu năm ${year}: $${totalRevenue.toLocaleString('en-US', {maximumFractionDigits: 2})}\n(${data.length} tháng có doanh số)`;
    }
    // Sản phẩm bán chạy
    else if ((msg.includes('san pham') || msg.includes('mat hang') || msg.includes('product')) &&
             (msg.includes('ban chay') || msg.includes('nhieu') || msg.includes('top'))) {
      data = await queryDB(`
        SELECT p.productName, p.productLine,
          SUM(od.quantityOrdered) AS totalSold,
          ROUND(SUM(od.quantityOrdered * od.priceEach), 2) AS revenue
        FROM products p 
        JOIN orderdetails od ON p.productCode = od.productCode
        JOIN orders o ON od.orderNumber = o.orderNumber 
        WHERE o.status != 'Cancelled'
        GROUP BY p.productCode, p.productName, p.productLine
        ORDER BY totalSold DESC LIMIT 5
      `);
      reply = `🔥 Top 5 sản phẩm bán chạy nhất:\n${data.map((d, i) => 
        `${i+1}. ${d.productName} (${d.productLine}) - ${d.totalSold} units, $${d.revenue}`).join('\n')}`;
    }
    // Đơn hàng theo trạng thái
    else if ((msg.includes('don hang') || msg.includes('order')) && (msg.includes('trang thai') || msg.includes('status'))) {
      data = await queryDB(`
        SELECT status AS trangThai, COUNT(*) AS soLuong
        FROM orders GROUP BY status ORDER BY soLuong DESC
      `);
      reply = `📊 Thống kê đơn hàng:\n${data.map(d => 
        `${d.trangThai}: ${d.soLuong} đơn`).join('\n')}`;
    }
    // Khách hàng
    else if ((msg.includes('bao nhieu') || msg.includes('tong')) && (msg.includes('khach') || msg.includes('customer'))) {
      data = await queryDB(`SELECT COUNT(*) AS total FROM customers`);
      reply = `👥 Hệ thống có ${data[0].total} khách hàng`;
    }
    // Tổng quan
    else if (msg.includes('tong quan') || msg.includes('overview') || msg.includes('thong ke') || msg.includes('bao cao')) {
      const [result] = await queryDB(`
        SELECT
          (SELECT COUNT(*) FROM customers) AS tongKhachHang,
          (SELECT COUNT(*) FROM orders) AS tongDonHang,
          (SELECT COUNT(*) FROM products) AS tongSanPham,
          (SELECT COALESCE(ROUND(SUM(amount), 2), 0) FROM payments) AS tongDoanhThu
      `);
      data = [result];
      reply = `📈 Tổng quan ClassicModels:\n👥 Khách hàng: ${result.tongKhachHang}\n📦 Đơn hàng: ${result.tongDonHang}\n🛍️ Sản phẩm: ${result.tongSanPham}\n💵 Doanh thu: $${result.tongDoanhThu}`;
    }
    // Tồn kho
    else if (msg.includes('ton kho') || msg.includes('stock') || msg.includes('kho')) {
      data = await queryDB(`
        SELECT productName AS tenSP, productLine AS dongSP,
          quantityInStock AS tonKho, ROUND(buyPrice, 2) AS giaNhap, ROUND(MSRP, 2) AS giaBan
        FROM products 
        WHERE quantityInStock < 3500
        ORDER BY quantityInStock ASC LIMIT 5
      `);
      reply = `⚠️ Top 5 sản phẩm có tồn kho thấp:\n${data.map((d, i) => 
        `${i+1}. ${d.tenSP} - ${d.tonKho} units`).join('\n')}`;
    }
    else {
      reply = `Xin chào! Tôi có thể trả lời các câu hỏi về:
📊 **Doanh thu** - "Doanh thu năm 2004?" / "Doanh thu 2003?"
👥 **Top khách hàng** - "Top khách hàng?"
🔥 **Sản phẩm bán chạy** - "Sản phẩm bán chạy?"
📦 **Đơn hàng** - "Thống kê đơn hàng"
⚠️ **Tồn kho** - "Tồn kho thấp?"
📈 **Tổng quan** - "Tổng quan"`;
    }

    res.json({ 
      reply, 
      data: data || null
    });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
