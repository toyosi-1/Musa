import { getFirebaseDatabase, getFirebaseStorage } from '@/lib/firebase';
import { ref, push, set, get, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Vendor, ServiceRequest, ServiceRequestStatus, VendorReview } from '@/types/user';
import { queuedWrite } from './requestQueue';

// Compress an image before upload
const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas ctx'));
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compress failed')), 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });

// Upload service request images to Firebase Storage
export async function uploadServiceRequestImages(
  estateId: string,
  requestId: string,
  files: File[]
): Promise<string[]> {
  const storage = await getFirebaseStorage();
  const urls: string[] = [];
  for (const file of files) {
    const compressed = await compressImage(file);
    const imgRef = storageRef(storage, `serviceRequests/${estateId}/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`);
    await uploadBytes(imgRef, compressed, { contentType: 'image/jpeg' });
    urls.push(await getDownloadURL(imgRef));
  }
  return urls;
}

export async function getVendors(estateId: string): Promise<Vendor[]> {
  const db = await getFirebaseDatabase();
  const snap = await get(ref(db, `vendors/${estateId}`));
  if (!snap.exists()) return [];
  return Object.values(snap.val()) as Vendor[];
}

export async function addVendor(estateId: string, data: Omit<Vendor, 'id'>): Promise<string> {
  const db = await getFirebaseDatabase();
  const newRef = push(ref(db, `vendors/${estateId}`));
  await queuedWrite(`addVendor-${newRef.key}`, () => set(newRef, { ...data, id: newRef.key }));
  return newRef.key!;
}

export async function updateVendor(estateId: string, vendorId: string, data: Partial<Vendor>): Promise<void> {
  const db = await getFirebaseDatabase();
  await queuedWrite(`updateVendor-${vendorId}`, () => update(ref(db, `vendors/${estateId}/${vendorId}`), data));
}

export async function deleteVendor(estateId: string, vendorId: string): Promise<void> {
  const db = await getFirebaseDatabase();
  await set(ref(db, `vendors/${estateId}/${vendorId}`), null);
}

export async function getServiceRequests(estateId: string): Promise<ServiceRequest[]> {
  const db = await getFirebaseDatabase();
  const snap = await get(ref(db, `serviceRequests/${estateId}`));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as ServiceRequest[]).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createServiceRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const db = await getFirebaseDatabase();
  const newRef = push(ref(db, `serviceRequests/${data.estateId}`));
  const now = Date.now();
  const payload = { ...data, id: newRef.key, status: 'pending', createdAt: now, updatedAt: now };
  await queuedWrite(`createRequest-${newRef.key}`, () => set(newRef, payload));
  return newRef.key!;
}

export async function assignVendor(estateId: string, requestId: string, vendor: Vendor, assignedBy: string): Promise<void> {
  const db = await getFirebaseDatabase();
  await queuedWrite(`assignVendor-${requestId}`, () => update(ref(db, `serviceRequests/${estateId}/${requestId}`), {
    vendorId: vendor.id, vendorName: vendor.name, vendorPhone: vendor.phone,
    status: 'assigned' as ServiceRequestStatus, assignedBy, assignedAt: Date.now(), updatedAt: Date.now(),
  }));
}

export async function getServiceRequestsForVendor(estateId: string, vendorId: string): Promise<ServiceRequest[]> {
  return (await getServiceRequests(estateId)).filter(r => r.vendorId === vendorId);
}

export async function updateRequestStatus(estateId: string, requestId: string, status: ServiceRequestStatus, extra?: Record<string, unknown>): Promise<void> {
  const db = await getFirebaseDatabase();
  await queuedWrite(`updateStatus-${requestId}-${status}`, () =>
    update(ref(db, `serviceRequests/${estateId}/${requestId}`), { status, updatedAt: Date.now(), ...(extra || {}) })
  );
}

// ─── Vendor Reviews & Ratings ───

export async function submitVendorReview(
  estateId: string,
  requestId: string,
  vendorId: string,
  residentId: string,
  residentName: string,
  rating: number,
  comment: string,
  serviceType: string,
): Promise<void> {
  const db = await getFirebaseDatabase();
  const now = Date.now();

  // Save the individual review
  const reviewRef = push(ref(db, `vendorReviews/${estateId}/${vendorId}`));
  const review: VendorReview = {
    id: reviewRef.key!,
    estateId, vendorId, requestId, residentId, residentName,
    rating, comment, serviceType: serviceType as VendorReview['serviceType'],
    createdAt: now,
  };
  await queuedWrite(`submitReview-${reviewRef.key}`, () => set(reviewRef, review));

  // Mark the request as reviewed
  await queuedWrite(`markReviewed-${requestId}`, () =>
    update(ref(db, `serviceRequests/${estateId}/${requestId}`), {
      rating, reviewComment: comment, reviewedAt: now, updatedAt: now,
    })
  );

  // Recalculate vendor average rating
  const reviewsSnap = await get(ref(db, `vendorReviews/${estateId}/${vendorId}`));
  if (reviewsSnap.exists()) {
    const allReviews = Object.values(reviewsSnap.val()) as VendorReview[];
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await queuedWrite(`updateVendorRating-${vendorId}`, () =>
      update(ref(db, `vendors/${estateId}/${vendorId}`), { rating: Math.round(avg * 10) / 10 })
    );
  }
}

export async function getVendorReviews(estateId: string, vendorId: string): Promise<VendorReview[]> {
  const db = await getFirebaseDatabase();
  const snap = await get(ref(db, `vendorReviews/${estateId}/${vendorId}`));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as VendorReview[]).sort((a, b) => b.createdAt - a.createdAt);
}
