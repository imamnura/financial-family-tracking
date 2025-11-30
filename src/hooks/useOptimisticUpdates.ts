import { useState, useCallback } from "react";

export interface OptimisticState<T> {
  data: T[];
  isOptimistic: boolean;
}

export function useOptimisticUpdates<T extends { id: string }>(
  initialData: T[]
) {
  const [optimisticData, setOptimisticData] = useState<T[]>(initialData);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(
    new Set()
  );

  // Sync with server data when it changes
  const syncData = useCallback((serverData: T[]) => {
    setOptimisticData(serverData);
    setPendingOperations(new Set());
  }, []);

  // Optimistically add item
  const optimisticAdd = useCallback(
    async (
      item: T,
      serverAction: () => Promise<T>
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      const tempId = `temp-${Date.now()}`;
      const tempItem = { ...item, id: tempId };

      // Immediately add to UI
      setOptimisticData((prev) => [tempItem, ...prev]);
      setPendingOperations((prev) => new Set(prev).add(tempId));

      try {
        // Call server
        const newItem = await serverAction();

        // Replace temp item with real item
        setOptimisticData((prev) =>
          prev.map((i) => (i.id === tempId ? newItem : i))
        );
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });

        return { success: true, data: newItem };
      } catch (error) {
        // Rollback on error
        setOptimisticData((prev) => prev.filter((i) => i.id !== tempId));
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to add item",
        };
      }
    },
    []
  );

  // Optimistically update item
  const optimisticUpdate = useCallback(
    async (
      id: string,
      updates: Partial<T>,
      serverAction: () => Promise<T>
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      // Store original item for rollback
      const originalItem = optimisticData.find((i) => i.id === id);
      if (!originalItem) {
        return { success: false, error: "Item not found" };
      }

      // Immediately update UI
      setOptimisticData((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
      setPendingOperations((prev) => new Set(prev).add(id));

      try {
        // Call server
        const updatedItem = await serverAction();

        // Update with server response
        setOptimisticData((prev) =>
          prev.map((i) => (i.id === id ? updatedItem : i))
        );
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        return { success: true, data: updatedItem };
      } catch (error) {
        // Rollback on error
        setOptimisticData((prev) =>
          prev.map((i) => (i.id === id ? originalItem : i))
        );
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update item",
        };
      }
    },
    [optimisticData]
  );

  // Optimistically delete item
  const optimisticDelete = useCallback(
    async (
      id: string,
      serverAction: () => Promise<void>
    ): Promise<{ success: boolean; error?: string }> => {
      // Store original item for rollback
      const originalItem = optimisticData.find((i) => i.id === id);
      if (!originalItem) {
        return { success: false, error: "Item not found" };
      }

      // Immediately remove from UI
      setOptimisticData((prev) => prev.filter((i) => i.id !== id));
      setPendingOperations((prev) => new Set(prev).add(id));

      try {
        // Call server
        await serverAction();

        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        return { success: true };
      } catch (error) {
        // Rollback on error - restore item
        setOptimisticData((prev) => [originalItem, ...prev]);
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete item",
        };
      }
    },
    [optimisticData]
  );

  return {
    data: optimisticData,
    pendingOperations,
    syncData,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
  };
}
