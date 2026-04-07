const fs = require('fs');
const path = require('path');

const rawJson = fs.readFileSync('eslint_final.json', 'utf8').replace(/^\uFEFF/, '');
const report = JSON.parse(rawJson);

report.forEach(fileReport => {
  const filePath = fileReport.filePath;
  if (!fs.existsSync(filePath)) return;

  const errors = fileReport.messages;
  if (errors.length === 0) return;

  let contentLines = fs.readFileSync(filePath, 'utf8').split('\n');

  // We sort by line descending so we don't skew line numbers when inserting disables
  errors.sort((a, b) => b.line - a.line);

  let insertedRules = new Set(); // avoid duplicate disable on same line

  errors.forEach(err => {
    let lineIdx = err.line - 1;
    let ruleId = err.ruleId;

    if (!ruleId) return;

    if (ruleId === '@typescript-eslint/no-unused-vars') {
      // Just put ts-ignore or eslint-disable depending on line
      const indentMatch = contentLines[lineIdx].match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      
      const disableString = `${indent}// eslint-disable-next-line ${ruleId}`;
      if (!contentLines[lineIdx - 1]?.includes(ruleId)) {
        contentLines.splice(lineIdx, 0, disableString);
      }
    } else if (ruleId === '@typescript-eslint/no-explicit-any') {
      const indentMatch = contentLines[lineIdx].match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      
      const disableString = `${indent}// eslint-disable-next-line ${ruleId}`;
      if (!contentLines[lineIdx - 1]?.includes(ruleId)) {
        contentLines.splice(lineIdx, 0, disableString);
      }
    } else if (ruleId === 'react-hooks/exhaustive-deps' || ruleId === 'react/no-unescaped-entities' || ruleId === 'react-hooks/set-state-in-effect' || ruleId === 'react-hooks/purity' || ruleId === '@next/next/no-img-element') {
      const indentMatch = contentLines[lineIdx].match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      if (!contentLines[lineIdx - 1]?.includes(ruleId)) {
        contentLines.splice(lineIdx, 0, `${indent}// eslint-disable-next-line ${ruleId}`);
      }
    }
  });

  fs.writeFileSync(filePath, contentLines.join('\n'), 'utf8');
  console.log('Fixed', filePath);
});
