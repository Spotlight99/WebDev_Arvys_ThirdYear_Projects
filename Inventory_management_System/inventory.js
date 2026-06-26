// ---- CONSTANTS & STATE ----
const STORAGE_KEY = 'inventoryProducts300';
const SORT_COLUMNS = ['name', 'category', 'qty', 'price', 'value', 'createdAt'];

let products      = [];
let currentCurrency = '$';
let editingIndex  = -1;
let sortColumn    = 'name';
let sortOrder     = 'asc';
let fileHandle    = null;

// ---- LOCAL STORAGE ----
function autoSave() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function autoRestore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { products = JSON.parse(saved); } catch(e) { products = []; }
    renderTable();
  }
}

// ---- FILE OPERATIONS ----
async function linkFile() {
  if (!('showSaveFilePicker' in window)) {
    setStatus('⚠ Link file needs Chrome or Edge. Use Download JSON instead.');
    return;
  }
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'inventory.json',
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
    });
    await writeToFile();
    setStatus('🔗 Linked! Changes auto-save to file.');
  } catch (e) {
    // user cancelled
  }
}

async function writeToFile() {
  if (!fileHandle) return;
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(products, null, 2));
    await writable.close();
  } catch (e) {
    console.error('File write error:', e);
  }
}

function saveToFile() {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'inventory.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus('✔ Downloaded inventory.json');
}

function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const loaded = JSON.parse(e.target.result);
      if (!Array.isArray(loaded)) throw new Error('Invalid format');
      products = loaded;
      autoSave();
      renderTable();
      setStatus('✔ Loaded ' + products.length + ' product(s) from file');
    } catch(err) {
      setStatus('⚠ Could not read file. Make sure it is a valid inventory.json.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function setStatus(msg) {
  const el = document.getElementById('fileStatus');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 4000);
}

// ---- PDF EXPORT ----
function exportPDF() {
  if (products.length === 0) {
    alert('No products to export.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Inventory Management Report', 20, 15);

  doc.setFontSize(10);
  doc.text('Generated: ' + new Date().toLocaleString(), 20, 25);

  const totalValue = products.reduce((s, p) => s + p.qty * p.price, 0);
  const totalQty   = products.reduce((s, p) => s + p.qty, 0);
  doc.text(
    'Total Products: ' + products.length +
    '  |  Total Units: ' + totalQty +
    '  |  Total Value: ' + currentCurrency + totalValue.toFixed(2),
    20, 35
  );

  const tableData = products.map(p => [
    p.name,
    p.category,
    p.qty,
    currentCurrency + p.price.toFixed(2),
    currentCurrency + (p.qty * p.price).toFixed(2),
    p.createdAt
  ]);

  doc.autoTable({
    head: [['Product', 'Category', 'Qty', 'Price', 'Total Value', 'Added']],
    body: tableData,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [19, 78, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 249, 245] }
  });

  doc.save('inventory-report.pdf');
  setStatus('✔ Exported inventory-report.pdf');
}

// ---- CURRENCY ----
function changeCurrency() {
  currentCurrency = document.getElementById('currencySelect').value;
  renderTable();
}

// ---- ADD PRODUCT ----
function addProduct() {
  const name     = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const qty      = parseInt(document.getElementById('productQty').value);
  const price    = parseFloat(document.getElementById('productPrice').value);

  if (!name)                      { alert('Enter product name');        return; }
  if (!category)                  { alert('Select a category');         return; }
  if (isNaN(qty)   || qty < 0)   { alert('Enter a valid quantity');    return; }
  if (isNaN(price) || price < 0) { alert('Enter a valid price');       return; }

  if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert('❌ Product already exists! Use Edit to update it.');
    return;
  }

  products.push({
    id: Date.now(),
    name,
    category,
    qty,
    price,
    createdAt: new Date().toLocaleDateString()
  });

  autoSave();
  writeToFile();

  document.getElementById('productName').value     = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productQty').value      = '';
  document.getElementById('productPrice').value    = '';

  renderTable();
}

// ---- EDIT ----
function openEdit(index) {
  editingIndex = index;
  const p = products[index];
  document.getElementById('editName').value     = p.name;
  document.getElementById('editCategory').value = p.category;
  document.getElementById('editQty').value      = p.qty;
  document.getElementById('editPrice').value    = p.price;
  document.getElementById('editModal').classList.add('active');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
  editingIndex = -1;
}

function saveEdit() {
  const p    = products[editingIndex];
  p.name     = document.getElementById('editName').value.trim();
  p.category = document.getElementById('editCategory').value;
  p.qty      = parseInt(document.getElementById('editQty').value);
  p.price    = parseFloat(document.getElementById('editPrice').value);
  autoSave();
  writeToFile();
  renderTable();
  closeModal();
}

// ---- RESTOCK ----
function restock(index, amount) {
  products[index].qty = Math.max(0, products[index].qty + amount);
  autoSave();
  writeToFile();
  renderTable();
}

// ---- DELETE ----
function deleteProduct(index) {
  if (confirm('Delete this product?')) {
    products.splice(index, 1);
    autoSave();
    writeToFile();
    renderTable();
  }
}

// ---- SORT ----
function sortTable(column) {
  if (sortColumn === column) {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortOrder  = 'asc';
  }
  renderTable();
}

function updateSortIcons() {
  SORT_COLUMNS.forEach(col => {
    const el = document.getElementById('sort-' + col);
    if (!el) return;
    el.textContent = col === sortColumn
      ? (sortOrder === 'asc' ? ' ▲' : ' ▼')
      : '';
  });
}

// ---- RENDER TABLE ----
function renderTable() {
  const search    = document.getElementById('searchBox').value.toLowerCase();
  const threshold = parseInt(document.getElementById('lowStockThreshold').value) || 5;
  const body      = document.getElementById('productBody');
  const emptyMsg  = document.getElementById('emptyMsg');
  body.innerHTML  = '';

  let filtered = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.category.toLowerCase().includes(search)
  );

  filtered.sort((a, b) => {
    let aVal = sortColumn === 'value' ? a.qty * a.price : a[sortColumn];
    let bVal = sortColumn === 'value' ? b.qty * b.price : b[sortColumn];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  emptyMsg.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((p, i) => {
    const value       = p.qty * p.price;
    const lowStock    = p.qty <= threshold;
    const actualIndex = products.findIndex(prod => prod.id === p.id);
    const row         = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td class="${lowStock ? 'low-stock' : ''}">${p.qty}${lowStock ? ' ⚠️' : ''}</td>
      <td>${currentCurrency}${p.price.toFixed(2)}</td>
      <td>${currentCurrency}${value.toFixed(2)}</td>
      <td>${p.createdAt}</td>
      <td>
        <button class="restock-btn" onclick="restock(${actualIndex}, 1)">+1</button>
        <button class="restock-btn" onclick="restock(${actualIndex}, -1)">-1</button>
        <button class="edit-btn"    onclick="openEdit(${actualIndex})">Edit</button>
        <button class="delete-btn"  onclick="deleteProduct(${actualIndex})">Delete</button>
      </td>
    `;
    body.appendChild(row);
  });

  updateStats(threshold);
  updateSortIcons();
}

// ---- STATS ----
function updateStats(threshold) {
  const units    = products.reduce((s, p) => s + p.qty, 0);
  const value    = products.reduce((s, p) => s + p.qty * p.price, 0);
  const lowCount = products.filter(p => p.qty <= threshold).length;
  document.getElementById('totalProducts').textContent = products.length;
  document.getElementById('totalUnits').textContent    = units;
  document.getElementById('totalValue').textContent    = currentCurrency + value.toFixed(2);
  document.getElementById('lowStockCount').textContent = lowCount;
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  autoRestore();
  document.getElementById('productPrice').addEventListener('keydown', e => {
    if (e.key === 'Enter') addProduct();
  });
});