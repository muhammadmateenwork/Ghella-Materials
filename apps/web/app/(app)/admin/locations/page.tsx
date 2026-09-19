"use client";

import {
  getDescendantLocationIds,
  getFriendlyErrorMessage,
  getLocationPath,
  locationFormSchema,
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
  type Location,
} from "@ghella/shared";
import { Check, Loader2, MapPinned, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { useConfirm } from "../../../../components/ConfirmDialog";
import { EmptyState } from "../../../../components/EmptyState";
import { LocationTreePicker } from "../../../../components/LocationTreePicker";
import { PageTitle } from "../../../../components/PageTitle";
import { StackLoader } from "../../../../components/StackLoader";
import { TextField } from "../../../../components/TextField";
import { useToast } from "../../../../components/Toast";

// A synthetic "no parent" row so the searchable tree picker can represent
// "top-level yard" as a normal selectable option, the same trick the
// mobile version of this screen already uses.
const NO_PARENT_OPTION: Location = {
  id: "",
  name: "No parent (top-level yard)",
  parent_location_id: null,
  created_at: "",
  created_by: null,
};

export default function AdminLocationsPage() {
  const locationsQuery = useLocations();
  const locations = locationsQuery.data ?? [];
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editError, setEditError] = useState<string | undefined>();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const result = locationFormSchema.safeParse({
      name,
      parent_location_id: parentId || null,
    });
    if (!result.success) {
      setNameError(result.error.issues[0]?.message);
      return;
    }
    setNameError(undefined);
    createLocation.mutate(result.data, {
      onSuccess: () => {
        setName("");
        setParentId("");
        showToast(`"${result.data.name}" added.`);
      },
      onError: (error) => showToast(`Couldn't add location: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
    setEditParentId(location.parent_location_id ?? "");
    setEditError(undefined);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(undefined);
  };

  const handleSaveEdit = (id: string) => {
    const result = locationFormSchema.safeParse({
      name: editName,
      parent_location_id: editParentId || null,
    });
    if (!result.success) {
      setEditError(result.error.issues[0]?.message);
      return;
    }
    setEditError(undefined);
    updateLocation.mutate(
      { id, ...result.data },
      {
        onSuccess: () => {
          setEditingId(null);
          showToast(`"${result.data.name}" updated.`);
        },
        onError: (error) => showToast(`Couldn't update location: ${getFriendlyErrorMessage(error)}`, "error"),
      }
    );
  };

  const handleDelete = async (location: Location) => {
    const descendantCount = getDescendantLocationIds(locations, location.id).length - 1;
    const confirmed = await confirmDialog({
      title: "Delete this location?",
      message:
        descendantCount > 0
          ? `This also removes its ${descendantCount} sub-location${descendantCount === 1 ? "" : "s"}. This can't be undone.`
          : "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteLocation.mutate(location.id, {
      onSuccess: () => showToast(`"${location.name}" deleted.`),
      onError: (error) => showToast(getFriendlyErrorMessage(error), "error"),
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle>Locations</PageTitle>

      <Card className="mb-6">
        <p className="mb-4 text-sm font-bold text-text">Add a location</p>
        <form onSubmit={handleAdd} noValidate>
          <TextField label="Name *" value={name} onChange={(e) => setName(e.target.value)} error={nameError} />
          <LocationTreePicker
            label="Parent location (leave as 'No parent' for a top-level yard)"
            locations={[NO_PARENT_OPTION, ...locations]}
            value={parentId}
            onChange={setParentId}
          />
          <Button type="submit" icon={Plus} loading={createLocation.isPending}>
            Add location
          </Button>
        </form>
      </Card>

      <p className="mb-3 text-sm font-bold text-text">Existing locations</p>
      {locationsQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <StackLoader size="sm" />
        </div>
      ) : locationsQuery.isError ? (
        <p className="text-sm text-danger">Couldn&apos;t load locations: {locationsQuery.error?.message}</p>
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No locations yet"
          subtitle="Add your first yard above — materials need a location before they can be added."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {locations.map((location) => {
            const isEditing = editingId === location.id;
            const excludedIds = isEditing ? new Set(getDescendantLocationIds(locations, location.id)) : null;

            if (isEditing) {
              return (
                <Card key={location.id}>
                  <TextField
                    label="Name *"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    error={editError}
                  />
                  <LocationTreePicker
                    label="Parent location"
                    locations={[NO_PARENT_OPTION, ...locations.filter((l) => !excludedIds!.has(l.id))]}
                    value={editParentId}
                    onChange={setEditParentId}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      icon={Check}
                      loading={updateLocation.isPending}
                      onClick={() => handleSaveEdit(location.id)}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" icon={X} onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </Card>
              );
            }

            return (
              <div
                key={location.id}
                className="flex items-center gap-2.5 rounded-sm border border-border bg-surface px-3.5 py-2.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-surface-alt">
                  <MapPinned size={14} className="text-text-muted" strokeWidth={2} />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-text">{getLocationPath(locations, location.id)}</span>
                <button
                  type="button"
                  onClick={() => startEdit(location)}
                  disabled={deleteLocation.isPending && deleteLocation.variables === location.id}
                  aria-label={`Edit ${location.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-surface-alt hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil size={15} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(location)}
                  disabled={deleteLocation.isPending && deleteLocation.variables === location.id}
                  aria-label={`Delete ${location.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteLocation.isPending && deleteLocation.variables === location.id ? (
                    <Loader2 size={15} className="animate-spin" strokeWidth={2} />
                  ) : (
                    <Trash2 size={15} strokeWidth={2} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
