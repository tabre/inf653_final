db = db.getSiblingDB('inf653_final');

db.createCollection('states');

try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('/docker-entrypoint-initdb.d/statesFacts.json', 'utf8'));
    db.states.insertMany(data);
} catch (err) {
    print('Error inserting data:', err);
}
