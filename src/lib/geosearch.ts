import * as geofire from "geofire-common";

export const geohashFor = (lat: number, lng: number) => geofire.geohashForLocation([lat, lng]);

export const geohashBounds = (lat: number, lng: number, radiusKm: number) =>
  geofire.geohashQueryBounds([lat, lng], radiusKm * 1000);

export const distanceKm = (a: [number, number], b: [number, number]) => geofire.distanceBetween(a, b);
