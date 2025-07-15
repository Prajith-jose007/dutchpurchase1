
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
  Bell,
  Camera,
} from 'lucide-react';
import type React from 'react';
import Image from 'next/image';


export const Icons = {
  Dashboard: LayoutGrid,
  Inventory: Package,
  Order: ShoppingCart,
  ClipboardList: ClipboardList,
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
  Bell: Bell,
  Camera: Camera,
};

// Fallback or generic category icons
export const getCategoryIcon = (categoryType: string, itemType?: string): React.ComponentType<{ className?: string }> => {
  const lowerCategory = categoryType?.toLowerCase() || '';
  const lowerItemType = itemType?.toLowerCase() || '';

  const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
    veg: Icons.Vegetables,
    fruit: Icons.Vegetables,
    meat: Icons.Meat,
    beef: Icons.Meat,
    chicken: Icons.Meat,
    lamb: Icons.Meat,
    seafood: Icons.Seafood,
    fish: Icons.Seafood,
    shrimp: Icons.Seafood,
    frozen: Icons.Frozen,
    diary: Icons.Dairy,
    milk: Icons.Dairy,
    cheese: Icons.Dairy,
    dry: Icons.DryGoods,
    pasta: Icons.DryGoods,
    rice: Icons.DryGoods,
    flour: Icons.DryGoods,
    drink: Icons.Drinks,
    juice: Icons.Drinks,
    soda: Icons.Drinks,
  };
  
  const checkKeywords = (keywords: string[], text: string) => {
    for (const keyword of keywords) {
      if(text.includes(keyword)) return iconMap[keyword];
    }
    return null;
  }

  const keywords = Object.keys(iconMap);
  const icon = checkKeywords(keywords, lowerCategory) || checkKeywords(keywords, lowerItemType);

  return icon || Icons.Inventory; // Default icon
};
