"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

export type MapEvent = {
  id: string;
  title: string;
  venue: string;
  district: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
};

type UserLocation = {
  latitude: number;
  longitude: number;
} | null;

function FitMap({
  events,
  userLocation,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = events
      .filter(
        (event) =>
          Number.isFinite(event.latitude) &&
          Number.isFinite(event.longitude),
      )
      .map((event) => [event.latitude, event.longitude]);

    if (userLocation) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    if (points.length > 1) {
      map.fitBounds(points as LatLngBoundsExpression, {
        padding: [36, 36],
        maxZoom: 14,
      });
    }
  }, [events, map, userLocation]);

  return null;
}

export default function EventMapClient({
  events,
  userLocation,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
}) {
  return (
    <MapContainer
      center={[22.3193, 114.1694]}
      zoom={11}
      scrollWheelZoom
      className="h-full min-h-[540px] w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitMap events={events} userLocation={userLocation} />

      {userLocation ? (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={10}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.95,
            weight: 3,
          }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <strong>你的位置</strong>
              <div className="mt-1 text-xs text-slate-600">
                只用於今次瀏覽器附近活動排序。
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ) : null}

      {events.map((event) => (
        <CircleMarker
          key={event.id}
          center={[event.latitude, event.longitude]}
          radius={9}
          pathOptions={{
            color: "#0f766e",
            fillColor: "#14b8a6",
            fillOpacity: 0.92,
            weight: 2,
          }}
        >
          <Popup>
            <div className="min-w-[220px] max-w-[280px]">
              <strong className="text-sm">{event.title}</strong>
              <div className="mt-2 text-xs leading-5 text-slate-600">
                {event.venue}
                {event.district ? ` · ${event.district}` : ""}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700">
                {event.date} · {event.time}
              </div>
              {typeof event.distanceKm === "number" ? (
                <div className="mt-1 text-xs font-bold text-blue-700">
                  約 {event.distanceKm.toFixed(1)} km
                </div>
              ) : null}
              <a
                href={`/events/${event.id}`}
                className="mt-3 inline-block rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
              >
                活動詳情
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
