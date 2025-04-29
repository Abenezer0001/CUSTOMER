import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/api/menuService";
import { ChevronLeft, ShoppingCart } from "lucide-react";

interface MenuItemListProps {
  menuItems: MenuItem[];
  onBackClick: () => void;
  onAddToCart: (item: MenuItem) => void;
  subcategoryName: string;
}

const MenuItemList = ({ 
  menuItems, 
  onBackClick, 
  onAddToCart,
  subcategoryName 
}: MenuItemListProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={onBackClick} 
          className="mr-2"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">{subcategoryName}</h2>
      </div>

      {menuItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">No menu items available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card key={item._id} className="overflow-hidden h-full flex flex-col">
              {item.image && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle>{item.name}</CardTitle>
                {item.description && (
                  <CardDescription className="line-clamp-2">
                    {item.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-3 flex-grow">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-lg">
                    £{item.price.toFixed(2)}
                  </p>
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Allergens: {item.allergens.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  onClick={() => onAddToCart(item)} 
                  className="w-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuItemList; 