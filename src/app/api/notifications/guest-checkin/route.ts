import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 check-ins per minute per IP.
    // Guards legitimately burst during shift changes; 20/min leaves plenty of
    // headroom while still capping runaway scripts.
    const rl = rateLimit({
      key: `guest-checkin:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rl.success) return rateLimitResponse(rl);

    const { accessCodeId, guardName } = await request.json();

    if (!accessCodeId) {
      return NextResponse.json(
        { error: 'Access code ID is required' },
        { status: 400 }
      );
    }

    const db = await getFirebaseDatabase();

    // Get the access code details
    const accessCodeRef = ref(db, `accessCodes/${accessCodeId}`);
    const accessCodeSnapshot = await get(accessCodeRef);

    if (!accessCodeSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Access code not found' },
        { status: 404 }
      );
    }

    const accessCode = accessCodeSnapshot.val();
    const { userId, description, householdId } = accessCode;

    // Get the resident's user data to find their FCM token
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Resident not found' },
        { status: 404 }
      );
    }

    const resident = userSnapshot.val();

    // Get household address for notification context
    let address = 'your residence';
    if (householdId) {
      const householdRef = ref(db, `households/${householdId}`);
      const householdSnapshot = await get(householdRef);
      if (householdSnapshot.exists()) {
        const household = householdSnapshot.val();
        address = household.address || address;
      }
    }

    // Prepare notification payload
    const guestName = description || 'Your guest';
    const notificationTitle = 'Guest Check-In';
    const notificationBody = `${guestName} has checked in at the gate and is on their way to ${address}`;

    // Check if user has FCM token (push notification enabled)
    if (resident.fcmToken) {
      // Send push notification via Firebase Cloud Messaging
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}`
          },
          body: JSON.stringify({
            to: resident.fcmToken,
            notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'guest-checkin',
              requireInteraction: false
            },
            data: {
              type: 'guest-checkin',
              accessCodeId,
              guestName,
              timestamp: Date.now()
            },
            priority: 'high'
          })
        });

        if (!response.ok) {
          console.error('FCM API error:', await response.text());
        }
      } catch (fcmError) {
        console.error('Error sending FCM notification:', fcmError);
        // Continue even if FCM fails - we'll still log the notification
      }
    }

    // Store notification in database for in-app display
    const { set } = await import('firebase/database');
    const timestamp = Date.now();
    const newNotificationRef = ref(db, `notifications/${userId}/${timestamp}`);
    
    const notificationData = {
      id: `${timestamp}`,
      type: 'guest-checkin',
      title: notificationTitle,
      message: notificationBody,
      timestamp,
      read: false,
      data: {
        accessCodeId,
        guestName,
        guardName: guardName || 'Security',
        address
      }
    };

    await set(newNotificationRef, notificationData);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      notificationSent: !!resident.fcmToken
    });

  } catch (error) {
    console.error('Error sending guest check-in notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
