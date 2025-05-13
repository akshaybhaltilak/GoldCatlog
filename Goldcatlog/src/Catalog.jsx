import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './Firebase/Config';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [weightRange, setWeightRange] = useState({ min: 0, max: 1000 });
  const [stockFilter, setStockFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [viewType, setViewType] = useState('grid');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isQuickViewVisible, setIsQuickViewVisible] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [animateItems, setAnimateItems] = useState(false);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [calculatorProduct, setCalculatorProduct] = useState(null);
  const [goldRate, setGoldRate] = useState(0);
  const [makingCharge, setMakingCharge] = useState(10); // Default making charge percentage

  useEffect(() => {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const productsArray = data 
        ? Object.entries(data).map(([id, item]) => ({ id, ...item }))
        : [];
      setProducts(productsArray);
      setIsLoading(false);
      
      // Animate items after loading
      setTimeout(() => {
        setAnimateItems(true);
      }, 300);
    });
    
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('goldShopFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Error loading favorites", e);
      }
    }
  }, []);

  // Get all unique categories
  const categories = [...new Set(products.map(product => product.category))];
  
  // Calculate weight range for the slider
  useEffect(() => {
    if (products.length > 0) {
      const weights = products
        .filter(p => p.weight)
        .map(p => parseFloat(p.weight.replace(/[^\d.-]/g, '')))
        .filter(p => !isNaN(p));
      
      if (weights.length > 0) {
        const minWeight = Math.floor(Math.min(...weights));
        const maxWeight = Math.ceil(Math.max(...weights));
        setWeightRange({ min: minWeight, max: maxWeight });
      }
    }
  }, [products]);

  // Filter products based on all criteria
  const filteredProducts = products.filter(product => {
    // Search term filter
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = categoryFilter ? product.category === categoryFilter : true;
    
    // Stock filter
    const matchesStock = 
      stockFilter === 'all' ? true :
      stockFilter === 'inStock' ? product.inStock !== false :
      stockFilter === 'outOfStock' ? product.inStock === false : true;
    
    // Weight filter (if weight exists)
    let matchesWeight = true;
    if (product.weight) {
      const productWeight = parseFloat(product.weight.replace(/[^\d.-]/g, ''));
      if (!isNaN(productWeight)) {
        matchesWeight = productWeight >= weightRange.min && productWeight <= weightRange.max;
      }
    }
    
    // Favorites filter
    const matchesFavorites = showFavoritesOnly ? favorites.includes(product.id) : true;
    
    return matchesSearch && matchesCategory && matchesStock && matchesWeight && matchesFavorites;
  });

  // Sort the filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'weightLowToHigh':
        return (parseFloat(a.weight?.replace(/[^\d.-]/g, '') || 0) - 
                parseFloat(b.weight?.replace(/[^\d.-]/g, '') || 0));
      case 'weightHighToLow':
        return (parseFloat(b.weight?.replace(/[^\d.-]/g, '') || 0) - 
                parseFloat(a.weight?.replace(/[^\d.-]/g, '') || 0));
      case 'nameAZ':
        return a.name?.localeCompare(b.name);
      case 'nameZA':
        return b.name?.localeCompare(a.name);
      default:
        return 0; // Keep original order for 'featured'
    }
  });

  const openProductModal = (product) => {
    setSelectedProduct(product);
    document.body.style.overflow = 'hidden';
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    document.body.style.overflow = 'auto';
  };
  
  const showQuickView = (e, product) => {
    e.stopPropagation();
    setQuickViewProduct(product);
    setIsQuickViewVisible(true);
  };
  
  const hideQuickView = () => {
    setIsQuickViewVisible(false);
    setTimeout(() => {
      setQuickViewProduct(null);
    }, 300); // Wait for animation to complete
  };
  
  const toggleFavorite = (e, productId) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    setFavorites(newFavorites);
    localStorage.setItem('goldShopFavorites', JSON.stringify(newFavorites));
  };

  // Show gold price calculator
  const showCalculator = (e, product) => {
    if (e) e.stopPropagation();
    setCalculatorProduct(product);
    setIsCalculatorVisible(true);
    document.body.style.overflow = 'hidden';
  };
  
  // Hide gold price calculator
  const hideCalculator = () => {
    setIsCalculatorVisible(false);
    setTimeout(() => {
      setCalculatorProduct(null);
    }, 300);
    document.body.style.overflow = 'auto';
  };
  
  // Calculate the estimated price based on weight and current gold rate
  const calculatePrice = (weight, purity = 22) => {
    // Extract numeric value from weight string
    const weightValue = parseFloat(weight?.replace(/[^\d.-]/g, '') || 0);
    
    // Calculate the base price (weight * gold rate * purity ratio)
    const purityRatio = purity / 24;
    const basePrice = weightValue * goldRate * purityRatio;
    
    // Add making charges
    const makingChargeAmount = (basePrice * makingCharge) / 100;
    
    return {
      basePrice,
      makingChargeAmount,
      totalPrice: basePrice + makingChargeAmount
    };
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStockFilter('all');
    setSortBy('featured');
    setShowFavoritesOnly(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header with gold shop branding */}
        <header className="text-center py-8 mb-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-amber-800">
            <span className="text-yellow-500">✦</span> Gold Shop Collection <span className="text-yellow-500">✦</span>
          </h1>
          <p className="text-lg text-amber-700">Discover our exquisite selection of fine gold jewelry</p>
        </header>

        {/* Filters section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search input */}
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search luxury gold items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category filter */}
            <div className="md:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Stock filter */}
            <div className="md:w-48">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              >
                <option value="all">All Items</option>
                <option value="inStock">In Stock</option>
                <option value="outOfStock">Out of Stock</option>
              </select>
            </div>

            {/* Sort filter */}
            <div className="md:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              >
                <option value="featured">Featured</option>
                <option value="weightLowToHigh">Weight: Low to High</option>
                <option value="weightHighToLow">Weight: High to Low</option>
                <option value="nameAZ">Name: A-Z</option>
                <option value="nameZA">Name: Z-A</option>
              </select>
            </div>
          </div>

          {/* Favorites filter */}
          <div className="mt-4 flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-6 relative rounded-full transition-colors duration-300 ease-in-out ${showFavoritesOnly ? 'bg-amber-500' : 'bg-gray-300'}`}>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${showFavoritesOnly ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-3 text-amber-800">Show favorites only</span>
            </label>
            {favorites.length > 0 && (
              <span className="ml-2 text-sm bg-amber-100 text-amber-800 py-1 px-2 rounded-full">{favorites.length}</span>
            )}
          </div>

          {/* Weight range filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Weight Range: {weightRange.min}g - {weightRange.max}g
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="0"
                max={weightRange.max > 0 ? weightRange.max : 1000}
                value={weightRange.min}
                onChange={(e) => setWeightRange({...weightRange, min: parseInt(e.target.value)})}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max={weightRange.max > 0 ? weightRange.max : 1000}
                value={weightRange.max}
                onChange={(e) => setWeightRange({...weightRange, max: parseInt(e.target.value)})}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Filter controls */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={clearFilters}
              className="text-amber-600 hover:text-amber-800 font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>

            <div className="flex items-center gap-4">
              <span className="text-amber-800 text-sm">View:</span>
              <button
                onClick={() => setViewType('grid')}
                className={`p-1 rounded ${viewType === 'grid' ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
                aria-label="Grid view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-1 rounded ${viewType === 'list' ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
                aria-label="List view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Results info */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-medium text-amber-800">
                {sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'} found
              </h2>
            </div>

            {/* No results message */}
            {sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-amber-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-amber-800 mb-2">No products found</h3>
                <p className="text-amber-600">Try adjusting your search or filter criteria</p>
              </div>
            )}

            {/* Products display */}
            {viewType === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className={`group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform ${animateItems ? 'opacity-100' : 'opacity-0'} ${animateItems ? 'translate-y-0' : 'translate-y-4'} hover:-translate-y-1`}
                    style={{ transition: 'opacity 0.5s ease, transform 0.5s ease' }}
                    onClick={() => openProductModal(product)}
                  >
                    <div className="relative overflow-hidden h-64">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {product.inStock === false && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Out of Stock
                        </div>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, product.id)}
                        className="absolute top-2 left-2 bg-white bg-opacity-70 p-2 rounded-full shadow-md hover:bg-amber-100 transition-colors"
                        aria-label={favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 ${favorites.includes(product.id) ? 'text-amber-500 fill-current' : 'text-gray-400'}`} 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          fill="none"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={favorites.includes(product.id) ? 0 : 2} 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => showQuickView(e, product)}
                        className="absolute bottom-2 right-2 bg-white bg-opacity-70 p-2 rounded-full shadow-md hover:bg-amber-100 transition-colors"
                        aria-label="Quick view"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="font-medium">Click to view details</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-xl mb-1 text-amber-900 group-hover:text-amber-600 transition-colors">{product.name}</h3>
                      <p className="text-amber-700 mb-2">{product.weight}</p>
                      {product.category && (
                        <span className="inline-block mt-2 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className={`flex flex-col md:flex-row bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${animateItems ? 'opacity-100' : 'opacity-0'} ${animateItems ? 'translate-y-0' : 'translate-y-4'}`}
                    style={{ transition: 'opacity 0.5s ease, transform 0.5s ease' }}
                    onClick={() => openProductModal(product)}
                  >
                    <div className="relative md:w-1/4 h-64 md:h-auto">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {product.inStock === false && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Out of Stock
                        </div>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, product.id)}
                        className="absolute top-2 left-2 bg-white bg-opacity-70 p-2 rounded-full shadow-md hover:bg-amber-100 transition-colors"
                        aria-label={favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 ${favorites.includes(product.id) ? 'text-amber-500 fill-current' : 'text-gray-400'}`} 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          fill="none"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={favorites.includes(product.id) ? 0 : 2} 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-2xl mb-2 text-amber-900">{product.name}</h3>
                          <p className="text-amber-700 font-medium">{product.weight}</p>
                        </div>
                        {product.description && (
                          <p className="text-gray-600 mb-4">{product.description}</p>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        {product.category && (
                          <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded">
                            {product.category}
                          </span>
                        )}
                        <button 
                          className="text-amber-600 hover:text-amber-800 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProductModal(product);
                          }}
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Product Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeProductModal}>
            <div 
              className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-grow overflow-auto">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/2 h-64 md:h-auto relative">
                    {selectedProduct.imageUrl ? (
                      <img
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                    <div className="w-full h-full min-h-64 flex items-center justify-center bg-amber-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {selectedProduct.inStock === false && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                        Out of Stock
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, selectedProduct.id)}
                      className="absolute top-4 left-4 bg-white bg-opacity-70 p-2 rounded-full shadow-md hover:bg-amber-100 transition-colors"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-6 w-6 ${favorites.includes(selectedProduct.id) ? 'text-amber-500 fill-current' : 'text-gray-400'}`} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        fill="none"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={favorites.includes(selectedProduct.id) ? 0 : 2} 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6 md:w-1/2">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="font-bold text-2xl text-amber-900">{selectedProduct.name}</h2>
                      <button
                        onClick={closeProductModal}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-center mb-4">
                        <span className="font-medium text-amber-800 mr-2">Weight:</span>
                        <span className="text-lg">{selectedProduct.weight || 'Not specified'}</span>
                      </div>
                      
                      <div className="flex items-center mb-4">
                        <span className="font-medium text-amber-800 mr-2">Category:</span>
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded">
                          {selectedProduct.category || 'Uncategorized'}
                        </span>
                      </div>
                      
                      <div className="flex items-center mb-4">
                        <span className="font-medium text-amber-800 mr-2">Status:</span>
                        <span className={`px-3 py-1 rounded ${selectedProduct.inStock === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {selectedProduct.inStock === false ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                    
                    {selectedProduct.description && (
                      <div className="mb-6">
                        <h3 className="font-medium text-amber-800 mb-2">Description</h3>
                        <p className="text-gray-700">{selectedProduct.description}</p>
                      </div>
                    )}
                    
                    <div className="mt-8">
                      <button
                        onClick={(e) => showCalculator(e, selectedProduct)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Calculate Price
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick View Modal */}
        {isQuickViewVisible && quickViewProduct && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 p-4"
            onClick={hideQuickView}
          >
            <div 
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-amber-900">{quickViewProduct.name}</h3>
                <button 
                  onClick={hideQuickView}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <div className="font-medium text-amber-800 mb-1">Weight</div>
                <div>{quickViewProduct.weight || 'Not specified'}</div>
              </div>
              
              {quickViewProduct.description && (
                <div className="mb-4">
                  <div className="font-medium text-amber-800 mb-1">Description</div>
                  <div className="text-sm text-gray-600">{quickViewProduct.description}</div>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={(e) => toggleFavorite(e, quickViewProduct.id)}
                  className="flex items-center text-amber-600 hover:text-amber-800"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 mr-1 ${favorites.includes(quickViewProduct.id) ? 'text-amber-500 fill-current' : ''}`} 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    fill="none"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={favorites.includes(quickViewProduct.id) ? 0 : 2} 
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                    />
                  </svg>
                  {favorites.includes(quickViewProduct.id) ? 'Remove from favorites' : 'Add to favorites'}
                </button>
              
                <button
                  onClick={() => {
                    hideQuickView();
                    openProductModal(quickViewProduct);
                  }}
                  className="text-amber-600 hover:text-amber-800 font-medium"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gold Price Calculator Modal */}
        {isCalculatorVisible && calculatorProduct && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={hideCalculator}
          >
            <div 
              className="bg-white rounded-xl overflow-hidden max-w-lg w-full" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center bg-amber-100 p-4">
                <h3 className="font-bold text-xl text-amber-900">Gold Price Calculator</h3>
                <button 
                  onClick={hideCalculator}
                  className="text-amber-800 hover:text-amber-950"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="font-medium text-amber-900 mb-2">Selected Item</h4>
                  <div className="flex items-center bg-amber-50 p-3 rounded-lg">
                    {calculatorProduct.imageUrl && (
                      <img 
                        src={calculatorProduct.imageUrl} 
                        alt={calculatorProduct.name} 
                        className="w-16 h-16 object-cover rounded-md mr-4"
                      />
                    )}
                    <div>
                      <div className="font-medium">{calculatorProduct.name}</div>
                      <div className="text-sm text-amber-700">{calculatorProduct.weight}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-amber-800 mb-2">
                    Current Gold Rate (per gram)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-amber-300 bg-amber-50 text-amber-800">
                      $
                    </span>
                    <input
                      type="number"
                      value={goldRate}
                      onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-amber-500 focus:border-amber-500 border border-amber-300"
                      placeholder="Enter current gold rate"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-amber-800 mb-2">
                    Making Charges (%)
                  </label>
                  <input
                    type="number"
                    value={makingCharge}
                    onChange={(e) => setMakingCharge(parseFloat(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter making charge percentage"
                  />
                </div>
                
                {calculatorProduct.weight && goldRate > 0 && (
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                    <h4 className="font-medium text-amber-900 mb-3">Price Estimation</h4>
                    
                    {(() => {
                      const priceDetails = calculatePrice(calculatorProduct.weight);
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-amber-800">Gold Value:</span>
                            <span className="font-medium">${priceDetails.basePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-800">Making Charges ({makingCharge}%):</span>
                            <span className="font-medium">${priceDetails.makingChargeAmount.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-amber-200 my-2 pt-2 flex justify-between">
                            <span className="font-bold text-amber-900">Estimated Price:</span>
                            <span className="font-bold text-amber-900">${priceDetails.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-amber-700 mt-2">
                            * This is an estimate based on the provided information.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}