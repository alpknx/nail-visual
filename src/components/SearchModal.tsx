"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useTagSearch } from "@/hooks/use-tag-search";
import SearchModalSelectedTags from "@/components/SearchModalSelectedTags";
import SearchModalAvailableTags from "@/components/SearchModalAvailableTags";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (tagIds: number[]) => void;
  selectedTagIds: number[];
}

export default function SearchModal({
  open,
  onOpenChange,
  onSearch,
  selectedTagIds,
}: SearchModalProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    isLoading,
    selectedTags,
    debouncedQuery,
    displayedTags,
    customTag,
    handleTagToggle,
    handleCustomTagAdd,
    handleRemoveTag,
  } = useTagSearch({ open, selectedTagIds, locale });

  // Handle swipe down to close
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const minSwipeDistance = 80;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const modal = modalRef.current;

    if (modal && modal.scrollTop > 0 && !(e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }

    setTouchEnd(null);
    setTouchStart(touch.clientY);
    setIsDragging(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStart;
    const modal = modalRef.current;

    if (modal && modal.scrollTop > 0 && !(e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }

    setTouchEnd(currentY);

    if (deltaY > 0) {
      setIsDragging(true);
      e.preventDefault();
      e.stopPropagation();
    } else {
      setIsDragging(false);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchEnd - touchStart;
    const isSwipeDown = distance > minSwipeDistance;

    if (isSwipeDown) {
      onOpenChange(false);
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
  };

  // Close on escape
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  const handleSearch = () => {
    // Only use real tag IDs (filter out custom tags with id === -1)
    const realTagIds = selectedTags
      .filter(tag => tag.id !== -1)
      .map(tag => tag.id);

    onSearch(realTagIds);
    onOpenChange(false);
  };

  if (!open || !mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed left-0 right-0 top-0 bg-black/20 z-[9998]"
        onClick={() => onOpenChange(false)}
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          animation: 'fadeIn 0.2s ease-out',
          WebkitBackdropFilter: 'blur(0px)',
          backdropFilter: 'blur(0px)',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
        }}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="fixed left-1/2 bg-white dark:bg-gray-900 rounded-t-3xl z-[9999] max-h-[85vh] overflow-y-auto w-full max-w-md"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          transform: open
            ? (isDragging && touchStart && touchEnd
                ? `translate(-50%, ${Math.max(0, touchEnd - touchStart)}px)`
                : 'translate(-50%, 0)')
            : 'translate(-50%, calc(100% + 60px + env(safe-area-inset-bottom, 0px)))',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div
          data-drag-handle
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
          }}
        >
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Search
          </h2>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-10 py-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 dark:border-gray-700/50 rounded-lg text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm"
              style={{ fontSize: '16px' }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Clear"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>

          <SearchModalSelectedTags
            selectedTags={selectedTags}
            customTag={customTag}
            onRemoveTag={handleRemoveTag}
            onCustomTagAdd={handleCustomTagAdd}
          />

          <SearchModalAvailableTags
            isLoading={isLoading}
            displayedTags={displayedTags}
            debouncedQuery={debouncedQuery}
            onTagToggle={handleTagToggle}
          />
        </div>

        {/* Footer with Search Button */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <button
            onClick={handleSearch}
            disabled={selectedTags.length === 0}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </>
  );
}
