const PASS_MARK = 40; // minimum score to pass
let students = [];
let fileHandle = null; // holds reference to the linked local JSON file

// ---- Local storage autosave (keeps data between page refreshes) ----
function autoSave() {
  localStorage.setItem('studentResultsData', JSON.stringify(students));
  writeToLinkedFile(); // also push to the linked local file, if any
}

function autoRestore() {
  const saved = localStorage.getItem('studentResultsData');
  if (saved) {
    try {
      students = JSON.parse(saved);
    } catch (e) {
      students = [];
    }
  }
}

// ---- Link to a real local JSON file using the File System Access API ----
// Once linked, every add/remove writes straight to that file automatically.
async function linkFile() {
  if (!('showSaveFilePicker' in window)) {
    showError('⚠ Your browser does not support direct file linking. Use "Download Copy" instead (works in Chrome/Edge for auto-saving).');
    return;
  }
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'student-results.json',
      types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]
    });
    await writeToLinkedFile();
    const status = document.getElementById('fileStatus');
    status.textContent = '🔗 Linked! New students now auto-save to this file.';
    setTimeout(() => { status.textContent = ''; }, 5000);
  } catch (err) {
    // user cancelled the picker - do nothing
  }
}

async function writeToLinkedFile() {
  if (!fileHandle) return;
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(students, null, 2));
    await writable.close();
  } catch (err) {
    console.error('Could not write to linked file:', err);
  }
}

// ---- Save to a local .json file (downloads to your computer) ----
function saveToFile() {
  const dataStr = JSON.stringify(students, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student-results.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const status = document.getElementById('fileStatus');
  status.textContent = '✔ Downloaded student-results.json';
  setTimeout(() => { status.textContent = ''; }, 4000);
}

// ---- Load from a local .json file you previously saved ----
function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const loaded = JSON.parse(e.target.result);
      if (!Array.isArray(loaded)) throw new Error('Invalid format');
      students = loaded;
      autoSave();
      render();
      const status = document.getElementById('fileStatus');
      status.textContent = `✔ Loaded ${students.length} student(s) from file`;
      setTimeout(() => { status.textContent = ''; }, 4000);
    } catch (err) {
      showError('⚠ Could not read that file. Make sure it is a valid student-results.json file.');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // reset so the same file can be re-selected later
}

function getGrade(score) {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function showError(msg) {
  const errorEl = document.getElementById('errorMsg');
  errorEl.textContent = msg;
  errorEl.classList.add('show');
}

function clearError() {
  const errorEl = document.getElementById('errorMsg');
  errorEl.textContent = '';
  errorEl.classList.remove('show');
}

async function addStudent() {
  const nameInput = document.getElementById('studentName');
  const scoreInput = document.getElementById('studentScore');
  const name = nameInput.value.trim();
  const score = parseFloat(scoreInput.value);

  if (!name) {
    showError('⚠ Please enter a student name.');
    return;
  }
  if (isNaN(score) || score < 0 || score > 100) {
    showError('⚠ Please enter a valid score between 0 and 100.');
    return;
  }

  clearError();
  students.push({ name, score });

  // On the very first student, prompt to link a local JSON file (if supported)
  if (students.length === 1 && !fileHandle && 'showSaveFilePicker' in window) {
    await linkFile();
  }

  autoSave();
  nameInput.value = '';
  scoreInput.value = '';
  nameInput.focus();
  render();
}

function deleteStudent(index) {
  students.splice(index, 1);
  autoSave();
  render();
}

function render() {
  const body = document.getElementById('resultsBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');
  body.innerHTML = '';

  if (students.length === 0) {
    emptyMsg.style.display = 'block';
    summary.style.display = 'none';
    return;
  }
  emptyMsg.style.display = 'none';
  summary.style.display = 'block';

  let passCount = 0;
  let total = 0;
  let highest = students[0];

  students.forEach((s, i) => {
    const grade = getGrade(s.score);
    const passed = s.score >= PASS_MARK;
    if (passed) passCount++;
    total += s.score;
    if (s.score > highest.score) highest = s;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.score}</td>
      <td>${grade}</td>
      <td class="${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</td>
      <td><button class="delete-btn" onclick="deleteStudent(${i})">Remove</button></td>
    `;
    body.appendChild(row);
  });

  document.getElementById('totalCount').textContent = students.length;
  document.getElementById('passCount').textContent = passCount;
  document.getElementById('failCount').textContent = students.length - passCount;
  document.getElementById('average').textContent = (total / students.length).toFixed(2);
  document.getElementById('highest').textContent = `${highest.name} (${highest.score})`;
}

document.getElementById('studentScore').addEventListener('keydown', e => {
  if (e.key === 'Enter') addStudent();
});

// Restore any previously saved students when the page loads
autoRestore();
render();

// Immediately show error if the user types a score outside 0-100
document.getElementById('studentScore').addEventListener('input', function() {
  const val = this.value;
  if (val === '') { clearError(); return; }
  const num = parseFloat(val);
  if (isNaN(num)) return;
  if (num < 0 || num > 100) {
    showError('⚠ Invalid score! Score must be between 0 and 100.');
    this.value = '';
    this.focus();
  } else {
    clearError();
  }
});