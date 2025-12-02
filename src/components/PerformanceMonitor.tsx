"use client";

import { useEffect, useState, useRef } from "react";

interface PerformanceMonitorProps {
  itemCount: number;
  pageCount: number;
  enabled?: boolean;
}

export default function PerformanceMonitor({ 
  itemCount, 
  pageCount,
  enabled: propEnabled 
}: PerformanceMonitorProps) {
  // Enable in development or if ?perf=true in URL
  const [enabled, setEnabled] = useState(() => {
    if (propEnabled !== undefined) return propEnabled;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return process.env.NODE_ENV === 'development' || params.get('perf') === 'true';
    }
    return process.env.NODE_ENV === 'development';
  });
  const [fps, setFps] = useState<number | null>(null);
  const [memory, setMemory] = useState<{
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  } | null>(null);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const renderStartRef = useRef<number>(performance.now());

  // Measure FPS
  useEffect(() => {
    if (!enabled) return;

    const measureFPS = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      frameRef.current = requestAnimationFrame(measureFPS);
    };

    frameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled]);

  // Measure memory (if available)
  useEffect(() => {
    if (!enabled) return;

    const updateMemory = () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        setMemory({
          usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1048576), // MB
          totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1048576), // MB
          jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1048576), // MB
        });
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);
    return () => clearInterval(interval);
  }, [enabled]);

  // Measure render time
  useEffect(() => {
    if (!enabled) return;

    const startTime = renderStartRef.current;
    requestAnimationFrame(() => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
      renderStartRef.current = performance.now();
    });
  }, [itemCount, enabled]);

  if (!enabled) return null;

  const getStatusColor = (value: number | null, thresholds: { good: number; warning: number }) => {
    if (value === null) return 'text-gray-500';
    if (value >= thresholds.good) return 'text-green-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed bottom-20 right-2 z-50 bg-black/80 text-white text-xs p-2 rounded-lg font-mono backdrop-blur-sm border border-white/20">
      <div className="font-bold mb-1 text-xs">Performance Monitor</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Items:</span>{' '}
          <span className={getStatusColor(itemCount, { good: 0, warning: 100 })}>
            {itemCount}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Pages:</span>{' '}
          <span className="text-white">{pageCount}</span>
        </div>
        {fps !== null && (
          <div>
            <span className="text-gray-400">FPS:</span>{' '}
            <span className={getStatusColor(fps, { good: 55, warning: 30 })}>
              {fps}
            </span>
          </div>
        )}
        {memory && (
          <div>
            <span className="text-gray-400">Memory:</span>{' '}
            <span className={getStatusColor(
              memory.usedJSHeapSize, 
              { good: 0, warning: 100 }
            )}>
              {memory.usedJSHeapSize}MB / {memory.jsHeapSizeLimit}MB
            </span>
          </div>
        )}
        {renderTime !== null && (
          <div>
            <span className="text-gray-400">Render:</span>{' '}
            <span className={getStatusColor(
              renderTime, 
              { good: 0, warning: 16 }
            )}>
              {renderTime.toFixed(1)}ms
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-gray-400">
        {itemCount > 100 && (
          <div className="text-yellow-400">⚠️ Consider virtualization</div>
        )}
        {itemCount > 200 && (
          <div className="text-red-400">🚨 Virtualization recommended</div>
        )}
      </div>
    </div>
  );
}

