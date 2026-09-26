"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

export type NearbyMapPoint = {
  id: string;
  title: string;
  venue: string;
  district: string;
  date: string;
  time: string;
  lat: number;
  lng: number;
  href: string;
};

type Props = {
  points: NearbyMapPoint[];
  userLocation?: { lat: number; lng: number } | null;
};

function FitMap({
  points,
  userLocation,
}: Props) {
  const map = useMap();

  useEffect(() => {
    const coords: LatLngExpression[] = points.map((point) => [
      point.lat,
      point.lng,
    ]);

    if (userLocation) {
      coords.push([userLocation.lat, userLocation.lng]);
    }

    if (!coords.length) return;

    if (coords.length === 1) {
      map.setView(coords[0], 14);
      return;
    }

    map.fitBounds(coords as [number, number][], {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [map, points, userLocation]);

  return null;
}

export default function NearbyInteractiveMap({
  points,
  userLocation,
}: Props) {
  return (
    <MapContainer
      center={[22.3193, 114.1694]}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitMap points={points} userLocation={userLocation} />

      {userLocation ? (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={9}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9 }}
        >
          <Popup>
            <strong>你的位置</strong>
          </Popup>
        </CircleMarker>
      ) : null}

      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.9 }}
        >
          <Popup>
            <div style={{ minWidth: 210 }}>
              <strong>{point.title}</strong>
              <div style={{ marginTop: 6 }}>{point.venue}</div>
              <div>{point.district}</div>
              <div style={{ marginTop: 6 }}>
                {point.date} · {point.time}
              </div>
              <a
                href={point.href}
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  fontWeight: 700,
                  color: "#6d28d9",
                }}
              >
                查看活動詳情
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
