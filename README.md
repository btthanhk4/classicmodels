# ClassicModels Dashboard
<img width="1918" height="873" alt="image" src="https://github.com/user-attachments/assets/00629fb3-69a9-4cb6-80e6-7c05f992beac" />

Ứng dụng web quản lý và phân tích dữ liệu bán hàng dựa trên cơ sở dữ liệu mẫu **ClassicModels** (MySQL). Được xây dựng với Node.js/Express ở phía server và Vanilla JavaScript ở phía client.

## Tính năng

- **Tổng quan** — KPI tổng hợp (khách hàng, đơn hàng, sản phẩm, doanh thu), biểu đồ doanh thu theo tháng, trạng thái đơn hàng, top 10 khách hàng và sản phẩm.
- **Tìm kiếm** — Tra cứu khách hàng, đơn hàng, sản phẩm với bộ lọc theo quốc gia, trạng thái, khoảng ngày, dòng sản phẩm.
- **Thống kê** — Biểu đồ doanh thu theo năm/quý/tháng, thống kê theo dòng sản phẩm và theo từng khách hàng.
- **Bảng tổng hợp (Pivot)** — Phân tích doanh thu: khách hàng × thời gian, dòng sản phẩm × thời gian, và ROLLUP quốc gia × dòng sản phẩm.
- **Chatbot** — Truy vấn dữ liệu bằng tiếng Việt tự nhiên (doanh thu, top khách hàng, sản phẩm bán chạy, tồn kho).

## Yêu cầu

- Node.js >= 16
- MySQL >= 5.7 với database `classicmodels` đã được import

## Cài đặt

```bash
git clone https://github.com/btthanhk4/classicmodels.git
cd hqtcsdl/backend
npm install
```

Import mysqlsampledatabase.sql:
[https://www.mysqltutorial.org/wp-content/uploads/2023/10/mysqlsampledatabase.zip
](url)<img width="623" height="143" alt="image" src="https://github.com/user-attachments/assets/48fe21ff-b76e-401c-a0a5-b977c425865a" />

Tạo file `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=classicmodels
DB_USER=root
DB_PASS=your_password
PORT=3000
```

Khởi động:

```bash
# Development (nodemon)
npm run dev

# Production
npm start
```

Truy cập `http://localhost:3000`

## Cấu trúc thư mục

```
hqtcsdl/
├── backend/
│   ├── config/database.js
│   ├── controllers/
│   │   ├── chatbotController.js
│   │   ├── customerController.js
│   │   ├── orderController.js
│   │   ├── productController.js
│   │   └── statisticsController.js
│   ├── models/
│   │   ├── index.js          # Khai báo associations
│   │   ├── Customer.js
│   │   ├── Order.js
│   │   ├── OrderDetail.js
│   │   ├── Payment.js
│   │   ├── Product.js
│   │   ├── ProductLine.js
│   │   └── Employee.js
│   ├── routes/
│   │   ├── chatbot.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   ├── products.js
│   │   └── statistics.js
│   ├── server.js
│   └── package.json
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/health` | Kiểm tra kết nối database |
| GET | `/api/customers` | Danh sách / tìm kiếm khách hàng |
| GET | `/api/customers/countries` | Danh sách quốc gia |
| GET | `/api/customers/:id` | Chi tiết khách hàng + đơn hàng |
| GET | `/api/orders` | Danh sách / tìm kiếm đơn hàng |
| GET | `/api/orders/:id` | Chi tiết đơn hàng |
| GET | `/api/products` | Danh sách / tìm kiếm sản phẩm |
| GET | `/api/products/lines` | Danh sách dòng sản phẩm |
| GET | `/api/stats/overview` | Số liệu tổng quan |
| GET | `/api/stats/time` | Doanh thu theo thời gian |
| GET | `/api/stats/customers` | Thống kê theo khách hàng |
| GET | `/api/stats/products` | Thống kê theo sản phẩm |
| GET | `/api/stats/pivot/customer-time` | Pivot khách hàng × thời gian |
| GET | `/api/stats/pivot/product-time` | Pivot dòng sản phẩm × thời gian |
| GET | `/api/stats/rollup/country-product` | ROLLUP quốc gia × sản phẩm |
| POST | `/api/chatbot` | Gửi câu hỏi tới chatbot |

## Chatbot
Lấy APi từ Groq:
<img width="1904" height="376" alt="image" src="https://github.com/user-attachments/assets/bafaa86e-f6cb-4894-91ba-46053912e245" />


```
"Top khách hàng doanh thu cao nhất?"
"Doanh thu năm 2004?"
"Sản phẩm nào bán chạy nhất?"
"Thống kê đơn hàng theo trạng thái?"
"Tồn kho thấp nhất?"
"Tổng quan"
```

## Công nghệ

| | |
|--|--|
| **Backend** | Node.js, Express.js, Sequelize, MySQL2 |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Biểu đồ** | Chart.js |
| **Icon** | Font Awesome 6 |
