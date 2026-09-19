"use client";

import {
  buildLocationTree,
  filterLocationTree,
  getAllTreeIds,
  getFriendlyErrorMessage,
  getLocationPath,
  useCreateLocation,
  type Location,
  type LocationTreeNode,
} from "@ghella/shared";
import { Check, ChevronRight, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function LocationTreePicker({
  label,
  locations,
  value,
  onChange,
  error,
}: {
  label: string;
  locations: Location[];
  value: string;
  onChange: (locationId: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [pickingParent, setPickingParent] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const createLocation = useCreateLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  const searching = search.trim().length > 0;
  const visibleTree = useMemo(
    () => (searching ? filterLocationTree(tree, search) : tree),
    [tree, search, searching]
  );
  const autoExpanded = useMemo(
    () => (searching ? new Set(getAllTreeIds(visibleTree)) : expanded),
    [searching, visibleTree, expanded]
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setIsAdding(false);
      setPickingParent(false);
      setParentSearch("");
    }
  }, [open]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flatLocations = useMemo(
    () =>
      [...locations].sort((a, b) => getLocationPath(locations, a.id).localeCompare(getLocationPath(locations, b.id))),
    [locations]
  );
  // Matches on the full path ("Pakistan > Punjab > Lahore > Town"), not just
  // a location's own name, so searching "town" finds it no matter how deep
  // it sits — same "search reaches child locations" behavior as the main
  // tree search above, just as a flat filtered list rather than a tree.
  const filteredParentLocations = useMemo(() => {
    const needle = parentSearch.trim().toLowerCase();
    if (!needle) return flatLocations;
    return flatLocations.filter((loc) => getLocationPath(locations, loc.id).toLowerCase().includes(needle));
  }, [flatLocations, locations, parentSearch]);

  const handleAddLocation = () => {
    if (!newName.trim()) {
      setAddError("Name is required");
      return;
    }
    setAddError(null);
    createLocation.mutate(
      { name: newName.trim(), parent_location_id: newParentId || null },
      {
        onSuccess: (created) => {
          onChange(created.id);
          setNewName("");
          setNewParentId("");
          setIsAdding(false);
          setOpen(false);
        },
        onError: (err) => setAddError(getFriendlyErrorMessage(err)),
      }
    );
  };

  return (
    <div className="mb-4" ref={containerRef}>
      <span className="mb-1.5 block text-sm font-semibold text-text">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-2 rounded-sm border bg-surface px-3.5 py-2.5 text-left text-[15px] outline-none transition-colors focus:border-primary ${
            error ? "border-danger" : "border-border"
          }`}
        >
          <MapPin size={16} className="shrink-0 text-text-faint" strokeWidth={2} />
          <span className={`min-w-0 flex-1 truncate ${value ? "text-text" : "text-text-faint"}`}>
            {value ? getLocationPath(locations, value) : "Select a location"}
          </span>
        </button>

        {open ? (
          <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-sm border border-border bg-surface shadow-[0_8px_24px_rgba(15,27,45,0.14)]">
            {pickingParent ? (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <Search size={15} className="text-text-faint" strokeWidth={2} />
                  <input
                    autoFocus
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Search locations"
                    className="flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-faint"
                  />
                  {parentSearch ? (
                    <button type="button" onClick={() => setParentSearch("")} className="text-text-faint hover:text-text">
                      <X size={14} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewParentId("");
                      setPickingParent(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-surface-alt ${
                      newParentId === "" ? "font-bold text-primary" : "text-text"
                    }`}
                  >
                    No parent (top-level yard)
                    {newParentId === "" ? <Check size={15} strokeWidth={2.5} /> : null}
                  </button>
                  {filteredParentLocations.length === 0 ? (
                    <p className="px-3.5 py-3 text-sm text-text-muted">No locations match.</p>
                  ) : (
                    filteredParentLocations.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setNewParentId(loc.id);
                          setPickingParent(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-surface-alt ${
                          newParentId === loc.id ? "font-bold text-primary" : "text-text"
                        }`}
                      >
                        <span className="min-w-0 truncate">{getLocationPath(locations, loc.id)}</span>
                        {newParentId === loc.id ? <Check size={15} className="shrink-0" strokeWidth={2.5} /> : null}
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPickingParent(false)}
                  className="w-full border-t border-border px-3.5 py-2.5 text-left text-sm font-semibold text-text-muted hover:bg-surface-alt"
                >
                  ← Back
                </button>
              </>
            ) : isAdding ? (
              <div className="p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">New location</p>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Location name"
                  className="mb-2 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    setParentSearch("");
                    setPickingParent(true);
                  }}
                  className="mb-2 flex w-full items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-left text-sm outline-none focus:border-primary"
                >
                  <MapPin size={14} className="shrink-0 text-text-faint" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate text-text">
                    {newParentId ? getLocationPath(locations, newParentId) : "No parent (top-level yard)"}
                  </span>
                </button>
                {addError ? <p className="mb-2 text-xs font-semibold text-danger">{addError}</p> : null}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={createLocation.isPending}
                    className="flex-1 rounded-sm bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-text transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {createLocation.isPending ? "Adding…" : "Add location"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setAddError(null);
                    }}
                    className="rounded-sm border border-border px-3 py-2 text-xs font-bold uppercase tracking-wide text-text-muted hover:bg-surface-alt"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <Search size={15} className="text-text-faint" strokeWidth={2} />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search locations"
                    className="flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-faint"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} className="text-text-faint hover:text-text">
                      <X size={14} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {visibleTree.length === 0 ? (
                    <p className="px-3.5 py-3 text-sm text-text-muted">No locations match.</p>
                  ) : (
                    visibleTree.map((node) => (
                      <TreeRow
                        key={node.location.id}
                        node={node}
                        depth={0}
                        value={value}
                        expandedIds={autoExpanded}
                        onToggle={toggleExpanded}
                        onSelect={(id) => {
                          onChange(id);
                          setOpen(false);
                        }}
                      />
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="flex w-full items-center gap-2 border-t border-border px-3.5 py-2.5 text-left text-sm font-semibold text-primary hover:bg-surface-alt"
                >
                  <Plus size={15} strokeWidth={2.25} /> Add new location
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  value,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: LocationTreeNode;
  depth: number;
  value: string;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.location.id);
  const isSelected = value === node.location.id;

  return (
    <div>
      <div
        className="flex items-center gap-1 hover:bg-surface-alt"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.location.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center text-text-faint"
          >
            <ChevronRight
              size={14}
              strokeWidth={2.25}
              className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.location.id)}
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pr-3 text-left text-sm ${
            isSelected ? "font-bold text-primary" : "text-text"
          }`}
        >
          <span className="min-w-0 truncate">{node.location.name}</span>
          {isSelected ? <Check size={15} className="shrink-0" strokeWidth={2.5} /> : null}
        </button>
      </div>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <TreeRow
              key={child.location.id}
              node={child}
              depth={depth + 1}
              value={value}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}
