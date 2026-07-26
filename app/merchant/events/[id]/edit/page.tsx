function CoverCropModal({
  imageUrl,
  cropDraft,
  setCropDraft,
  onClose,
  onApply,
  onReset,
}: {
  imageUrl: string;
  cropDraft: CropDraft;
  setCropDraft: (value: CropDraft | ((current: CropDraft) => CropDraft)) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const dragRef = useRef<{
    isDragging: boolean;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  }>({
    isDragging: false,
    startClientX: 0,
    startClientY: 0,
    startX: cropDraft.x,
    startY: cropDraft.y,
  });

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }

    const nextZoom = cropDraft.zoom <= 1.02 ? 1.22 : cropDraft.zoom;

    setCropDraft((current) => ({
      ...current,
      zoom: current.zoom <= 1.02 ? 1.22 : current.zoom,
    }));

    dragRef.current = {
      isDragging: true,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: cropDraft.x,
      startY: cropDraft.y,
    };

    if (nextZoom !== cropDraft.zoom) {
      dragRef.current.startX = cropDraft.x;
      dragRef.current.startY = cropDraft.y;
    }
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.isDragging) return;

    const deltaX = event.clientX - dragRef.current.startClientX;
    const deltaY = event.clientY - dragRef.current.startClientY;

    const sensitivity = 0.22;

    const nextX = clamp(
      dragRef.current.startX - deltaX * sensitivity,
      0,
      100
    );

    const nextY = clamp(
      dragRef.current.startY - deltaY * sensitivity,
      0,
      100
    );

    setCropDraft((current) => ({
      ...current,
      x: Math.round(nextX),
      y: Math.round(nextY),
      zoom: current.zoom <= 1.02 ? 1.22 : current.zoom,
    }));
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current.isDragging = false;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  function nudge(direction: "left" | "right" | "up" | "down") {
    setCropDraft((current) => {
      const step = 5;

      return {
        ...current,
        zoom: current.zoom <= 1.02 ? 1.22 : current.zoom,
        x:
          direction === "left"
            ? clamp(current.x - step, 0, 100)
            : direction === "right"
            ? clamp(current.x + step, 0, 100)
            : current.x,
        y:
          direction === "up"
            ? clamp(current.y - step, 0, 100)
            : direction === "down"
            ? clamp(current.y + step, 0, 100)
            : current.y,
      };
    });
  }

  function quickZoom(value: number) {
    setCropDraft((current) => ({
      ...current,
      zoom: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 py-4">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              調整封面位置
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              直接拖動圖片上下左右。第一次拖動會自動放大圖片，方便像 Facebook cover 一樣重新定位。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_320px]">
          <div className="min-h-0 bg-slate-100 p-4 md:p-6">
            <div
              role="button"
              tabIndex={0}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              className="relative mx-auto aspect-[16/9] h-auto max-h-[68vh] w-full cursor-grab touch-none overflow-hidden rounded-[1.5rem] border-4 border-white bg-slate-200 shadow-xl active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl || DEFAULT_COVER_IMAGE}
                alt="Crop preview"
                draggable={false}
                className="h-full w-full select-none object-cover"
                style={{
                  objectPosition: `${cropDraft.x}% ${cropDraft.y}%`,
                  transform: `scale(${cropDraft.zoom})`,
                  transformOrigin: `${cropDraft.x}% ${cropDraft.y}%`,
                }}
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/25" />

              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                <Move className="h-4 w-4" />
                直接拖動圖片重新定位
              </div>

              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-5 py-2 text-xs font-black text-white shadow-sm">
                Drag image to reposition cover
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/45" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/45" />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 md:hidden">
              <button
                type="button"
                onClick={() => nudge("left")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              >
                ← 左
              </button>
              <button
                type="button"
                onClick={() => nudge("right")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              >
                右 →
              </button>
              <button
                type="button"
                onClick={() => nudge("up")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              >
                ↑ 上
              </button>
              <button
                type="button"
                onClick={() => nudge("down")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              >
                下 ↓
              </button>
            </div>
          </div>

          <aside className="overflow-y-auto border-t border-slate-200 p-5 lg:border-l lg:border-t-0">
            <div className="text-sm font-black text-slate-950">
              Crop Controls
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
              建議先把 Zoom 調到 1.20x - 1.50x，圖片才有空間上下左右移動。
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickZoom(1)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  cropDraft.zoom === 1
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                1.00x
              </button>

              <button
                type="button"
                onClick={() => quickZoom(1.25)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  cropDraft.zoom === 1.25
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                1.25x
              </button>

              <button
                type="button"
                onClick={() => quickZoom(1.5)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  cropDraft.zoom === 1.5
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                1.50x
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => nudge("left")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                ← 向左
              </button>

              <button
                type="button"
                onClick={() => nudge("right")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                向右 →
              </button>

              <button
                type="button"
                onClick={() => nudge("up")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                ↑ 向上
              </button>

              <button
                type="button"
                onClick={() => nudge("down")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                向下 ↓
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <SliderField
                label="水平位置：左 / 右"
                value={cropDraft.x}
                onChange={(value) =>
                  setCropDraft((current) => ({
                    ...current,
                    x: value,
                    zoom: current.zoom <= 1.02 ? 1.22 : current.zoom,
                  }))
                }
              />

              <SliderField
                label="垂直位置：上 / 下"
                value={cropDraft.y}
                onChange={(value) =>
                  setCropDraft((current) => ({
                    ...current,
                    y: value,
                    zoom: current.zoom <= 1.02 ? 1.22 : current.zoom,
                  }))
                }
              />

              <div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                  <span>Zoom 放大 / 縮小</span>
                  <span>{cropDraft.zoom.toFixed(2)}x</span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-slate-400" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={cropDraft.zoom}
                    onChange={(event) =>
                      setCropDraft((current) => ({
                        ...current,
                        zoom: Number(event.target.value),
                      }))
                    }
                    className="w-full accent-primary-500"
                  />
                  <ZoomIn className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                <div className="font-black text-slate-800">目前設定</div>
                <div className="mt-1">X: {cropDraft.x}%</div>
                <div>Y: {cropDraft.y}%</div>
                <div>Zoom: {cropDraft.zoom.toFixed(2)}x</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={onApply}
                className="rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
              >
                儲存封面位置
              </button>

              <button
                type="button"
                onClick={onReset}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Reset 到中間
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
