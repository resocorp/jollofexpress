'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteDeliveryRegion, useDeleteRegionGroup } from '@/hooks/use-delivery-regions';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  item: { type: 'region' | 'group'; id: string; name: string } | null;
}

export function DeleteConfirmDialog({ open, onClose, item }: DeleteConfirmDialogProps) {
  const deleteRegion = useDeleteDeliveryRegion();
  const deleteGroup = useDeleteRegionGroup();

  const isDeleting = deleteRegion.isPending || deleteGroup.isPending;

  const handleDelete = async () => {
    if (!item) return;

    try {
      if (item.type === 'region') {
        await deleteRegion.mutateAsync(item.id);
        toast.success('Region deleted successfully');
      } else {
        await deleteGroup.mutateAsync(item.id);
        toast.success('Group deleted successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error?.message || `Failed to delete ${item.type}`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {item?.type === 'group' ? 'Group' : 'Region'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{item?.name}</strong>? 
            {item?.type === 'group' && (
              <span className="block mt-2 text-amber-600">
                Note: Regions in this group will become ungrouped, not deleted.
              </span>
            )}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
