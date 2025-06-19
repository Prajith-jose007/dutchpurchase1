import {
  LayoutGrid,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  Search,
  Filter,
  PlusCircle,
  MinusCircle,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ShoppingBag,
  Flame,
  Beef,
  Fish,
  IceCream,
  Milk,
  Wheat,
  GlassWater,
  Settings2,
  Archive,
  Truck,
  CookingPot,
  Leaf,
  Menu,
  Sun,
  Moon,
  UserCircle,
} from 'lucide-react';

export const Icons = {
  Dashboard: LayoutGrid,
  Inventory: Package,
  Order: ShoppingCart,
  OrderList: ClipboardList,
  Branches: Users, // Using Users for Branches as an example
  Settings: Settings,
  Logout: LogOut,
  Search: Search,
  Filter: Filter,
  Add: PlusCircle,
  Remove: MinusCircle,
  Delete: Trash2,
  Success: CheckCircle,
  Error: XCircle,
  Warning: AlertTriangle,
  Info: Info,
  ShoppingBag: ShoppingBag,
  ChevronDown: ChevronDown,
  ChevronRight: ChevronRight,
  Logo: CookingPot, // Example logo
  Flame: Flame, // For 'Hot' or 'New' items if needed
  Meat: Beef,
  Seafood: Fish,
  Frozen: IceCream, // Using IceCream for Frozen category
  Dairy: Milk,
  DryGoods: Wheat, // Using Wheat for Dry Goods
  Drinks: GlassWater,
  Admin: Settings2,
  Archive: Archive,
  Truck: Truck,
  Vegetables: Leaf,
  Menu: Menu,
  Sun: Sun,
  Moon: Moon,
  User: UserCircle,
};

// Fallback or generic category icons
export const getCategoryIcon = (categoryType: string, itemType?: string) => {
  const lowerCategory = categoryType.toLowerCase();
  const lowerItemType = itemType?.toLowerCase();

  if (lowerCategory.includes('veg') || lowerCategory.includes('fruit') || lowerItemType?.includes('veg') || lowerItemType?.includes('fruit')) return Icons.Vegetables;
  if (lowerCategory.includes('meat') || lowerCategory.includes('beef') || lowerCategory.includes('chicken')|| lowerCategory.includes('lamb') || lowerItemType?.includes('meat')) return Icons.Meat;
  if (lowerCategory.includes('fish') || lowerCategory.includes('shrimp') || lowerItemType?.includes('seafood')) return Icons.Seafood;
  if (lowerCategory.includes('frozen') || lowerItemType?.includes('frozen')) return Icons.Frozen;
  if (lowerCategory.includes('diary') || lowerCategory.includes('milk') || lowerCategory.includes('cheese') || lowerItemType?.includes('diary')) return Icons.Dairy;
  if (lowerCategory.includes('dry') || lowerCategory.includes('pasta') || lowerCategory.includes('rice') || lowerCategory.includes('flour') || lowerItemType?.includes('dry')) return Icons.DryGoods;
  if (lowerCategory.includes('drink') || lowerCategory.includes('juice') || lowerCategory.includes('soda') || lowerItemType?.includes('drinks')) return Icons.Drinks;
  
  return Icons.Inventory; // Default icon
};
