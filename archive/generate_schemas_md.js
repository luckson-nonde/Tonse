import fs from 'fs';

const fileContent = fs.readFileSync('src/services/categories.ts', 'utf-8');

const schemaRegex = /(?:export )?const (\w+): FieldSchema\[\] = \[([\s\S]*?)\];/g;

let markdown = '# Dynamic Form Schemas\n\n';
markdown += 'This document contains a full breakdown of all the dynamic form schemas defined in the application.\n\n';

let match;
while ((match = schemaRegex.exec(fileContent)) !== null) {
  const schemaName = match[1];
  const schemaBody = match[2];
  
  markdown += `## ${schemaName}\n\n`;
  markdown += '```typescript\n';
  markdown += `const ${schemaName}: FieldSchema[] = [\n${schemaBody}\n];\n`;
  markdown += '```\n\n';
}

fs.writeFileSync('dynamic_form_schemas.md', markdown);
console.log('Markdown file generated successfully.');
