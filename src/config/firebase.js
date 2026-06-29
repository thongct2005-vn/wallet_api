const admin = require('firebase-admin');
const path = require('path');

try {
    const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('Failed to initialize Firebase Admin SDK. Please check if serviceAccountKey.json exists and is valid.', error);
}

module.exports = admin;
