const fs = require('fs');
const content = fs.readFileSync('src/services/labourProfileSchemas.ts', 'utf8');

// Let's use a regex to find all object literals in the fields array
const fieldRegex = /\{\s*name:\s*['"]([^'"]+)['"]([^}]*)\}/g;
let match;
let issues = [];

while ((match = fieldRegex.exec(content)) !== null) {
  const name = match[1];
  const body = match[2];
  
  if (!body.includes('label:')) {
    issues.push(`Field ${name} is missing label`);
  }
  if (!body.includes('type:')) {
    issues.push(`Field ${name} is missing type`);
  }
  if (body.includes("type: 'select'") || body.includes("type: 'multiselect'")) {
    if (!body.includes('options:')) {
      issues.push(`Field ${name} is missing options`);
    }
  }
}

console.log('Issues found:', issues.length);
if (issues.length > 0) console.log(issues.join('\n'));
