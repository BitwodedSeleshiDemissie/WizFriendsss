"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 14;

const DEFAULT_MARKER_STYLE = {
  radius: 8,
  color: "#6366f1",
  fillColor: "#c026d3",
  fillOpacity: 0.7,
  weight: 2,
};

const SELECTED_MARKER_STYLE = {
  radius: 12,
  color: "#312e81",
  fillColor: "#1d4ed8",
  fillOpacity: 0.9,
  weight: 3,
};

const USER_LOCATION_ICON = L.divIcon({
  className: "activity-map__user-marker leaflet-div-icon",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const USER_ACCURACY_STYLE = {
  color: "#60a5fa",
  fillColor: "#bfdbfe",
  fillOpacity: 0.18,
  weight: 0,
  className: "activity-map__user-accuracy",
};

const MIN_USER_ACCURACY_RADIUS = 80;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ActivityMap({ activities, selectedActivityId, onSelect, fallbackCenter, onLocate }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userLocationMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);
  const suppressNextMapClickRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onLocateRef = useRef(onLocate);
  const initialCenterRef = useRef(fallbackCenter);
  const [locating, setLocating] = useState(false);
  const isClient = typeof window !== "undefined";

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onLocateRef.current = onLocate;
  }, [onLocate]);

  const validActivities = useMemo(
    () =>
      (activities ?? []).filter(
        (activity) =>
          typeof activity?.latitude === "number" &&
          !Number.isNaN(activity.latitude) &&
          typeof activity?.longitude === "number" &&
          !Number.isNaN(activity.longitude)
      ),
    [activities]
  );

  const selectedActivity = useMemo(
    () => validActivities.find((activity) => activity.id === selectedActivityId) ?? null,
    [validActivities, selectedActivityId]
  );

  useEffect(() => {
    if (!isClient) return;
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: initialCenterRef.current,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    map.on("click", () => {
      if (suppressNextMapClickRef.current) {
        suppressNextMapClickRef.current = false;
        return;
      }
      onSelectRef.current?.(null);
    });

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
      suppressNextMapClickRef.current = false;
    };
  }, [isClient]);

  const handleSelect = useCallback((activityId) => {
    onSelectRef.current?.(activityId);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    validActivities.forEach((activity) => {
      const isSelected = activity.id === selectedActivityId;
      const marker = L.circleMarker(
        [activity.latitude, activity.longitude],
        isSelected ? SELECTED_MARKER_STYLE : DEFAULT_MARKER_STYLE
      );

      const tooltipHtml = `<div class="activity-map__tooltip"><span class="activity-map__tooltip-title">${escapeHtml(
        activity.title ?? "Activity"
      )}</span><span class="activity-map__tooltip-meta">${escapeHtml(activity.location ?? "")}</span></div>`;

      marker.bindTooltip(tooltipHtml, {
        direction: "top",
        permanent: isSelected,
        opacity: 1,
        className: "activity-map__tooltip-wrapper",
      });

      marker.on("click", (event) => {
        if (event.originalEvent) {
          event.originalEvent.preventDefault();
          event.originalEvent.stopPropagation();
        }
        L.DomEvent.stop(event);
        suppressNextMapClickRef.current = true;
        handleSelect(activity.id);
        marker.openTooltip();
        setTimeout(() => {
          suppressNextMapClickRef.current = false;
        }, 0);
      });

      if (!isSelected) {
        marker.on("mouseover", () => marker.openTooltip());
        marker.on("mouseout", () => marker.closeTooltip());
      }

      marker.addTo(layer);

      if (isSelected) {
        marker.bringToFront();
        marker.openTooltip();
      }
    });
  }, [validActivities, selectedActivityId, handleSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedActivity) {
      map.flyTo([selectedActivity.latitude, selectedActivity.longitude], Math.max(map.getZoom(), SELECTED_ZOOM), {
        duration: 0.6,
      });
    } else if (fallbackCenter) {
      map.flyTo(fallbackCenter, DEFAULT_ZOOM, { duration: 0.5 });
    }
  }, [selectedActivity, fallbackCenter]);

  const canLocate = isClient && typeof navigator !== "undefined" && !!navigator.geolocation;

  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!canLocate || !map) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        const location = [latitude, longitude];
        map.flyTo(location, Math.max(map.getZoom(), 14), { duration: 0.6 });

        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng(location);
        } else {
          userLocationMarkerRef.current = L.marker(location, {
            icon: USER_LOCATION_ICON,
            interactive: false,
            keyboard: false,
          }).addTo(map);
        }

        const accuracy = Number(position.coords?.accuracy);
        if (Number.isFinite(accuracy) && accuracy > 0) {
          const radius = Math.max(accuracy, MIN_USER_ACCURACY_RADIUS);
          if (userAccuracyCircleRef.current) {
            userAccuracyCircleRef.current.setLatLng(location);
            userAccuracyCircleRef.current.setRadius(radius);
          } else {
            userAccuracyCircleRef.current = L.circle(location, {
              radius,
              ...USER_ACCURACY_STYLE,
              interactive: false,
            }).addTo(map);
          }
        } else if (userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current.remove();
          userAccuracyCircleRef.current = null;
        }

        if (
          userLocationMarkerRef.current &&
          typeof userLocationMarkerRef.current.setZIndexOffset === "function"
        ) {
          userLocationMarkerRef.current.setZIndexOffset(1000);
        }

        onLocateRef.current?.({ location, accuracy: Number.isFinite(accuracy) && accuracy > 0 ? Math.max(accuracy, MIN_USER_ACCURACY_RADIUS) : null });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [canLocate]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="activity-map__container">
      <div ref={containerRef} className="activity-map__canvas" />
      {canLocate ? (
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="activity-map__floating-button"
          aria-label="Use my location"
        >
          {locating ? "Locating..." : "My location"}
        </button>
      ) : null}
    </div>
  );
}

export default memo(ActivityMap);
