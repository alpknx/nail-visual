"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchTags } from "@/app/actions";
import { useDebounce } from "@/hooks/use-debounce";

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface SearchBarProps {
  onSelectTag: (tag: Tag | null) => void;
  selectedTag: Tag | null;
}

export default function SearchBar({ onSelectTag, selectedTag }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const fetchTags = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const tags = await searchTags(debouncedQuery);
        setResults(tags);
        setIsOpen(true);
      } catch (error) {
        console.error("Failed to search tags:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (tag: Tag) => {
    onSelectTag(tag);
    setQuery("");
    setIsOpen(false);
  };

  const clearSelection = () => {
    onSelectTag(null);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

      {selectedTag ? (
        <div className="flex items-center h-9 pl-9 pr-2 bg-primary/10 rounded-md border border-primary/20">
          <span className="text-sm font-medium text-primary mr-2">{selectedTag.name}</span>
          <button onClick={clearSelection} className="ml-auto hover:bg-primary/20 rounded-full p-0.5">
            <X className="h-3 w-3 text-primary" />
          </button>
        </div>
      ) : (
        <Input
          type="search"
          placeholder="Search tags..."
          className="pl-9 h-9 bg-muted/50 border-none"
          value={query}
          onChange={(e: any) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
      )}

      {isOpen && results.length > 0 && !selectedTag && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map((tag) => (
            <button
              key={tag.id}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center justify-between"
              onClick={() => handleSelect(tag)}
            >
              <span>{tag.name}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-2 text-center text-xs text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  );
}
