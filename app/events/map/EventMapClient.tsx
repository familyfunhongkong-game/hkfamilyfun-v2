"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  divIcon,
  type LatLngBoundsExpression,
  type Marker as LeafletMarker,
} from "leaflet";

export type MapEvent = {
  id: string;
  title: string;
  venue: string;
  district: string;
  mtrStation?: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
  imageUrl?: string | null;
  mapUrl?: string | null;
  isFree?: boolean;
  isSenFriendly?: boolean;
};

type UserLocation = {
  latitude: number;
  longitude: number;
} | null;

function FitMap({
  events,
  userLocation,
  fitRequest,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
  fitRequest: number;
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

    if (points.length === 0) {
      map.setView([22.3193, 114.1694], 11);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    map.fitBounds(points as LatLngBoundsExpression, {
      paddingTopLeft: [48, 72],
      paddingBottomRight: [48, 72],
      maxZoom: 14,
    });
  }, [events, fitRequest, map, userLocation]);

  return null;
}

function FocusSelected({
  event,
}: {
  event: MapEvent | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!event) return;

    map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.55,
    });
  }, [event, map]);

  return null;
}

function eventIcon(selected: boolean) {
  const background = selected ? "#7c3aed" : "#0f766e";
  const ring = selected ? "#ede9fe" : "#ccfbf1";
  const size = selected ? 38 : 32;

  return divIcon({
    className: "hkff-map-marker",
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px 9999px 9999px 4px;
        transform:rotate(-45deg);
        background:${background};
        border:3px solid white;
        box-shadow:0 4px 14px rgba(15,23,42,.28), 0 0 0 4px ${ring};
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <span style="
          width:9px;
          height:9px;
          border-radius:9999px;
          background:white;
          display:block;
        "></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

export default function EventMapClient({
  events,
  userLocation,
  selectedEventId,
  onSelectEvent,
  fitRequest,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  fitRequest: number;
}) {
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEventId) return;
    const marker = markerRefs.current[selectedEventId];

    const timer = window.setTimeout(() => {
      marker?.openPopup();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selectedEventId]);

  return (
    <MapContainer
      center={[22.3193, 114.1694]}
      zoom={11}
      scrollWheelZoom
      zoomControl
      className="h-full min-h-[52vh] w-full lg:min-h-[calc(100vh-10rem)]"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitMap
        events={events}
        userLocation={userLocation}
        fitRequest={fitRequest}
      />
      <FocusSelected event={selectedEvent} />

      {userLocation ? (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={10}
          pathOptions={{
            color: "#1d4ed8",
            fillColor: "#3b82f6",
            fillOpacity: 0.95,
            weight: 3,
          }}
        >
          <Popup>
            <div className="min-w-[170px]">
              <strong>你的位置</strong>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                只用於今次瀏覽器距離計算，不會儲存。
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ) : null}

      {events.map((event) => {
        const selected = event.id === selectedEventId;

        return (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={eventIcon(selected)}
            ref={(marker) => {
              markerRefs.current[event.id] = marker;
            }}
            eventHandlers={{
              click: () => onSelectEvent(event.id),
            }}
            zIndexOffset={selected ? 1000 : 0}
          >
            <Popup
              minWidth={250}
              maxWidth={310}
              eventHandlers={{
                add: () => onSelectEvent(event.id),
              }}
            >
              <div className="overflow-hidden">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt=""
                    className="mb-3 h-28 w-full rounded-xl object-cover"
                  />
                ) : null}

                <div className="flex flex-wrap gap-1.5">
                  {event.isFree ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      免費
                    </span>
                  ) : null}
                  {event.isSenFriendly ? (
                    <span className="rounded-full bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700">
                      SEN友善
                    </span>
                  ) : null}
                  {typeof event.distanceKm === "number" ? (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                      {event.distanceKm.toFixed(1)} km
                    </span>
                  ) : null}
                </div>

                <strong className="mt-2 block text-sm leading-5 text-slate-950">
                  {event.title}
                </strong>

                <div className="mt-2 text-xs leading-5 text-slate-600">
                  {event.venue}
                  {event.district ? ` · ${event.district}` : ""}
                  {event.mtrStation ? ` · 港鐵 ${event.mtrStation}` : ""}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-700">
                  {event.date} · {event.time}
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={`/events/${event.id}`}
                    className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    活動詳情
                  </a>
                  {event.mapUrl ? (
                    <a
                      href={event.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      路線
                    </a>
                  ) : null}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
