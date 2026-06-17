// ================================================================
//  عيادة د. أحمد سالم — Google Apps Script
//  Sheet: https://docs.google.com/spreadsheets/d/17753C4h7TE98hW4SWN2jiP6BUsCv0uSCQbgn8NZ3kcM
//
//  طريقة النشر:
//  1. افتح الشيت → Extensions → Apps Script
//  2. احذف الكود الموجود والصق هذا الكود
//  3. احفظ ثم: Deploy → New Deployment → Web App
//     Execute as: Me | Who has access: Anyone
//  4. انسخ رابط Web App والصقه في تبويب الإعدادات (كلمة مرور: 0000)
// ================================================================

const SPREADSHEET_ID = '17753C4h7TE98hW4SWN2jiP6BUsCv0uSCQbgn8NZ3kcM';

// أعمدة كل ورقة
const BOOKING_COLS = ['code','fname','lname','phone','email','service','price','paidAmount','payOption','date','time','status','payStatus','submittedAt','notes'];
const SLOT_COLS    = ['id','specificDate','dateLabel','day','timeLabel','displayTime','from','to','maxPatients','type','active'];
const MSG_COLS     = ['id','name','phone','subject','message','receivedAt','read'];
const HEADER_LABELS = {
  code:'كود الحجز', fname:'الاسم الأول', lname:'الاسم الأخير',
  phone:'الهاتف', email:'البريد', service:'الخدمة',
  price:'السعر الكامل', paidAmount:'المبلغ المدفوع', payOption:'نوع الدفع',
  date:'التاريخ', time:'الوقت', status:'حالة الحجز',
  payStatus:'حالة الدفع', submittedAt:'وقت التسجيل', notes:'ملاحظات',
  id:'ID', specificDate:'تاريخ محدد', dateLabel:'التاريخ بالعربي',
  day:'اليوم', timeLabel:'تسمية الوقت', displayTime:'وقت العرض',
  from:'من', to:'إلى', maxPatients:'أقصى عدد مرضى',
  type:'نوع الخدمة', active:'مفعّل',
  name:'الاسم', subject:'الموضوع', message:'الرسالة',
  receivedAt:'وقت الاستلام', read:'مقروء'
};
const HEADER_ALIASES = {
  'كود الحجز':'code', code:'code',
  'الاسم الأول':'fname', fname:'fname',
  'الاسم الأخير':'lname', lname:'lname',
  'الهاتف':'phone', phone:'phone',
  'البريد':'email', 'البريد الإلكتروني':'email', email:'email',
  'الخدمة':'service', service:'service',
  'السعر الكامل':'price', price:'price',
  'المبلغ المدفوع':'paidAmount', paidAmount:'paidAmount',
  'نوع الدفع':'payOption', payOption:'payOption',
  'التاريخ':'date', date:'date',
  'الوقت':'time', time:'time',
  'حالة الحجز':'status', status:'status',
  'حالة الدفع':'payStatus', payStatus:'payStatus',
  'وقت التسجيل':'submittedAt', submittedAt:'submittedAt',
  'ملاحظات':'notes', notes:'notes',
  'ID':'id', id:'id',
  'تاريخ محدد':'specificDate', specificDate:'specificDate',
  'التاريخ بالعربي':'dateLabel', 'تاريخ':'dateLabel', dateLabel:'dateLabel',
  'اليوم':'day', day:'day',
  'تسمية الوقت':'timeLabel', timeLabel:'timeLabel',
  'وقت العرض':'displayTime', displayTime:'displayTime',
  'من':'from', from:'from',
  'إلى':'to', to:'to',
  'أقصى عدد مرضى':'maxPatients', maxPatients:'maxPatients',
  'نوع الخدمة':'type', type:'type',
  'مفعّل':'active', active:'active',
  'الاسم':'name', name:'name',
  'الموضوع':'subject', subject:'subject',
  'الرسالة':'message', message:'message',
  'وقت الاستلام':'receivedAt', receivedAt:'receivedAt',
  'مقروء':'read', read:'read'
};

// ─── GET ─────────────────────────────────────────────────────
function doGet(e) {
  const p = e.parameter || {};
  let result;
  try {
    const action = p.action || 'getBookings';
    if      (action === 'getBookings') result = getBookings();
    else if (action === 'getSlots')    result = getSlots();
    else if (action === 'getMessages') result = getMessages();
    else if (action === 'getStats')    result = getStats();
    else result = { error: 'Unknown action: ' + action };
  } catch(err) { result = { error: err.message, stack: err.stack }; }
  return buildResponse(result);
}

// ─── POST ────────────────────────────────────────────────────
function doPost(e) {
  let body, result;
  try {
    body = JSON.parse(e.postData.contents);
    const action = body.action;
    if      (action === 'addBooking')    result = addBooking(body.data);
    else if (action === 'updateBooking') result = updateBookingField(body.code, body.field, body.value);
    else if (action === 'saveSlots')     result = saveSlots(body.slots);
    else if (action === 'addMessage')    result = addMessage(body.data);
    else if (action === 'markMsgRead')   result = markMsgRead(body.id);
    else result = { error: 'Unknown action: ' + action };
  } catch(err) { result = { error: err.message }; }
  return buildResponse(result);
}

// ─── SHEET HELPER ────────────────────────────────────────────
function getSheet(name, cols) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,cols.length).setValues([cols.map(c=>HEADER_LABELS[c]||c)])
      .setBackground('#0D5C52').setFontColor('#fff').setFontWeight('bold');
    sh.setFrozenRows(1);
    cols.forEach((_,i)=>sh.setColumnWidth(i+1, 140));
  } else {
    ensureSheetHeaders(sh, cols);
  }
  return sh;
}

function ensureSheetHeaders(sh, cols) {
  if (sh.getLastColumn() < cols.length) {
    sh.insertColumnsAfter(sh.getLastColumn(), cols.length - sh.getLastColumn());
  }
  const headers = sh.getRange(1, 1, 1, cols.length).getValues()[0].map(normalizeHeaderKey);
  const matches = cols.every((col, i) => headers[i] === col);
  if (!matches) {
    sh.getRange(1,1,1,cols.length).setValues([cols.map(c=>HEADER_LABELS[c]||c)])
      .setBackground('#0D5C52').setFontColor('#fff').setFontWeight('bold');
  }
  cols.forEach((_,i)=>sh.setColumnWidth(i+1, 140));
}

function normalizeHeaderKey(header) {
  const key = String(header || '').trim();
  return HEADER_ALIASES[key] || key;
}

function readSheetObjects(name, cols) {
  const sh = getSheet(name, cols);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(normalizeHeaderKey);
  const headerMap = {};
  headers.forEach((header, index) => {
    if (header && headerMap[header] === undefined) headerMap[header] = index;
  });

  return data.slice(1).map(row => {
    const obj = {};
    cols.forEach((col, index) => {
      const cellIndex = headerMap[col] !== undefined ? headerMap[col] : index;
      obj[col] = row[cellIndex] !== undefined ? String(row[cellIndex]) : '';
    });
    return obj;
  });
}

// ─── BOOKINGS ────────────────────────────────────────────────
function getBookings() {
  return {
    bookings: readSheetObjects('Bookings', BOOKING_COLS).filter(b => b.code)
  };
}

function addBooking(data) {
  const sh = getSheet('Bookings', BOOKING_COLS);
  const existing = sh.getDataRange().getValues();
  if (existing.slice(1).some(r => String(r[0]) === data.code))
    return { success: false, error: 'Duplicate code' };
  const row = BOOKING_COLS.map(col => data[col] !== undefined ? data[col] : '');
  sh.appendRow(row);
  const lr = sh.getLastRow();
  colorCell(sh, lr, BOOKING_COLS.indexOf('status')+1,    statusColor(data.status));
  colorCell(sh, lr, BOOKING_COLS.indexOf('payStatus')+1, payColor(data.payStatus));
  try { notify(data); } catch(e){}
  return { success: true, code: data.code };
}

function updateBookingField(code, field, value) {
  const sh = getSheet('Bookings', BOOKING_COLS);
  const rows = sh.getDataRange().getValues();
  const ci = BOOKING_COLS.indexOf(field);
  if (ci < 0) return { success: false, error: 'Unknown field: '+field };
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === code) {
      sh.getRange(i+1, ci+1).setValue(value);
      if (field==='status')    colorCell(sh, i+1, ci+1, statusColor(value));
      if (field==='payStatus') colorCell(sh, i+1, ci+1, payColor(value));
      return { success: true };
    }
  }
  return { success: false, error: 'Code not found: '+code };
}

function colorCell(sh, row, col, color) { sh.getRange(row,col).setBackground(color); }
function statusColor(v){ return {'مؤكد':'#e8f5f3','مؤكد - في انتظار الدفع':'#e8f5f3','قيد الانتظار':'#fffff0','مكتمل':'#d4eddf','ملغى':'#fff5f5'}[v]||'#fff'; }
function payColor(v){ return {'مدفوع بالكامل':'#d4eddf','مدفوع':'#d4eddf','مدفوع نصف':'#fffff0','غير مدفوع':'#fff3eb'}[v]||'#fff'; }

// ─── SLOTS ───────────────────────────────────────────────────
function getSlots() {
  return {
    slots: readSheetObjects('Slots', SLOT_COLS).filter(s => s.id)
  };
}

function saveSlots(slots) {
  const sh = getSheet('Slots', SLOT_COLS);
  const lr = sh.getLastRow();
  if (lr > 1) sh.getRange(2,1,lr-1,SLOT_COLS.length).clearContent();
  if (slots && slots.length) {
    sh.getRange(2,1,slots.length,SLOT_COLS.length)
      .setValues(slots.map(s => SLOT_COLS.map(col => s[col]!==undefined ? s[col] : '')));
  }
  return { success: true };
}

// ─── MESSAGES ────────────────────────────────────────────────
function getMessages() {
  return {
    messages: readSheetObjects('Messages', MSG_COLS).filter(m => m.id).reverse() // newest first
  };
}

function addMessage(data) {
  const sh = getSheet('Messages', MSG_COLS);
  data.id   = 'MSG-' + new Date().getTime();
  data.receivedAt = new Date().toLocaleString('ar-EG');
  data.read = 'false';
  sh.appendRow(MSG_COLS.map(col => data[col]||''));
  return { success: true };
}

function markMsgRead(id) {
  const sh = getSheet('Messages', MSG_COLS);
  const rows = sh.getDataRange().getValues();
  const ci = MSG_COLS.indexOf('read');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][MSG_COLS.indexOf('id')]) === id) {
      sh.getRange(i+1, ci+1).setValue('true');
      return { success: true };
    }
  }
  return { success: false };
}

// ─── STATS ───────────────────────────────────────────────────
function getStats() {
  const { bookings } = getBookings();
  const { messages } = getMessages();
  return {
    total:    bookings.length,
    pending:  bookings.filter(b => b.status==='قيد الانتظار').length,
    unpaid:   bookings.filter(b => b.payStatus==='غير مدفوع' && b.status!=='ملغى').length,
    revenue:  bookings.filter(b => b.payStatus!=='غير مدفوع').reduce((s,b)=>s+Number(b.paidAmount||0),0),
    unreadMessages: messages.filter(m => m.read==='false').length
  };
}

// ─── EMAIL ───────────────────────────────────────────────────
function notify(data) {
  MailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    'حجز جديد — '+data.code+' | '+data.fname+' '+data.lname,
    'مريض: '+data.fname+' '+data.lname+'\nهاتف: '+data.phone+'\nخدمة: '+data.service+'\nموعد: '+data.date+' — '+data.time+'\nمبلغ: '+data.price+' ج.م\nدفع: '+data.payOption+' ('+data.paidAmount+' ج.م)\nكود: '+data.code
  );
}

// ─── RESPONSE ────────────────────────────────────────────────
function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
