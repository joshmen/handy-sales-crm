import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onSave?: () => Promise<boolean> | boolean;
  message?: string;
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  onSave,
  message = 'Tienes cambios sin guardar que se perderán si abandonas esta página.',
}: UseUnsavedChangesOptions) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const originalPushRef = useRef<typeof router.push | undefined>(undefined);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    // Store original router.push
    if (!originalPushRef.current) {
      originalPushRef.current = router.push;
    }

    // Override router.push when there are unsaved changes
    if (hasUnsavedChanges) {
      router.push = (href: string, options?: { scroll?: boolean; shallow?: boolean }) => {
        if (isNavigatingRef.current) {
          return originalPushRef.current!(href, options);
        }

        setPendingNavigation(href);
        setShowDialog(true);
        return Promise.resolve(true);
      };
    } else {
      // Restore original router.push when no unsaved changes
      if (originalPushRef.current) {
        router.push = originalPushRef.current;
      }
    }

    // Browser navigation guard
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Restore original router.push on cleanup
      if (originalPushRef.current) {
        router.push = originalPushRef.current;
      }
    };
  }, [hasUnsavedChanges, message, router]);

  const handleContinueNavigation = async () => {
    if (pendingNavigation && originalPushRef.current) {
      isNavigatingRef.current = true;
      setShowDialog(false);
      await originalPushRef.current(pendingNavigation);
      setPendingNavigation(null);
      isNavigatingRef.current = false;
    }
  };

  const handleSaveAndContinue = async (): Promise<boolean> => {
    if (onSave && pendingNavigation) {
      try {
        const success = await onSave();
        if (success) {
          await handleContinueNavigation();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error saving:', error);
        return false;
      }
    }
    return false;
  };

  const handleCancelNavigation = () => {
    setShowDialog(false);
    setPendingNavigation(null);
  };

  return {
    showDialog,
    setShowDialog,
    handleContinueNavigation,
    handleSaveAndContinue,
    handleCancelNavigation,
    hasUnsavedChanges,
  };
}
