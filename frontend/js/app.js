const API_BASE = 'http://localhost:3000/api';

// ============ INIT ============
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

async function initApp() {
  // Check database connection
  await checkDbConnection();
  
  // Load dropdown options FIRST (before loadDashboard)
  await loadYears();
  await loadCountries();
  await loadOrderStatuses();
  await loadProductLines();
  
  // Load initial data
  await loadDashboard();
}

async function checkDbConnection() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    const badge = document.getElementById('db-status');
    if (data.status === 'OK') {
      badge.innerHTML = '<i class="fas fa-circle" style="color: #22c55e;"></i> Kết nối CSDL';
    } else {
      badge.innerHTML = '<i class="fas fa-circle" style="color: #ef4444;"></i> Lỗi Kết nối';
    }
  } catch (err) {
    console.error('DB Connection Error:', err);
    document.getElementById('db-status').innerHTML = '<i class="fas fa-circle" style="color: #ef4444;"></i> Lỗi Kết nối';
  }
}

// ============ PAGE NAVIGATION ============
function goToPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Show selected page
  document.getElementById(`page-${pageName}`).classList.add('active');
  
  // Update sidebar
  document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
  
  // Update title
  const titles = {
    dashboard: 'Tổng Quan',
    search: 'Tìm Kiếm',
    stats: 'Thống Kê',
    pivot: 'Bảng Tổng Hợp',
    chatbot: 'Chatbot Trợ Lý'
  };
  document.getElementById('page-title').textContent = titles[pageName];
  
  // Load page data
  if (pageName === 'stats' && !charts['time-stats']) {
    loadTimeStats();
    loadProductStats();
    loadCustomerStats();
  }
  if (pageName === 'pivot') {
    if (!charts['pivot-customer-time']) loadPivotCustomerTime();
    if (!charts['pivot-product-time']) loadPivotProductTime();
    if (!charts['rollup']) loadRollupCountryProduct();
  }
}

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    // Overview stats
    const overviewRes = await fetch(`${API_BASE}/stats/overview`);
    const overview = await overviewRes.json();
    
    document.getElementById('stat-customers').textContent = overview.totalCustomers.toLocaleString();
    document.getElementById('stat-orders').textContent = overview.totalOrders.toLocaleString();
    document.getElementById('stat-products').textContent = overview.totalProducts.toLocaleString();
    document.getElementById('stat-revenue').textContent = '$' + parseFloat(overview.totalRevenue).toLocaleString('en-US', { maximumFractionDigits: 0 });
    document.getElementById('stat-shipped').textContent = overview.shippedOrders.toLocaleString();
    document.getElementById('stat-cancelled').textContent = overview.cancelledOrders.toLocaleString();
    
    // Monthly revenue chart will be loaded by loadYears() after dropdown is populated
    await loadMonthlyRevenueChart();
    
    // Order status pie chart
    await loadOrderStatusChart();
    
    // Top customers
    await loadTopCustomersTable();
    
    // Top products
    await loadTopProductsTable();
  } catch (err) {
    console.error('Dashboard Error:', err);
  }
}

async function loadMonthlyRevenueChart() {
  try {
    // Get year from dropdown
    const yearSelect = document.getElementById('dashboard-year-select');
    const selectedYear = yearSelect ? yearSelect.value : '';
    
    if (!selectedYear) {
      console.log('Year not selected yet');
      return;
    }
    
    console.log('Loading monthly revenue for year:', selectedYear);
    
    const res = await fetch(`${API_BASE}/stats/time?groupBy=month&year=${selectedYear}`);
    const data = await res.json();
    
    console.log('Monthly Revenue Data:', data);
    
    if (data.length === 0) {
      console.log('No data for year:', selectedYear);
      if (charts['monthly-revenue']) charts['monthly-revenue'].destroy();
      return;
    }
    
    const canvas = document.getElementById('chart-monthly-revenue');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (charts['monthly-revenue']) charts['monthly-revenue'].destroy();
    
    charts['monthly-revenue'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.period),
        datasets: [{
          label: 'Doanh Thu ($)',
          data: data.map(d => d.revenue),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#2563eb',
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: true, position: 'top' },
          filler: { propagate: true }
        },
        scales: { 
          y: { 
            beginAtZero: true, 
            ticks: { callback: function(value) { return '$' + value.toLocaleString(); } } 
          }
        }
      }
    });
  } catch (err) {
    console.error('Monthly Revenue Chart Error:', err);
  }
}

async function loadOrderStatusChart() {
  try {
    const res = await fetch(`${API_BASE}/stats/overview`);
    const overview = await res.json();
    
    const ctx = document.getElementById('chart-order-status').getContext('2d');
    
    if (charts['order-status']) charts['order-status'].destroy();
    
    charts['order-status'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Hoàn Thành', 'Đang Xử Lý', 'Hủy'],
        datasets: [{
          data: [overview.shippedOrders, overview.pendingOrders, overview.cancelledOrders],
          backgroundColor: ['#16a34a', '#f59e0b', '#ef4444'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { position: 'bottom', labels: { padding: 15 } },
          tooltip: { callbacks: { label: function(context) { return context.label + ': ' + context.parsed; } } }
        }
      }
    });
  } catch (err) {
    console.error('Order Status Chart Error:', err);
  }
}

async function loadTopCustomersTable() {
  try {
    const res = await fetch(`${API_BASE}/stats/customers?limit=10&offset=0`);
    const data = await res.json();
    
    const tbody = document.querySelector('#top-customers-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.customerName}</td>
        <td class="num">$${parseFloat(row.totalRevenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td class="num">${row.orderCount}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Top Customers Table Error:', err);
  }
}

async function loadTopProductsTable() {
  try {
    const res = await fetch(`${API_BASE}/stats/products?groupBy=product&limit=10`);
    const data = await res.json();
    
    const tbody = document.querySelector('#top-products-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.name}</td>
        <td class="num">$${parseFloat(row.revenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td class="num">${row.totalSold.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Top Products Table Error:', err);
  }
}

// ============ SEARCH FUNCTIONS ============
async function loadCountries() {
  try {
    const res = await fetch(`${API_BASE}/customers/countries`);
    const countries = await res.json();
    
    const select = document.getElementById('search-customer-country');
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Load Countries Error:', err);
  }
}

async function loadOrderStatuses() {
  try {
    const res = await fetch(`${API_BASE}/orders/statuses`);
    const statuses = await res.json();
    
    const select = document.getElementById('search-order-status');
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Load Order Statuses Error:', err);
  }
}

async function loadProductLines() {
  try {
    const res = await fetch(`${API_BASE}/products/lines`);
    const lines = await res.json();
    
    const select = document.getElementById('search-product-line');
    lines.forEach(line => {
      const option = document.createElement('option');
      option.value = line;
      option.textContent = line;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Load Product Lines Error:', err);
  }
}

async function loadYears() {
  try {
    const res = await fetch(`${API_BASE}/stats/years`);
    const years = await res.json();
    
    // Add to dashboard year select
    const dashboardSelect = document.getElementById('dashboard-year-select');
    if (dashboardSelect && years.length > 0) {
      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        dashboardSelect.appendChild(option);
      });
      
      // Set default to first year
      dashboardSelect.value = years[0];
      
      // Add change event listener
      dashboardSelect.addEventListener('change', () => {
        loadMonthlyRevenueChart();
      });
    }
    
    // Add to all year selects (existing code)
    ['pivot-year', 'pivot-year-product', 'rollup-year'].forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        years.forEach(year => {
          if (!select.querySelector(`option[value="${year}"]`)) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
          }
        });
      }
    });
  } catch (err) {
    console.error('Load Years Error:', err);
  }
}

async function searchCustomers() {
  try {
    const query = document.getElementById('search-customer-query').value;
    const country = document.getElementById('search-customer-country').value;
    
    let url = `${API_BASE}/customers?page=1&limit=50`;
    if (query) url += `&search=${encodeURIComponent(query)}`;
    if (country) url += `&country=${encodeURIComponent(country)}`;
    
    const res = await fetch(url);
    const result = await res.json();
    
    const tbody = document.querySelector('#search-customers-table tbody');
    tbody.innerHTML = '';
    
    result.data.forEach(customer => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${customer.customerName}</td>
        <td>${customer.country}</td>
        <td>${customer.city}</td>
        <td>${customer.contactFirstName} ${customer.contactLastName}</td>
        <td>
          <button onclick="viewCustomerDetails(${customer.customerNumber})" style="background: var(--primary); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
            Xem Chi Tiết
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Search Customers Error:', err);
    alert('Lỗi tìm kiếm khách hàng: ' + err.message);
  }
}

async function searchOrders() {
  try {
    const query = document.getElementById('search-order-query').value;
    const status = document.getElementById('search-order-status').value;
    const from = document.getElementById('search-order-from').value;
    const to = document.getElementById('search-order-to').value;
    
    let url = `${API_BASE}/orders?page=1&limit=50`;
    if (query) url += `&search=${encodeURIComponent(query)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    
    const res = await fetch(url);
    const result = await res.json();
    
    const tbody = document.querySelector('#search-orders-table tbody');
    tbody.innerHTML = '';
    
    result.data.forEach(order => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${order.orderNumber}</td>
        <td>${order.Customer.customerName}</td>
        <td>${new Date(order.orderDate).toLocaleDateString('vi-VN')}</td>
        <td><span style="background: ${getStatusBg(order.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${order.status}</span></td>
        <td>
          <button onclick="viewOrderDetails(${order.orderNumber})" style="background: var(--primary); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
            Xem Chi Tiết
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Search Orders Error:', err);
    alert('Lỗi tìm kiếm đơn hàng: ' + err.message);
  }
}

async function searchProducts() {
  try {
    const query = document.getElementById('search-product-query').value;
    const productLine = document.getElementById('search-product-line').value;
    
    let url = `${API_BASE}/products?page=1&limit=50`;
    if (query) url += `&search=${encodeURIComponent(query)}`;
    if (productLine) url += `&productLine=${encodeURIComponent(productLine)}`;
    
    const res = await fetch(url);
    const result = await res.json();
    
    const tbody = document.querySelector('#search-products-table tbody');
    tbody.innerHTML = '';
    
    result.data.forEach(product => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.productCode}</td>
        <td>${product.productName}</td>
        <td>${product.productLine}</td>
        <td>${product.quantityInStock.toLocaleString()}</td>
        <td>$${parseFloat(product.MSRP).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Search Products Error:', err);
    alert('Lỗi tìm kiếm sản phẩm: ' + err.message);
  }
}

async function viewCustomerDetails(customerId) {
  try {
    const res = await fetch(`${API_BASE}/customers/${customerId}`);
    const customer = await res.json();
    
    const ordersRes = await fetch(`${API_BASE}/customers/${customerId}/orders`);
    const orders = await ordersRes.json();
    
    let html = `
      <div style="margin-bottom: 20px;">
        <h3>${customer.customerName}</h3>
        <p><strong>Quốc Gia:</strong> ${customer.country}</p>
        <p><strong>Thành Phố:</strong> ${customer.city}</p>
        <p><strong>Liên Hệ:</strong> ${customer.contactFirstName} ${customer.contactLastName}</p>
        <p><strong>Điện Thoại:</strong> ${customer.phone}</p>
        <p><strong>Địa Chỉ:</strong> ${customer.addressLine1}</p>
        <p><strong>Hạn Mức Tín Dụng:</strong> $${parseFloat(customer.creditLimit).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
      </div>
      <h4>Đơn Hàng Của Khách Hàng</h4>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>Ngày Đặt</th>
              <th>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    orders.forEach(order => {
      html += `
        <tr>
          <td>${order.orderNumber}</td>
          <td>${new Date(order.orderDate).toLocaleDateString('vi-VN')}</td>
          <td>${order.status}</td>
        </tr>
      `;
    });
    
    html += `</tbody></table></div>`;
    
    document.getElementById('customer-modal-content').innerHTML = html;
    document.getElementById('customer-modal').style.display = 'flex';
  } catch (err) {
    console.error('View Customer Details Error:', err);
    alert('Lỗi xem chi tiết khách hàng: ' + err.message);
  }
}

function viewOrderDetails(orderId) {
  alert('Xem chi tiết đơn hàng ' + orderId);
}

function closeCustomerModal() {
  document.getElementById('customer-modal').style.display = 'none';
}

function getStatusBg(status) {
  const colors = {
    'Shipped': '#16a34a',
    'In Process': '#f59e0b',
    'Cancelled': '#ef4444',
    'On Hold': '#6366f1',
    'Resolved': '#10b981'
  };
  return colors[status] || '#6b7280';
}

// ============ STATISTICS ============
async function loadTimeStats() {
  try {
    const groupBy = document.querySelector('input[name="time-groupby"]:checked').value;
    const res = await fetch(`${API_BASE}/stats/time?groupBy=${groupBy}`);
    const data = await res.json();
    
    const ctx = document.getElementById('chart-time-stats').getContext('2d');
    if (charts['time-stats']) charts['time-stats'].destroy();
    
    charts['time-stats'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.period),
        datasets: [{
          label: 'Doanh Thu ($)',
          data: data.map(d => d.revenue),
          backgroundColor: '#2563eb'
        }, {
          label: 'Số Đơn Hàng',
          data: data.map(d => d.orderCount),
          backgroundColor: '#10b981',
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true },
          y1: { position: 'right', beginAtZero: true }
        }
      }
    });
  } catch (err) {
    console.error('Time Stats Error:', err);
  }
}

async function loadProductStats() {
  try {
    const res = await fetch(`${API_BASE}/stats/products?groupBy=productline&limit=15`);
    const data = await res.json();
    
    const ctx = document.getElementById('chart-product-stats').getContext('2d');
    if (charts['product-stats']) charts['product-stats'].destroy();
    
    charts['product-stats'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          label: 'Doanh Thu ($)',
          data: data.map(d => d.revenue),
          backgroundColor: '#8b5cf6'
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { x: { beginAtZero: true } }
      }
    });
  } catch (err) {
    console.error('Product Stats Error:', err);
  }
}

async function loadCustomerStats() {
  try {
    const search = document.getElementById('stat-customer-search').value;
    const res = await fetch(`${API_BASE}/stats/customers?search=${encodeURIComponent(search)}&limit=20&offset=0`);
    const data = await res.json();
    
    const tbody = document.querySelector('#customer-stats-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.customerName}</td>
        <td>${row.country}</td>
        <td class="num">${row.orderCount}</td>
        <td class="num">$${parseFloat(row.totalRevenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td class="num">$${parseFloat(row.totalPayments).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td>${row.lastOrderDate ? new Date(row.lastOrderDate).toLocaleDateString('vi-VN') : 'N/A'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Customer Stats Error:', err);
  }
}

// ============ PIVOT TABLES ============
async function loadPivotCustomerTime() {
  try {
    const year = document.getElementById('pivot-year').value;
    const topN = document.getElementById('pivot-topn').value || 10;
    
    const res = await fetch(`${API_BASE}/stats/pivot/customer-time?year=${year}&topN=${topN}`);
    const data = await res.json();
    
    // Group data by customer
    const grouped = {};
    const periods = new Set();
    
    data.forEach(row => {
      if (!grouped[row.customerName]) grouped[row.customerName] = {};
      grouped[row.customerName][row.period] = row.revenue;
      periods.add(row.period);
    });
    
    const sortedPeriods = Array.from(periods).sort();
    
    // Build pivot table
    let html = '<tr><th>Khách Hàng</th>';
    sortedPeriods.forEach(p => html += `<th class="num">${p}</th>`);
    html += '<th class="num">Tổng</th></tr>';
    
    Object.entries(grouped).forEach(([customer, revenues]) => {
      let total = 0;
      html += `<tr><td>${customer}</td>`;
      sortedPeriods.forEach(p => {
        const rev = revenues[p] || 0;
        total += rev;
        html += `<td class="num">$${parseFloat(rev).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>`;
      });
      html += `<td class="num total-row">$${parseFloat(total).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>`;
    });
    
    document.querySelector('#pivot-customer-time-table thead').innerHTML = '<tr><th>Khách Hàng</th>' + sortedPeriods.map(p => `<th class="num">${p}</th>`).join('') + '<th class="num">Tổng</th></tr>';
    document.querySelector('#pivot-customer-time-table tbody').innerHTML = Array.from(document.querySelectorAll('#pivot-customer-time-table tbody tr')).map(() => '').join('') || html.split('<tr>').slice(1).map(r => '<tr>' + r).join('');
    
    // Simple rebuild
    const table = document.getElementById('pivot-customer-time-table');
    table.innerHTML = '<thead>' + html.split('</tr>')[0] + '</tr></thead><tbody>' + html.split('</tr>').slice(1).join('</tr>') + '</tbody>';
  } catch (err) {
    console.error('Pivot Customer-Time Error:', err);
  }
}

async function loadPivotProductTime() {
  try {
    const year = document.getElementById('pivot-year-product').value;
    const res = await fetch(`${API_BASE}/stats/pivot/product-time${year ? '?year=' + year : ''}`);
    const data = await res.json();
    
    const grouped = {};
    const periods = new Set();
    
    data.forEach(row => {
      if (!grouped[row.productLine]) grouped[row.productLine] = {};
      grouped[row.productLine][row.period] = row.revenue;
      periods.add(row.period);
    });
    
    const sortedPeriods = Array.from(periods).sort();
    
    let html = '';
    Object.entries(grouped).forEach(([product, revenues]) => {
      let total = 0;
      html += `<tr><td>${product}</td>`;
      sortedPeriods.forEach(p => {
        const rev = revenues[p] || 0;
        total += rev;
        html += `<td class="num">$${parseFloat(rev).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>`;
      });
      html += `<td class="num total-row">$${parseFloat(total).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>`;
    });
    
    const table = document.getElementById('pivot-product-time-table');
    table.innerHTML = '<thead><tr><th>Dòng Sản Phẩm</th>' + sortedPeriods.map(p => `<th class="num">${p}</th>`).join('') + '<th class="num">Tổng</th></tr></thead><tbody>' + html + '</tbody>';
  } catch (err) {
    console.error('Pivot Product-Time Error:', err);
  }
}

async function loadRollupCountryProduct() {
  try {
    const year = document.getElementById('rollup-year').value;
    const res = await fetch(`${API_BASE}/stats/rollup/country-product${year ? '?year=' + year : ''}`);
    const data = await res.json();
    
    const tbody = document.querySelector('#rollup-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      const isTotal = row.country === '--- TỔNG CỘNG ---';
      const isSubtotal = row.productLine === '--- TỔNG DÒNG SP ---';
      
      let className = '';
      if (isTotal) className = 'total-row';
      else if (isSubtotal) className = 'subtotal-row';
      
      tr.className = className;
      tr.innerHTML = `
        <td>${row.country}</td>
        <td>${row.productLine}</td>
        <td class="num">$${parseFloat(row.revenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td class="num">${row.units.toLocaleString()}</td>
        <td class="num">${row.orders}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Rollup Error:', err);
  }
}

// ============ CHATBOT ============
let chatHistory = [];

function askSuggestion(btn) {
  document.getElementById('chatbot-input').value = btn.textContent.trim();
  sendChatMessage();
}

function clearChat() {
  chatHistory = [];
  const messagesDiv = document.getElementById('chatbot-messages');
  messagesDiv.innerHTML = `
    <div id="chat-welcome" style="text-align:center; padding:40px 20px; color:#64748b;">
      <div style="font-size:2.5rem; margin-bottom:12px;">🤖</div>
      <div style="font-weight:600; font-size:1.05rem; color:#1e293b; margin-bottom:8px;">Xin chào! Tôi là ClassBot</div>
      <div style="font-size:.9rem;">Trợ lý AI được tích hợp Gemini, có thể trả lời mọi câu hỏi<br>về dữ liệu ClassicModels dựa trên dữ liệu thực tế.</div>
    </div>`;
}

function appendMessage(role, html, isMarkdown = false) {
  const messagesDiv = document.getElementById('chatbot-messages');
  const welcome = document.getElementById('chat-welcome');
  if (welcome) welcome.remove();

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `display:flex; flex-direction:column; align-items:${role === 'user' ? 'flex-end' : 'flex-start'};`;

  const label = document.createElement('div');
  label.style.cssText = `font-size:.75rem; color:#94a3b8; margin-bottom:4px; padding:0 4px;`;
  label.textContent = role === 'user' ? 'Bạn' : '🤖 ClassBot';
  wrapper.appendChild(label);

  const bubble = document.createElement('div');
  const baseStyle = 'padding:12px 16px; border-radius:12px; font-size:.92rem; line-height:1.65; max-width:85%;';
  if (role === 'user') {
    bubble.style.cssText = baseStyle + 'background:#2563eb; color:#fff; border-bottom-right-radius:4px;';
    bubble.textContent = html;
  } else {
    bubble.style.cssText = baseStyle + 'background:#fff; color:#1e293b; border:1px solid #e2e8f0; border-bottom-left-radius:4px;';
    bubble.innerHTML = isMarkdown ? marked.parse(html) : html;
    // Style markdown tables inside bubble
    bubble.querySelectorAll('table').forEach(t => {
      t.style.cssText = 'border-collapse:collapse; font-size:.85rem; width:100%; margin:8px 0;';
      t.querySelectorAll('th').forEach(th => th.style.cssText = 'background:#1e293b; color:#fff; padding:7px 10px; text-align:left;');
      t.querySelectorAll('td').forEach(td => td.style.cssText = 'padding:6px 10px; border-bottom:1px solid #f1f5f9;');
    });
  }
  wrapper.appendChild(bubble);
  messagesDiv.appendChild(wrapper);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendTypingIndicator() {
  const messagesDiv = document.getElementById('chatbot-messages');
  const el = document.createElement('div');
  el.id = 'typing-indicator';
  el.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 4px; color:#64748b; font-size:.88rem;';
  el.innerHTML = `<span style="display:flex; gap:4px;">
    <span style="width:8px; height:8px; background:#94a3b8; border-radius:50%; animation:bounce .8s infinite;"></span>
    <span style="width:8px; height:8px; background:#94a3b8; border-radius:50%; animation:bounce .8s .2s infinite;"></span>
    <span style="width:8px; height:8px; background:#94a3b8; border-radius:50%; animation:bounce .8s .4s infinite;"></span>
  </span> ClassBot đang trả lời...`;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatbot-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.6';

  appendMessage('user', message);
  appendTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory })
    });

    document.getElementById('typing-indicator')?.remove();

    const result = await res.json();

    if (!res.ok) {
      appendMessage('bot', `⚠️ Lỗi: ${result.error || 'Không thể kết nối Gemini AI'}`, false);
    } else {
      appendMessage('bot', result.reply, true);
      // Lưu lịch sử
      chatHistory.push({ role: 'user', text: message });
      chatHistory.push({ role: 'model', text: result.reply });
      // Giới hạn history 10 lượt
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    }
  } catch (err) {
    document.getElementById('typing-indicator')?.remove();
    appendMessage('bot', `⚠️ Lỗi kết nối: ${err.message}`, false);
  } finally {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
  }
}

function handleChatKeypress(event) {
  if (event.key === 'Enter') sendChatMessage();
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
