// ============================================================================
// ใส่ Channel ID ของ LINE Login channel (ตัวเดียวกับที่สร้าง LIFF app)
// LINE Developers Console > LINE Login channel > Basic settings > Channel ID
// ============================================================================
var LINE_CHANNEL_ID = '2012195321';

// กดรันฟังก์ชันนี้ใน Apps Script 1 ครั้ง เพื่ออนุญาตให้สคริปต์ส่งคำขอไปเช็กกับ LINE ได้
function authorizeLineCheck() {
  var res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', { method: 'post', payload: { id_token: 'test', client_id: LINE_CHANNEL_ID }, muteHttpExceptions: true });
  Logger.log('เชื่อมต่อ LINE ได้แล้ว (HTTP ' + res.getResponseCode() + ')');
}

// คอลัมน์ที่ห้ามส่งออกไปหน้าเว็บ และห้ามแก้ผ่าน insert/update ทั่วไป
var PROTECTED_MEMBER_COLUMNS = ['line_uid'];

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // CORS Headers
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    if (e.requestMode === 'OPTIONS') {
      return createJsonResponse({status: 'success', message: 'CORS OK'}, headers);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- GET Request: action=getAll ---
    if (e.parameter.action === 'getAll') {
      var db = {
        members: getSheetDataAsObjects(ss, 'Members', PROTECTED_MEMBER_COLUMNS),
        lessons: getSheetDataAsObjects(ss, 'Lessons'),
        careLogs: getSheetDataAsObjects(ss, 'Care_Logs'),
        hbdWishes: getSheetDataAsObjects(ss, 'HBD_Wishes')
      };
      return createJsonResponse({status: 'success', data: db}, headers);
    }

    // --- POST Request: LINE login / bind, insert or update ---
    if (e.postData && e.postData.contents) {
      var payload = JSON.parse(e.postData.contents);
      var action = payload.action;

      // LINE: หาสมาชิกที่ผูกกับบัญชี LINE นี้แล้ว
      if (action === 'lineLogin') {
        var lineUid = verifyLineIdToken(payload.idToken);
        var member = findMemberByLineUid(ss, lineUid);
        if (member) {
          return createJsonResponse({status: 'success', member: member}, headers);
        }
        return createJsonResponse({status: 'notBound'}, headers);
      }

      // LINE: ผูกบัญชี LINE เข้ากับแถวสมาชิกที่เลือก (ครั้งแรกเท่านั้น)
      if (action === 'bindLine') {
        var bindUid = verifyLineIdToken(payload.idToken);
        return createJsonResponse(bindLineToMember(ss, bindUid, payload.memberId), headers);
      }

      var sheetName = payload.sheetName;
      var dataObj = payload.data;
      var keyColumn = payload.keyColumn || 'id'; // e.g., 'id' or 'log_id'

      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return createJsonResponse({status: 'error', message: 'Sheet not found: ' + sheetName}, headers);
      }

      var headersRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var protectedCols = sheetName === 'Members' ? PROTECTED_MEMBER_COLUMNS : [];
      if (protectedCols.indexOf(keyColumn) !== -1) {
        return createJsonResponse({status: 'error', message: 'Key column not allowed: ' + keyColumn}, headers);
      }

      // INSERT
      if (action === 'insert') {
        var newRow = headersRow.map(function(colName) {
          if (protectedCols.indexOf(colName) !== -1) return '';
          return dataObj.hasOwnProperty(colName) ? dataObj[colName] : '';
        });
        sheet.appendRow(newRow);
        return createJsonResponse({status: 'success', message: 'Inserted into ' + sheetName}, headers);
      }

      // UPDATE
      if (action === 'update') {
        var keyIndex = headersRow.indexOf(keyColumn);
        if (keyIndex === -1) {
          return createJsonResponse({status: 'error', message: 'Key column not found: ' + keyColumn}, headers);
        }

        var dataRange = sheet.getDataRange();
        var allValues = dataRange.getValues();
        var keyValueToFind = String(dataObj[keyColumn]).trim();
        var rowIndexToUpdate = -1;

        for (var i = 1; i < allValues.length; i++) {
          if (String(allValues[i][keyIndex]).trim() === keyValueToFind) {
            rowIndexToUpdate = i + 1; // 1-based index
            break;
          }
        }

        if (rowIndexToUpdate !== -1) {
          var updatedRow = headersRow.map(function(colName, colIdx) {
            var existing = allValues[rowIndexToUpdate - 1][colIdx];
            if (protectedCols.indexOf(colName) !== -1) return existing;
            return dataObj.hasOwnProperty(colName) ? dataObj[colName] : existing;
          });
          sheet.getRange(rowIndexToUpdate, 1, 1, headersRow.length).setValues([updatedRow]);
          return createJsonResponse({status: 'success', message: 'Updated in ' + sheetName}, headers);
        } else {
          return createJsonResponse({status: 'error', message: 'Record not found for update'}, headers);
        }
      }
    }

    return createJsonResponse({status: 'error', message: 'Invalid request'}, headers);

  } catch (error) {
    return createJsonResponse({status: 'error', message: error.toString()}, headers);
  }
}

// Helper: ตรวจ LIFF ID token กับเซิร์ฟเวอร์ LINE แล้วคืน userId (sub) ที่เชื่อถือได้
function verifyLineIdToken(idToken) {
  if (!idToken) throw new Error('Missing LINE ID token');
  var res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: LINE_CHANNEL_ID },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('LINE token ไม่ถูกต้องหรือหมดอายุ กรุณาเปิดแอปจาก LINE ใหม่อีกครั้ง');
  }
  var body = JSON.parse(res.getContentText());
  if (!body.sub) throw new Error('LINE token has no user id');
  return String(body.sub);
}

// Helper: หาแถวสมาชิกที่ line_uid ตรงกัน (ไม่ส่ง line_uid กลับไป)
function findMemberByLineUid(ss, lineUid) {
  var sheet = ss.getSheetByName('Members');
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return String(h).trim(); });
  var uidIndex = headers.indexOf('line_uid');
  if (uidIndex === -1) throw new Error('Key column not found: line_uid');

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][uidIndex]).trim() === lineUid) {
      return rowToObject(ss, headers, values[i], PROTECTED_MEMBER_COLUMNS);
    }
  }
  return null;
}

// Helper: เขียน line_uid ลงแถวของ memberId (ห้ามทับบัญชี LINE อื่น / ห้าม 1 LINE ผูกหลายคน)
function bindLineToMember(ss, lineUid, memberId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = ss.getSheetByName('Members');
    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function(h) { return String(h).trim(); });
    var idIndex = headers.indexOf('id');
    var uidIndex = headers.indexOf('line_uid');
    if (idIndex === -1 || uidIndex === -1) {
      return {status: 'error', message: 'Members sheet needs id and line_uid columns'};
    }

    var targetId = String(memberId || '').trim();
    var targetRow = -1;
    for (var i = 1; i < values.length; i++) {
      var rowId = String(values[i][idIndex]).trim();
      var rowUid = String(values[i][uidIndex]).trim();
      if (rowUid === lineUid && rowId !== targetId) {
        return {status: 'error', message: 'บัญชี LINE นี้ผูกกับสมาชิกคนอื่นไว้แล้ว กรุณาติดต่อผู้นำหน่วย'};
      }
      if (rowId === targetId) targetRow = i;
    }

    if (targetRow === -1) {
      return {status: 'error', message: 'ไม่พบสมาชิกรหัส ' + targetId};
    }
    var existingUid = String(values[targetRow][uidIndex]).trim();
    if (existingUid && existingUid !== lineUid) {
      return {status: 'error', message: 'ชื่อนี้ผูกกับบัญชี LINE อื่นไว้แล้ว กรุณาติดต่อผู้นำหน่วย'};
    }

    sheet.getRange(targetRow + 1, uidIndex + 1).setValue(lineUid);
    var member = rowToObject(ss, headers, values[targetRow], PROTECTED_MEMBER_COLUMNS);
    return {status: 'success', message: 'ผูกบัญชี LINE เรียบร้อย', member: member};
  } finally {
    lock.releaseLock();
  }
}

// Helper: Convert sheet data to JSON objects
function getSheetDataAsObjects(ss, sheetName, excludeColumns) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return []; // Only headers or empty

  var headers = values[0].map(function(h) { return String(h).trim(); });
  var results = [];

  for (var i = 1; i < values.length; i++) {
    results.push(rowToObject(ss, headers, values[i], excludeColumns));
  }
  return results;
}

// Helper: Convert one row to an object, skipping excluded columns
function rowToObject(ss, headers, row, excludeColumns) {
  var exclude = excludeColumns || [];
  var obj = {};
  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    if (header !== "" && exclude.indexOf(header) === -1) {
      // Format dates correctly to YYYY-MM-DD to match React input type="date"
      var cellValue = row[j];
      if (cellValue instanceof Date) {
        var tz = ss.getSpreadsheetTimeZone();
        cellValue = Utilities.formatDate(cellValue, tz, "yyyy-MM-dd");
      }
      obj[header] = cellValue;
    }
  }
  return obj;
}

// Helper: Create JSON response
function createJsonResponse(data, headers) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
