
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/categories.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Refactor budget -> budget_limit
content = content.replace(/name: "budget"/g, 'name: "budget_limit"');

// Refactor quantity
content = content.replace(/name: "qty"/g, 'name: "quantity"');
content = content.replace(/name: "amount"/g, 'name: "quantity"');
content = content.replace(/name: "count"/g, 'name: "quantity"');
content = content.replace(/name: "numberOfWindows"/g, 'name: "quantity"');
content = content.replace(/name: "numberOfDevices"/g, 'name: "quantity"');
content = content.replace(/name: "numberOfLines"/g, 'name: "quantity"');
content = content.replace(/name: "numberOfPoints"/g, 'name: "quantity"');

// Refactor duration
content = content.replace(/name: "rentalDuration"/g, 'name: "duration"');
content = content.replace(/name: "eventDuration"/g, 'name: "duration"');
content = content.replace(/name: "project_time"/g, 'name: "duration"');

// Refactor location_name
content = content.replace(/name: "venueLocation"/g, 'name: "location_name"');
content = content.replace(/name: "deliveryAddress"/g, 'name: "location_name"');
content = content.replace(/name: "currentLocation"/g, 'name: "location_name"');
content = content.replace(/name: "projectLocation"/g, 'name: "location_name"');

fs.writeFileSync(filePath, content);
console.log('Refactoring complete.');
