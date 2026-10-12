import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Pen,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Grid,
} from "lucide-react";
import { DrawStroke, DrawTool, Point, CanvasBackground, ThemeMode } from "../types";

interface DrawingCanvasProps {
  strokes: DrawStroke[];
  onChangeStrokes: (strokes: DrawStroke[]) => void;
  canvasBg: CanvasBackground;
  onChangeCanvasBg: (bg: CanvasBackground) => void;
  theme: ThemeMode;
  isOverlay?: boolean;
  overlayInteractive?: boolean;
  noteTitle?: string;
  canvasRefExternal?: React.RefObject<HTMLCanvasElement | null>;
}

const PRESET_COLORS = [
  { name: "Ink Black", value: "#1E293B" },
  { name: "Trust Blue", value: "#2563EB" },
  { name: "Crimson Red", value: "#DC2626" },
  { name: "Neon Green", value: "#16A34A" },
  { name: "Amber Highlight", value: "#FDE047" },
  { name: "Electric Violet", value: "#7C3AED" },
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  onChangeStrokes,
  canvasBg,
  onChangeCanvasBg,
  theme,
  isOverlay = false,
  overlayInteractive = true,
  noteTitle = "notegrid-drawing",
  canvasRefExternal,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = canvasRefExternal || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<DrawTool>(DrawTool.PEN);
  const [color, setColor] = useState<string>("#2563EB");
  const [brushSize, setBrushSize] = useState<number>(3);
  const [redoStack, setRedoStack] = useState<DrawStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const selectTool = (tool: DrawTool) => {
    setActiveTool(tool);
    if (tool === DrawTool.MARKER) {
      setBrushSize(18);
      if (color === "#1E293B") setColor("#FDE047");
    } else if (tool === DrawTool.ERASER) {
      setBrushSize(20);
    } else if (brushSize > 12) {
      setBrushSize(3);
    }
  };

  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (isOverlay) return;

      const bgColors: Record<ThemeMode, string> = {
        [ThemeMode.LIGHT]: "#F9F9F8",
        [ThemeMode.DARK]: "#141414",
        [ThemeMode.CLASSIC]: "#FEF9C3",
      };
      ctx.fillStyle = bgColors[theme];
      ctx.fillRect(0, 0, width, height);

      const lineColors: Record<ThemeMode, string> = {
        [ThemeMode.LIGHT]: "rgba(15, 23, 42, 0.08)",
        [ThemeMode.DARK]: "rgba(255, 255, 255, 0.07)",
        [ThemeMode.CLASSIC]: "rgba(180, 83, 9, 0.14)",
      };

      ctx.strokeStyle = lineColors[theme];
      ctx.fillStyle = lineColors[theme];
      ctx.lineWidth = 1;

      if (canvasBg === CanvasBackground.DOTS) {
        const spacing = 24;
        for (let x = spacing; x < width; x += spacing) {
          for (let y = spacing; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (canvasBg === CanvasBackground.RULED) {
        const lineSpacing = 32;
        for (let y = 48; y < height; y += lineSpacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        // Margin line
        ctx.strokeStyle = theme === ThemeMode.DARK ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.35)";
        ctx.beginPath();
        ctx.moveTo(64, 0);
        ctx.lineTo(64, height);
        ctx.stroke();
      } else if (canvasBg === CanvasBackground.GRID) {
        const gridSize = 28;
        for (let x = gridSize; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = gridSize; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
    },
    [canvasBg, isOverlay, theme]
  );

  const renderSingleStroke = (ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;

    if (stroke.tool === DrawTool.ERASER) {
      if (isOverlay) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        const eraseColors: Record<ThemeMode, string> = {
          [ThemeMode.LIGHT]: "#F9F9F8",
          [ThemeMode.DARK]: "#141414",
          [ThemeMode.CLASSIC]: "#FEF9C3",
        };
        ctx.strokeStyle = eraseColors[theme];
      }
    } else if (stroke.tool === DrawTool.MARKER) {
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = stroke.color;
    } else {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke.color;
    }

    const start = pts[0];
    const end = pts[pts.length - 1];

    if (stroke.tool === DrawTool.LINE) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (stroke.tool === DrawTool.ARROW) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = Math.max(10, stroke.size * 3.5);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (stroke.tool === DrawTool.RECTANGLE) {
      ctx.beginPath();
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (stroke.tool === DrawTool.CIRCLE) {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = start.x + (end.x - start.x) / 2;
      const cy = start.y + (end.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Freehand Pen, Marker, Eraser with quadratic smoothing
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        ctx.lineTo(end.x, end.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height, 560);

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    drawBackground(ctx, width, height);

    for (const s of strokes) {
      renderSingleStroke(ctx, s);
    }
    if (currentStroke) {
      renderSingleStroke(ctx, currentStroke);
    }

    ctx.restore();
  }, [canvasRef, currentStroke, drawBackground, strokes, theme, isOverlay]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isOverlay && !overlayInteractive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getPointerCoords(e);
    setIsDrawing(true);
    setCurrentStroke({
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tool: activeTool,
      color,
      size: brushSize,
      points: [pt],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    const pt = getPointerCoords(e);

    if (
      currentStroke.tool === DrawTool.LINE ||
      currentStroke.tool === DrawTool.RECTANGLE ||
      currentStroke.tool === DrawTool.CIRCLE ||
      currentStroke.tool === DrawTool.ARROW
    ) {
      setCurrentStroke({
        ...currentStroke,
        points: [currentStroke.points[0], pt],
      });
    } else {
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, pt],
      });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    onChangeStrokes([...strokes, currentStroke]);
    setRedoStack([]);
    setCurrentStroke(null);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const popped = strokes[strokes.length - 1];
    setRedoStack((prev) => [popped, ...prev]);
    onChangeStrokes(strokes.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    setRedoStack(rest);
    onChangeStrokes([...strokes, next]);
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setRedoStack([]);
    onChangeStrokes([]);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${(noteTitle || "drawing").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.href = dataUrl;
    link.click();
  };

  const isDark = theme === ThemeMode.DARK;

  return (
    <div className={`flex flex-col ${isOverlay ? "h-full" : "h-full min-h-[600px]"}`}>
      {/* Pen & Drawing Context Toolbar */}
      {(!isOverlay || overlayInteractive) && (
        <div
          className={`no-print flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b text-xs ${
            isDark
              ? "bg-[#1A1A1A] border-[#2A2A2A] text-neutral-200"
              : theme === ThemeMode.CLASSIC
              ? "bg-[#FEF08A]/70 border-amber-300/80 text-slate-800"
              : "bg-[#F3F4F6] border-[#E5E7EB] text-neutral-700"
          }`}
        >
          {/* Tool Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: DrawTool.PEN, label: "Pen", icon: Pen },
              { id: DrawTool.MARKER, label: "Marker", icon: Highlighter },
              { id: DrawTool.ERASER, label: "Eraser", icon: Eraser },
              { id: DrawTool.LINE, label: "Line", icon: Minus },
              { id: DrawTool.ARROW, label: "Arrow", icon: ArrowUpRight },
              { id: DrawTool.RECTANGLE, label: "Box", icon: Square },
              { id: DrawTool.CIRCLE, label: "Circle", icon: CircleIcon },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTool(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : isDark
                      ? "hover:bg-neutral-800 text-neutral-300"
                      : "hover:bg-white/80 text-neutral-700"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Color Palette & Custom Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] opacity-75 whitespace-nowrap">Ink:</span>
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setColor(c.value);
                    if (activeTool === DrawTool.ERASER) setActiveTool(DrawTool.PEN);
                  }}
                  title={c.name}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    color.toLowerCase() === c.value.toLowerCase() && activeTool !== DrawTool.ERASER
                      ? "scale-115 ring-2 ring-blue-500 ring-offset-1"
                      : "hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: c.value,
                    border: "1px solid rgba(0,0,0,0.2)",
                  }}
                />
              ))}
              <label
                className="relative flex items-center cursor-pointer ml-1"
                title="Custom Color Picker"
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    if (activeTool === DrawTool.ERASER) setActiveTool(DrawTool.PEN);
                  }}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] opacity-75 whitespace-nowrap">Size:</span>
            <input
              type="range"
              min={1}
              max={32}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-blue-600 cursor-pointer"
            />
            <span className="font-mono text-[11px] tabular-nums w-7">{brushSize}px</span>
          </div>

          {/* Grid Pattern & History Controls */}
          <div className="flex items-center gap-1.5">
            {!isOverlay && (
              <div className="flex items-center gap-1 mr-1">
                <Grid className="w-3.5 h-3.5 opacity-60" />
                <select
                  value={canvasBg}
                  onChange={(e) => onChangeCanvasBg(e.target.value as CanvasBackground)}
                  className={`text-xs rounded px-2 py-1 border outline-none cursor-pointer ${
                    isDark
                      ? "bg-neutral-800 border-neutral-700 text-neutral-200"
                      : "bg-white border-neutral-300 text-neutral-800"
                  }`}
                >
                  <option value={CanvasBackground.DOTS}>Dot Matrix</option>
                  <option value={CanvasBackground.RULED}>Ruled Lines</option>
                  <option value={CanvasBackground.GRID}>Graph Grid</option>
                  <option value={CanvasBackground.BLANK}>Blank Canvas</option>
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 disabled:opacity-35 transition-colors cursor-pointer"
              title="Undo Stroke"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 disabled:opacity-35 transition-colors cursor-pointer"
              title="Redo Stroke"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Clear All Ink"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            {!isOverlay && (
              <button
                type="button"
                onClick={handleDownloadPng}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0 ml-1"
                title="Download Drawing as PNG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive HTML5 Canvas Surface */}
      <div
        ref={containerRef}
        className={`relative flex-1 w-full overflow-hidden ${
          isOverlay ? "bg-transparent" : "min-h-[540px]"
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`block w-full h-full touch-none ${
            isOverlay && !overlayInteractive
              ? "pointer-events-none"
              : activeTool === DrawTool.ERASER
              ? "cursor-cell"
              : "cursor-crosshair"
          }`}
        />
      </div>
    </div>
  );
};
