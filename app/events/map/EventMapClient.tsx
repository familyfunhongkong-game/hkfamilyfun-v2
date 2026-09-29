"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

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
  coverImage?: string | null;
  isFree?: boolean;
  isSenFriendly?: boolean;
  mapUrl?: string | null;
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
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
      padding: [48, 48],
      maxZoom: 14,
    });
  }, [events, fitRequest, map, userLocation]);

  return null;
}

function ViewportReporter({
  onBoundsChange,
}: {
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend: reportBounds,
  });

  function reportBounds() {
    if (!onBoundsChange) return;
    const bounds = map.getBounds();

    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }

  useEffect(() => {
    reportBounds();
    // Initial viewport snapshot only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function FocusSelected({ event }: { event: MapEvent | null }) {
  const map = useMap();

  useEffect(() => {
    if (!event) return;

    map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.6,
    });
  }, [event, map]);

  return null;
}

export default function EventMapClient({
  events,
  userLocation,
  selectedEventId,
  onSelectEvent,
  onBoundsChange,
  fitRequest = 0,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
  selectedEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  fitRequest?: number;
}) {
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) || null;

  return (
    <MapContainer
      center={[22.3193, 114.1694]}
      zoom={11}
      scrollWheelZoom
      zoomControl
      className="h-full min-h-[520px] w-full lg:min-h-[calc(100vh-76px)]"
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
      <ViewportReporter onBoundsChange={onBoundsChange} />

      {userLocation ? (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={10}
          pathOptions={{
            color: "#1d4ed8",
            fillColor: "#3b82f6",
            fillOpacity: 0.95,
            weight: 4,
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
          <CircleMarker
            key={event.id}
            center={[event.latitude, event.longitude]}
            radius={selected ? 13 : 9}
            eventHandlers={{
              click: () => onSelectEvent?.(event.id),
            }}
            pathOptions={{
              color: selected ? "#6d28d9" : "#0f766e",
              fillColor: selected ? "#8b5cf6" : "#14b8a6",
              fillOpacity: 0.95,
              weight: selected ? 4 : 2,
            }}
          >
            <Popup minWidth={245} maxWidth={310}>
              <div className="max-w-[290px]">
                {event.coverImage ? (
                  <img
                    src={event.coverImage}
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
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
