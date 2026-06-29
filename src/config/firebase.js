const admin = require('firebase-admin');
const path = require('path');

require('dotenv').config();

try {
    let credential;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
    } else {
        const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));
        credential = admin.credential.cert(serviceAccount);
    }
    
    admin.initializeApp({
        credential: credential
    });
    
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('Failed to initialize Firebase Admin SDK. Please check environment variables or serviceAccountKey.json.', error);
}

module.exports = admin;
