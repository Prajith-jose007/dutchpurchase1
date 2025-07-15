
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  ChevronRight,
  LogIn, 
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
  Leaf,
  Menu,
  Sun,
  Moon,
  UserCircle,
  Settings, 
  Download,
  UploadCloud,
  FileText,
  Upload,
  File,
  BarChartHorizontal,
} from 'lucide-react';
import type React from 'react';
import Image from 'next/image';

const Logo = ({ className }: { className?: string }) => (
  <Image 
    src="/logo.png" 
    alt="Dutch Oriental Logo" 
    width={140} 
    height={43} 
    priority 
    className={className} 
    data-ai-hint="company logo"
  />
);


export const Icons = {
  Dashboard: LayoutGrid,
  Inventory: Package,
  Order: ShoppingCart,
  OrderList: ClipboardList,
  Branches: Users, 
  Settings: Settings, 
  Login: LogIn, 
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
  Flame: Flame, 
  Meat: Beef,
  Seafood: Fish,
  Frozen: IceCream, 
  Dairy: Milk,
  DryGoods: Wheat, 
  Drinks: GlassWater,
  Admin: Settings2,
  Archive: Archive,
  Truck: Truck,
  Vegetables: Leaf,
  Menu: Menu,
  Sun: Sun,
  Moon: Moon,
  User: UserCircle,
  Download: Download,
  UploadCloud: UploadCloud,
  FileText: FileText,
  Upload: Upload,
  File: File,
  Reports: BarChartHorizontal,
  ChevronRight: ChevronRight,
  Logo: Logo, // Use the new Image-based Logo component
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
