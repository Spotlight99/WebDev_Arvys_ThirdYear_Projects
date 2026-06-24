let balance = 5000; // starting balance
let sessionActive = false; // true only once logged in with correct PIN
let cardInserted = false;  // true once the user has "inserted" their card
let log = [];
const CURRENCY = '₦'; // change this one line to switch currency symbol
const DEFAULT_PIN = '1234'; // change this one line to switch the ATM's PIN

function setScreen(msg) {
  document.getElementById('screen').innerHTML = msg;
}

// ---- Step 1: Insert Card ----
function insertCard() {
  cardInserted = true;
  document.getElementById('insertSection').style.display = 'none';
  document.getElementById('pinSection').classList.add('active');
  setScreen('💳 Card inserted. Please enter your PIN.');
  document.getElementById('pinInput').focus();
}

// ---- Step 2: PIN Entry ----
function checkPin() {
  if (!cardInserted) return; // safety guard, shouldn't normally happen

  const pinInput = document.getElementById('pinInput');
  const entered = pinInput.value.trim();

  // Must be exactly 4 digits - no letters, symbols, or wrong lengths allowed
  if (!/^\d{4}$/.test(entered)) {
    setScreen('<span class="screen-error">⚠ PIN must be exactly 4 digits.</span>');
    pinInput.value = '';
    pinInput.focus();
    return;
  }

  if (entered !== DEFAULT_PIN) {
    setScreen('<span class="screen-error">⚠ Incorrect PIN. Please try again.</span>');
    pinInput.value = '';
    pinInput.focus();
    return;
  }

  sessionActive = true;
  document.getElementById('pinSection').classList.remove('active');
  document.getElementById('pinInput').value = '';
  document.getElementById('mainButtons').style.display = 'grid';
  setScreen('👋 Welcome! Login successful.<br>Please choose an option below.');
}

// ---- Step 3: Main Menu Actions ----
function updateHistory() {
  const historyEl = document.getElementById('history');
  if (log.length === 0) {
    historyEl.textContent = 'Transaction history will appear here.';
  } else {
    historyEl.innerHTML = log.slice(-5).reverse().map(l => `&bull; ${l}`).join('<br>');
  }
}

function checkBalance() {
  if (!sessionActive) return;
  setScreen(`<div class="balance-display">Balance: ${CURRENCY}${balance.toFixed(2)}</div>`);
  resetInputFieldsOnly();
  showEjectPopup();
}

function showInput(type) {
  if (!sessionActive) return;
  hideEjectPopup();
  document.getElementById('withdrawInput').classList.remove('active');
  document.getElementById('depositInput').classList.remove('active');
  document.getElementById(type + 'Input').classList.add('active');
}

function resetInput() {
  document.getElementById('withdrawInput').classList.remove('active');
  document.getElementById('depositInput').classList.remove('active');
  document.getElementById('withdrawAmount').value = '';
  document.getElementById('depositAmount').value = '';
  if (sessionActive) {
    setScreen('Transaction canceled. Please choose an option below.');
    showEjectPopup('Transaction canceled. Done banking?');
  }
}

function withdraw() {
  const input = document.getElementById('withdrawAmount');
  const amount = parseFloat(input.value);

  if (isNaN(amount) || amount <= 0) {
    setScreen('<span class="screen-error">⚠ Please enter a valid amount.</span>');
    return;
  }
  if (amount > balance) {
    setScreen(`<span class="screen-error">⚠ Insufficient funds. Your balance is ${CURRENCY}${balance.toFixed(2)}.</span>`);
    return;
  }
  balance -= amount;
  log.push(`Withdrew ${CURRENCY}${amount.toFixed(2)}`);
  setScreen(`✅ Withdrawal successful!<br>New balance: ${CURRENCY}${balance.toFixed(2)}`);
  updateHistory();
  resetInputFieldsOnly();
  showEjectPopup();
}

function deposit() {
  const input = document.getElementById('depositAmount');
  const amount = parseFloat(input.value);

  if (isNaN(amount) || amount <= 0) {
    setScreen('<span class="screen-error">⚠ Please enter a valid amount.</span>');
    return;
  }
  balance += amount;
  log.push(`Deposited ${CURRENCY}${amount.toFixed(2)}`);
  setScreen(`✅ Deposit successful!<br>New balance: ${CURRENCY}${balance.toFixed(2)}`);
  updateHistory();
  resetInputFieldsOnly();
  showEjectPopup();
}

function resetInputFieldsOnly() {
  document.getElementById('withdrawInput').classList.remove('active');
  document.getElementById('depositInput').classList.remove('active');
  document.getElementById('withdrawAmount').value = '';
  document.getElementById('depositAmount').value = '';
}

// ---- Step 4: Eject Card popup ----
function showEjectPopup(message) {
  const popup = document.getElementById('ejectPopup');
  popup.querySelector('p').textContent = message || 'Transaction complete. Done banking?';
  popup.style.display = 'block';
}

function hideEjectPopup() {
  document.getElementById('ejectPopup').style.display = 'none';
}

// ---- Step 5: Eject Card -> back to Insert Card ----
function ejectCard() {
  sessionActive = false;
  cardInserted = false;

  hideEjectPopup();
  resetInputFieldsOnly();
  document.getElementById('mainButtons').style.display = 'none';
  document.getElementById('pinSection').classList.remove('active');
  document.getElementById('pinInput').value = '';
  document.getElementById('insertSection').style.display = 'block';

  setScreen('⏏ Card ejected. Please insert your card to begin.');
}

document.getElementById('pinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkPin();
});

document.getElementById('withdrawAmount').addEventListener('keydown', e => {
  if (e.key === 'Enter') withdraw();
});

document.getElementById('depositAmount').addEventListener('keydown', e => {
  if (e.key === 'Enter') deposit();
});

// Strip out anything that isn't a digit as the user types, live
document.getElementById('pinInput').addEventListener('input', function() {
  this.value = this.value.replace(/\D/g, '').slice(0, 4);
});