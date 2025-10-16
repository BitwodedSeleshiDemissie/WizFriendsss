import admin from "./firebaseAdmin";

const isTimestamp = (value: unknown): value is admin.firestore.Timestamp =>
  Boolean(value) && typeof value === "object" && value instanceof admin.firestore.Timestamp;

const isGeoPoint = (value: unknown): value is admin.firestore.GeoPoint =>
  Boolean(value) && typeof value === "object" && value instanceof admin.firestore.GeoPoint;

export const timestampToIso = (value: admin.firestore.Timestamp | Date | string | null | undefined) => {
  if (!value) {
    return null;
  }
  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
};

export const geoPointToObject = (value: admin.firestore.GeoPoint | null | undefined) => {
  if (!value) {
    return null;
  }
  if (isGeoPoint(value)) {
    return { lat: value.latitude, lng: value.longitude };
  }
  return null;
};

export const serializeFirestoreDoc = <T extends admin.firestore.DocumentData>(
  doc: admin.firestore.DocumentSnapshot<T>
) => {
  const data = doc.data();
  if (!data) {
    return null;
  }
  const result: Record<string, unknown> = { id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    if (isTimestamp(value)) {
      result[key] = timestampToIso(value);
    } else if (isGeoPoint(value)) {
      result[key] = geoPointToObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (isTimestamp(item)) {
          return timestampToIso(item);
        }
        if (isGeoPoint(item)) {
          return geoPointToObject(item);
        }
        return item;
      });
    } else if (value && typeof value === "object") {
      const nested: Record<string, unknown> = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (isTimestamp(nestedValue)) {
          nested[nestedKey] = timestampToIso(nestedValue);
        } else if (isGeoPoint(nestedValue)) {
          nested[nestedKey] = geoPointToObject(nestedValue);
        } else {
          nested[nestedKey] = nestedValue;
        }
      }
      result[key] = nested;
    } else {
      result[key] = value;
    }
  }
  return result;
};
