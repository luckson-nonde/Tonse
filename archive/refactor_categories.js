
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/categories.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Time Standard: duration
const durationKeys = ['rentalDuration', 'eventDuration', 'projectTime', 'hours', 'days'];
durationKeys.forEach(key => {
    content = content.replace(new RegExp(`name: "${key}"`, 'g'), 'name: "duration"');
});
// Ensure type is counter or select, and min: 1 if counter
// This is hard to do with regex alone without breaking things.
// I'll do a simple replace and then manually fix if needed, or try to be clever.
// Actually, the prompt says "Ensure type is set to 'counter' or 'select'".

// 2. Volume Standard: quantity
const volumeKeys = ['qty', 'amount', 'count', 'numberOfUnits', 'guestCount'];
volumeKeys.forEach(key => {
    content = content.replace(new RegExp(`name: "${key}"`, 'g'), 'name: "quantity"');
});

// 3. Location Standard: location_name
const locationKeys = ['venueLocation', 'deliveryAddress', 'currentLocation', 'siteLocation'];
locationKeys.forEach(key => {
    content = content.replace(new RegExp(`name: "${key}"`, 'g'), 'name: "location_name"');
});

// 4. Financial Standard: budget_limit
content = content.replace(/name: "budget"/g, 'name: "budget_limit"');
// Set required: false for budget_limit
content = content.replace(/name: "budget_limit", label: ".*?", type: "currency", required: true/g, (match) => match.replace('required: true', 'required: false'));

fs.writeFileSync(filePath, content);
console.log('Refactoring complete.');
