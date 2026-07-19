import type { Tag } from "@/hooks/use-tag-search";

interface SearchModalAvailableTagsProps {
  isLoading: boolean;
  displayedTags: Tag[];
  debouncedQuery: string;
  onTagToggle: (tag: Tag) => void;
}

export default function SearchModalAvailableTags({
  isLoading,
  displayedTags,
  debouncedQuery,
  onTagToggle,
}: SearchModalAvailableTagsProps) {
  return (
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
              onClick={() => onTagToggle(tag)}
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
  );
}
