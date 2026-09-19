import type { Location } from "../types/database";

/** Top-level yards only (no parent) — used for the primary filter UI. */
export function getTopLevelLocations(locations: Location[]): Location[] {
  return locations.filter((loc) => loc.parent_location_id === null);
}

/** A location's id plus every descendant sub-location's id (e.g. a yard + its containers). */
export function getDescendantLocationIds(locations: Location[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const loc of locations) {
    if (loc.parent_location_id) {
      const siblings = childrenByParent.get(loc.parent_location_id) ?? [];
      siblings.push(loc.id);
      childrenByParent.set(loc.parent_location_id, siblings);
    }
  }

  const result: string[] = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

/** Ids of every location whose own name OR full "Yard > Container" path
 * contains `term` — used to fold location matches into a materials search
 * (see matchingLocationIds on useItemsInfinite), so searching "ormiston"
 * finds materials stored anywhere under that yard even when the term
 * appears nowhere in the item's own fields. */
export function findMatchingLocationIds(locations: Location[], term: string): string[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  return locations
    .filter(
      (loc) =>
        loc.name.toLowerCase().includes(needle) ||
        getLocationPath(locations, loc.id).toLowerCase().includes(needle)
    )
    .map((loc) => loc.id);
}

/** Full "Yard > Container" style label by walking up parent_location_id. */
export function getLocationPath(locations: Location[], locationId: string): string {
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  const parts: string[] = [];
  let current = byId.get(locationId);
  while (current) {
    parts.unshift(current.name);
    current = current.parent_location_id ? byId.get(current.parent_location_id) : undefined;
  }
  return parts.join(" > ");
}

/** Every ancestor of a location, root-first (e.g. [yard, container] for a
 * sub-container) — used for breadcrumb display and "jump to this ancestor"
 * navigation. */
export function getLocationAncestors(locations: Location[], locationId: string): Location[] {
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  const chain: Location[] = [];
  let current = byId.get(locationId);
  while (current) {
    chain.unshift(current);
    current = current.parent_location_id ? byId.get(current.parent_location_id) : undefined;
  }
  return chain;
}

export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
}

/** Turns the flat locations list into a nested tree (yards -> containers ->
 * sub-containers, at whatever depth actually exists) for tree-picker UIs. */
export function buildLocationTree(locations: Location[]): LocationTreeNode[] {
  const byParent = new Map<string | null, Location[]>();
  for (const loc of locations) {
    const key = loc.parent_location_id;
    const siblings = byParent.get(key) ?? [];
    siblings.push(loc);
    byParent.set(key, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  function buildChildren(parentId: string | null): LocationTreeNode[] {
    return (byParent.get(parentId) ?? []).map((loc) => ({
      location: loc,
      children: buildChildren(loc.id),
    }));
  }

  return buildChildren(null);
}

/** Prunes a location tree down to nodes that match `term` (by name) plus
 * their ancestors, so a search still shows enough context to place a match —
 * e.g. searching "container 4" still shows the yard it's under. */
export function filterLocationTree(tree: LocationTreeNode[], term: string): LocationTreeNode[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return tree;

  function filterNode(node: LocationTreeNode): LocationTreeNode | null {
    const matchedChildren = node.children
      .map(filterNode)
      .filter((n): n is LocationTreeNode => n !== null);
    const selfMatches = node.location.name.toLowerCase().includes(needle);
    if (selfMatches || matchedChildren.length > 0) {
      return { location: node.location, children: matchedChildren };
    }
    return null;
  }

  return tree.map(filterNode).filter((n): n is LocationTreeNode => n !== null);
}

/** Every location id appearing anywhere in a tree — used to auto-expand
 * every branch while a search filter is active. */
export function getAllTreeIds(tree: LocationTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: LocationTreeNode[]) => {
    for (const node of nodes) {
      ids.push(node.location.id);
      walk(node.children);
    }
  };
  walk(tree);
  return ids;
}

export interface FlatLocationRow {
  location: Location;
  depth: number;
  hasChildren: boolean;
}

/** Flattens a tree into the rows a virtualized list (e.g. FlatList) should
 * currently render, respecting which parent nodes are expanded. */
export function flattenVisibleTree(
  tree: LocationTreeNode[],
  expandedIds: ReadonlySet<string>,
  depth = 0
): FlatLocationRow[] {
  const rows: FlatLocationRow[] = [];
  for (const node of tree) {
    rows.push({ location: node.location, depth, hasChildren: node.children.length > 0 });
    if (node.children.length > 0 && expandedIds.has(node.location.id)) {
      rows.push(...flattenVisibleTree(node.children, expandedIds, depth + 1));
    }
  }
  return rows;
}

/** Finds a node anywhere in a tree by location id. */
export function findTreeNode(tree: LocationTreeNode[], locationId: string): LocationTreeNode | null {
  for (const node of tree) {
    if (node.location.id === locationId) return node;
    const found = findTreeNode(node.children, locationId);
    if (found) return found;
  }
  return null;
}
