"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
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
  imageUrl?: string | null;
  mapUrl?: string | null;
  isFree?: boolean;
  isSenFriendly?: boolean;
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
  enabled,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
  fitRequest: number;
  enabled: boolean;
}) {
  const map = useMap();
  const eventsRef = useRef(events);
  const userLocationRef = useRef(userLocation);

  useEffect(() => {
    eventsRef.current = events;
    userLocationRef.current = userLocation;
  }, [events, userLocation]);

  useEffect(() => {
    if (!enabled) return;

    const points: [number, number][] = eventsRef.current
      .filter(
        (event) =>
          Number.isFinite(event.latitude) &&
          Number.isFinite(event.longitude),
      )
      .map((event) => [event.latitude, event.longitude]);

    if (userLocationRef.current) {
      points.push([
        userLocationRef.current.latitude,
        userLocationRef.current.longitude,
      ]);
    }

    if (points.length === 0) {
      // Keep the current viewport when filters or "search this area" return no results.
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
  }, [enabled, fitRequest, map]);

  return null;
}

function FocusSelected({ event }: { event: MapEvent | null }) {
  const map = useMap();

  useEffect(() => {
    if (!event) return;

    map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.65,
    });
  }, [event, map]);

  return null;
}

function ViewportReporter({
  onBoundsChange,
}: {
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend: reportBounds,
    zoomend: reportBounds,
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
    // Initial snapshot only; subsequent updates come from map move/zoom events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function EventMapClient({
  events,
  userLocation,
  selectedEventId,
  onSelectEvent,
  fitRequest,
  onBoundsChange,
  fitEnabled = true,
}: {
  events: MapEvent[];
  userLocation: UserLocation;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  fitRequest: number;
  onBoundsChange?: (bounds: MapBounds) => void;
  fitEnabled?: boolean;
}) {
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) || null;

  const markerGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        latitude: number;
        longitude: number;
        events: MapEvent[];
      }
    >();

    for (const event of events) {
      const key = `${event.latitude.toFixed(6)}|${event.longitude.toFixed(6)}`;
      const existing = groups.get(key);

      if (existing) {
        existing.events.push(event);
      } else {
        groups.set(key, {
          key,
          latitude: event.latitude,
          longitude: event.longitude,
          events: [event],
        });
      }
    }

    return Array.from(groups.values());
  }, [events]);

  return (
    <MapContainer
      center={[22.3193, 114.1694]}
      zoom={11}
      scrollWheelZoom
      zoomControl
      className="h-full min-h-[52vh] w-full lg:min-h-[calc(100vh-10rem)]"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitMap
        events={events}
        userLocation={userLocation}
        fitRequest={fitRequest}
        enabled={fitEnabled}
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
              <div className="mt-1 text-xs text-slate-600">
                只用於今次瀏覽器附近活動排序，不會儲存。
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ) : null}

      {markerGroups.map((group) => {
        const selected = group.events.some(
          (event) => event.id === selectedEventId,
        );
        const multiple = group.events.length > 1;
        const first = group.events[0];

        return (
          <CircleMarker
            key={group.key}
            center={[group.latitude, group.longitude]}
            radius={selected ? 14 : multiple ? 12 : 9}
            eventHandlers={{
              click: () => {
                if (!multiple) onSelectEvent(first.id);
              },
            }}
            pathOptions={{
              color: selected ? "#6d28d9" : multiple ? "#1d4ed8" : "#0f766e",
              fillColor: selected
                ? "#8b5cf6"
                : multiple
                  ? "#3b82f6"
                  : "#14b8a6",
              fillOpacity: 0.95,
              weight: selected ? 4 : multiple ? 3 : 2,
            }}
          >
            {multiple ? (
              <Tooltip
                permanent
                direction="center"
                offset={[0, 0]}
                opacity={1}
                className="hkff-marker-count"
              >
                <span className="text-[11px] font-black text-blue-800">
                  {group.events.length}
                </span>
              </Tooltip>
            ) : null}

            <Popup minWidth={multiple ? 300 : 230} maxWidth={340}>
              {multiple ? (
                <div className="max-h-[360px] min-w-[280px] overflow-y-auto">
                  <div className="mb-2 border-b border-slate-200 pb-2">
                    <strong className="text-sm">
                      {group.events.length} 個活動｜同一地點
                    </strong>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {first.venue}
                      {first.district ? ` · ${first.district}` : ""}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.events.map((event) => (
                      <div
                        key={event.id}
                        className={
                          event.id === selectedEventId
                            ? "rounded-xl border border-purple-300 bg-purple-50 p-3"
                            : "rounded-xl border border-slate-200 bg-white p-3"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => onSelectEvent(event.id)}
                          className="block w-full text-left"
                        >
                          <span className="block text-xs font-black leading-5 text-slate-900">
                            {event.title}
                          </span>
                          <span className="mt-1 block text-[11px] font-semibold text-slate-600">
                            {event.date} · {event.time}
                          </span>
                          {typeof event.distanceKm === "number" ? (
                            <span className="mt-1 block text-[11px] font-bold text-blue-700">
                              約 {event.distanceKm.toFixed(1)} km
                            </span>
                          ) : null}
                        </button>

                        <div className="mt-2 flex gap-2">
                          <a
                            href={`/events/${event.id}`}
                            className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-[11px] font-bold text-white"
                          >
                            活動詳情
                          </a>
                          {event.mapUrl ? (
                            <a
                              href={event.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                            >
                              路線
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="min-w-[230px] max-w-[290px]">
                  {first.imageUrl ? (
                    <img
                      src={first.imageUrl}
                      alt=""
                      className="mb-3 h-28 w-full rounded-xl object-cover"
                    />
                  ) : null}

                  <strong className="text-sm leading-5">{first.title}</strong>

                  <div className="mt-2 text-xs leading-5 text-slate-600">
                    {first.venue}
                    {first.district ? ` · ${first.district}` : ""}
                  </div>

                  {first.mtrStation ? (
                    <div className="mt-1 text-xs text-slate-500">
                      港鐵 {first.mtrStation}
                    </div>
                  ) : null}

                  <div className="mt-1 text-xs font-semibold text-slate-700">
                    {first.date} · {first.time}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {first.isFree ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                        免費
                      </span>
                    ) : null}
                    {first.isSenFriendly ? (
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700">
                        SEN友善
                      </span>
                    ) : null}
                    {typeof first.distanceKm === "number" ? (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                        約 {first.distanceKm.toFixed(1)} km
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/events/${first.id}`}
                      className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      活動詳情
                    </a>
                    {first.mapUrl ? (
                      <a
                        href={first.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        路線
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
