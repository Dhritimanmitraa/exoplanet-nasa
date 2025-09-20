import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearchResults: (results: any[]) => void;
  planets: any[];
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults, planets, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      onSearchResults(planets);
      return;
    }

    setIsSearching(true);
    
    // Simple fuzzy search without lunr for now
    const searchTerm = query.toLowerCase();
    const results = planets.filter(planet => 
      planet.pl_name?.toLowerCase().includes(searchTerm) ||
      planet.hostname?.toLowerCase().includes(searchTerm) ||
      planet.discoverymethod?.toLowerCase().includes(searchTerm) ||
      planet.disc_facility?.toLowerCase().includes(searchTerm)
    );

    setTimeout(() => {
      onSearchResults(results);
      setIsSearching(false);
    }, 100);
    
  }, [query, planets, onSearchResults]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search planets, stars, or discovery methods..."
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-cosmic-purple focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {isSearching && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cosmic-purple"></div>
        </div>
      )}
      
      {query && (
        <div className="absolute top-full left-0 right-0 mt-1 text-sm text-gray-500 bg-white px-3 py-1 rounded-lg shadow-sm">
          Press Enter to search • ESC to clear
        </div>
      )}
    </div>
  );
};

export default SearchBar;
