export const queryKeys = {
  items: (locationIds?: string[] | null) =>
    locationIds && locationIds.length > 0
      ? (["items", { locationIds: [...locationIds].sort() }] as const)
      : (["items"] as const),
  item: (itemId: string) => ["items", itemId] as const,
  locations: () => ["locations"] as const,
  myReservations: () => ["reservations", "mine"] as const,
  allReservations: () => ["reservations", "all"] as const,
  users: () => ["profiles", "all"] as const,
};
