import { Card } from '@/components/ui/card';

export const MenuItemCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="flex gap-1">
          <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
        </div>
        <div className="flex justify-between items-end pt-1">
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
};

export default MenuItemCardSkeleton;

