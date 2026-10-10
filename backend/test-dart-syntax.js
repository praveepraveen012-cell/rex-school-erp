const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const stack = [];
  let inSingle = false, inDouble = false, inBlockComment = false, inLineComment = false;
  let line = 1, col = 1;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i+1];
    if (c === '\n') { line++; col = 1; } else { col++; }

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inSingle) {
      if (c === '\\') { i++; continue; }
      if (c === '\'') inSingle = false;
      continue;
    }
    if (inDouble) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inDouble = false;
      continue;
    }
    if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (c === '\'') { inSingle = true; continue; }
    if (c === '"') { inDouble = true; continue; }
    if (c === '(' || c === '[' || c === '{') stack.push({c, line, col});
    if (c === ')' || c === ']' || c === '}') {
      const last = stack.pop();
      if (!last) {
        console.error(`${filePath}:${line}:${col}: Extra closing ${c}`);
        return false;
      }
      const match = (last.c === '(' && c === ')') || (last.c === '[' && c === ']') || (last.c === '{' && c === '}');
      if (!match) {
        console.error(`${filePath}:${line}:${col}: Mismatched ${last.c} and ${c}`);
        return false;
      }
    }
  }
  if (stack.length > 0) {
    console.error(`${filePath}: Unclosed brackets (${stack.length}):`, stack.slice(-3));
    return false;
  }
  return true;
}

function scan(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (f.endsWith('.dart')) {
      if (!checkFile(full)) {
        process.exit(1);
      }
    }
  }
}

scan('lib');
console.log('All Dart files in lib/ are syntactically balanced!');
process.exit(0);
