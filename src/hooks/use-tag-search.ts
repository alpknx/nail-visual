import { useState, useEffect, useMemo } from "react";
import { getAllTags, searchTags } from "@/app/actions";
import { useDebounce } from "@/hooks/use-debounce";

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface UseTagSearchParams {
  open: boolean;
  selectedTagIds: number[];
  locale: string;
}

export function useTagSearch({ open, selectedTagIds, locale }: UseTagSearchParams) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchResults, setSearchResults] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const debouncedQuery = useDebounce(searchQuery, 300);

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

  const handleRemoveTag = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  return {
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
  };
}
