"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X } from "lucide-react";
import { getAllTags, searchTags } from "@/app/actions";
import { useDebounce } from "@/hooks/use-debounce";
import { useParams } from "next/navigation";

interface Tag {
  id: number;
  name: string;
  slug: string;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchResults, setSearchResults] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle swipe down to close
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const minSwipeDistance = 80;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all tags when modal opens
  useEffect(() => {
    if (open && allTags.length === 0) {
      setIsLoading(true);
      getAllTags(locale).then(tags => {
        setAllTags(tags);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }
  }, [open, allTags.length, locale]);

  // Load selected tags from IDs
  useEffect(() => {
    if (open && allTags.length > 0 && selectedTagIds.length > 0) {
      const tags = allTags.filter(tag => selectedTagIds.includes(tag.id));
      setSelectedTags(tags);
    } else if (open && selectedTagIds.length === 0) {
      setSelectedTags([]);
    }
  }, [open, allTags, selectedTagIds]);

  // Search tags when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsLoading(true);
      searchTags(debouncedQuery, locale).then(results => {
        setSearchResults(results);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, locale]);

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

  // Get displayed tags
  const displayedTags = useMemo(() => {
    if (debouncedQuery.length >= 2) {
      return searchResults.filter(tag => !selectedTags.some(st => st.id === tag.id));
    }
    return allTags.filter(tag => !selectedTags.some(st => st.id === tag.id));
  }, [debouncedQuery, searchResults, allTags, selectedTags]);

  // Check if search query matches a tag that can be added
  const customTag = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      // Check if it matches an existing tag that's not already selected
      const matchingTag = allTags.find(tag => 
        (tag.name.toLowerCase() === searchQuery.trim().toLowerCase() ||
         tag.slug.toLowerCase() === searchQuery.trim().toLowerCase()) &&
        !selectedTags.some(st => st.id === tag.id)
      );
      
      if (matchingTag) {
        return matchingTag;
      }
      
      // If no match, show custom tag suggestion (but it won't be used for filtering)
      return {
        id: -1, // Temporary ID for custom tag
        name: searchQuery.trim(),
        slug: searchQuery.trim().toLowerCase().replace(/\s+/g, '-'),
      };
    }
    return null;
  }, [searchQuery, allTags, selectedTags]);

  const handleTagToggle = (tag: Tag) => {
    setSelectedTags(prev => {
      const exists = prev.some(t => t.id === tag.id);
      if (exists) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
    // Clear search query after selecting a tag
    setSearchQuery("");
  };

  const handleCustomTagAdd = () => {
    if (customTag) {
      // If it's a real tag (id !== -1), add it normally
      if (customTag.id !== -1) {
        handleTagToggle(customTag);
      } else {
        // Add custom tag to display (but it won't be used for filtering)
        setSelectedTags(prev => {
          const exists = prev.some(t => t.id === -1 && t.name.toLowerCase() === customTag.name.toLowerCase());
          if (!exists) {
            return [...prev, customTag];
          }
          return prev;
        });
        setSearchQuery("");
      }
    }
  };

  const handleSearch = () => {
    // Only use real tag IDs (filter out custom tags with id === -1)
    const realTagIds = selectedTags
      .filter(tag => tag.id !== -1)
      .map(tag => tag.id);
    
    onSearch(realTagIds);
    onOpenChange(false);
  };

  const handleRemoveTag = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
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

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      tag.id === -1
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
                        : 'bg-primary text-white border border-primary/30'
                    }`}
                  >
                    <span className="whitespace-nowrap">{tag.name}</span>
                    {tag.id === -1 && (
                      <span className="text-[10px] opacity-60 ml-0.5">(not found)</span>
                    )}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className={`ml-0.5 rounded-full p-0.5 transition-colors flex-shrink-0 flex items-center justify-center ${
                        tag.id === -1
                          ? 'hover:bg-gray-300 dark:hover:bg-gray-600'
                          : 'hover:bg-white/30'
                      }`}
                      aria-label="Remove tag"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Tag Suggestion */}
          {customTag && !selectedTags.some(t => t.id === customTag.id || (t.id === -1 && t.name.toLowerCase() === customTag.name.toLowerCase())) && (
            <div className="mb-4">
              <button
                onClick={handleCustomTagAdd}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/10 transition-all"
                title={customTag.id === -1 ? `Add "${customTag.name}" (won't filter results)` : `Add "${customTag.name}"`}
              >
                <span>{customTag.id === -1 ? `Add "${customTag.name}"` : `Add "${customTag.name}"`}</span>
                <span className="text-primary">+</span>
              </button>
            </div>
          )}

          {/* Available Tags */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Tags
            </h3>
            {isLoading ? (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : displayedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag)}
                    className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/10 transition-all whitespace-nowrap"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                {debouncedQuery.length >= 2 ? "No matches" : "No tags available"}
              </div>
            )}
          </div>
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

