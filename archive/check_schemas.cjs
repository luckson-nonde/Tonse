const fs = require('fs');
const content = fs.readFileSync('src/services/labourProfileSchemas.ts', 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("type: 'select'")) {
    let hasOptions = false;
    for (let j = i - 2; j <= i + 5; j++) {
      if (lines[j] && lines[j].includes('options:')) {
        hasOptions = true;
        break;
      }
    }
    if (!hasOptions) {
      console.log('Missing options near line', i);
      console.log(lines.slice(i - 2, i + 3).join('\n'));
    }
  }
}
