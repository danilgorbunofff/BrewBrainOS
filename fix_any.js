const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

let fixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. catch (e: any) { return ... e.message ... }
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)\s*\{([\s\S]*?)\}/g, (match, errVar, body) => {
    let newBody = body.replace(new RegExp(`${errVar}\\.message`, 'g'), `${errVar} instanceof Error ? ${errVar}.message : String(${errVar})`);
    return `catch (${errVar}: unknown) {${newBody}}`;
  });

  // 2. (e: any) =>
  content = content.replace(/\([e|err|error]:\s*any\)/g, '(e: unknown)');

  // 3. Record<string, any> -> Record<string, unknown>
  content = content.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
  }
});

console.log(`Fixed ${fixed} files.`);
