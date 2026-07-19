import { X } from "lucide-react";
import type { Tag } from "@/hooks/use-tag-search";

interface SearchModalSelectedTagsProps {
  selectedTags: Tag[];
  customTag: Tag | null;
  onRemoveTag: (tagId: number) => void;
  onCustomTagAdd: () => void;
}

export default function SearchModalSelectedTags({
  selectedTags,
  customTag,
  onRemoveTag,
  onCustomTagAdd,
}: SearchModalSelectedTagsProps) {
  return (
    <>
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
                  onClick={() => onRemoveTag(tag.id)}
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
            onClick={onCustomTagAdd}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/10 transition-all"
            title={customTag.id === -1 ? `Add "${customTag.name}" (won't filter results)` : `Add "${customTag.name}"`}
          >
            <span>{customTag.id === -1 ? `Add "${customTag.name}"` : `Add "${customTag.name}"`}</span>
            <span className="text-primary">+</span>
          </button>
        </div>
      )}
    </>
  );
}
