import admin from 'firebase-admin';

// Check if already initialized to prevent duplicate initialization error
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.warn('Firebase configuration missing. Push notifications will be skipped.');
  }
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  if (!token) return;
  if (!admin.apps.length) {
    console.warn('Firebase Admin SDK is not initialized. Cannot send notification.');
    return;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      token,
      data,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const storeNotificationInFirestore = async (notificationData: any) => {
  if (!admin.apps.length) {
    console.warn('Firebase Admin SDK is not initialized. Cannot store notification in Firestore.');
    return;
  }
  try {
    const db = admin.firestore();
    const docRef = await db.collection('notifications').add({
      ...notificationData,
      createdAt: new Date().toISOString(),
      read: false,
    });
    console.log('Notification stored in Firestore with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error storing notification in Firestore:', error);
  }
};
