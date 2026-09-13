"use client";

import { buildLocationTree, findTreeNode, getLocationAncestors, type Location } from "@ghella/shared";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";

export function LocationDrilldown({
  locations,
  selectedId,
  onSelect,
}: {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  const ancestors = useMemo(
    () => (selectedId ? getLocationAncestors(locations, selectedId) : []),
    [locations, selectedId]
  );
  const children = useMemo(
    () => (selectedId ? findTreeNode(tree, selectedId)?.children ?? [] : tree),
    [tree, selectedId]
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`font-semibold transition-colors ${
            selectedId === null ? "text-primary" : "text-text-muted hover:text-text"
          }`}
        >
          All yards
        </button>
        {ancestors.map((loc) => (
          <span key={loc.id} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-text-faint" strokeWidth={2} />
            <button
              type="button"
              onClick={() => onSelect(loc.id)}
              className={`font-semibold transition-colors ${
                loc.id === selectedId ? "text-primary" : "text-text-muted hover:text-text"
              }`}
            >
              {loc.name}
            </button>
          </span>
        ))}
      </div>

      {children.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {children.map((node) => (
            <button
              type="button"
              key={node.location.id}
              onClick={() => onSelect(node.location.id)}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              {node.location.name}
              {node.children.length > 0 ? " ›" : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
