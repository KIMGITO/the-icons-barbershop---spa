import React, { useState } from 'react';
import { Scissors, Package, Image as ImageIcon } from 'lucide-react';
import { ServicesManagementPage } from '../services/ServicesManagementPage';
import { ProductsManagementPage } from '../products/ProductsManagementPage';
import { GalleryManagementPage } from '../gallery/GalleryManagementPage';

export const CatalogHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'products' | 'gallery'>('services');

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center gap-2 border-b border-border mb-4 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'services'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Services</span>
        </button>
        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
        </button>
        <button
          onClick={() => setActiveSubTab('gallery')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'gallery'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Style Gallery</span>
        </button>
      </div>

      <div className="mt-4">
        {activeSubTab === 'services' && <ServicesManagementPage />}
        {activeSubTab === 'products' && <ProductsManagementPage />}
        {activeSubTab === 'gallery' && <GalleryManagementPage />}
      </div>
    </div>
  );
};
