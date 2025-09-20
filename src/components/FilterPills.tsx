import React from 'react';

export type FilterType = 'all' | 'earthlike' | 'weird' | 'closest';

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterPills: React.FC<FilterPillsProps> = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { 
      id: 'all' as const, 
      label: 'All Planets', 
      emoji: '🌍',
      tooltip: 'Show all discovered exoplanets'
    },
    { 
      id: 'earthlike' as const, 
      label: 'Earth-like', 
      emoji: '🌎',
      tooltip: 'Planets with Earth-like size and potentially habitable conditions'
    },
    { 
      id: 'weird' as const, 
      label: 'Weird Worlds', 
      emoji: '👽',
      tooltip: 'Unusual planets with extreme conditions'
    },
    { 
      id: 'closest' as const, 
      label: 'Nearby', 
      emoji: '⭐',
      tooltip: 'Closest exoplanets to our solar system'
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 p-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          title={filter.tooltip}
          className={'pill-btn px-4 py-3 rounded-full text-sm font-medium flex items-center gap-2 min-h-[44px] ' +
            (activeFilter === filter.id
              ? 'pill-active'
              : 'pill-inactive'
            )}
        >
          <span className="text-lg">{filter.emoji}</span>
          <span>{filter.label}</span>
          {activeFilter === filter.id && (
            <span className="ml-1 text-xs opacity-75">✓</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default FilterPills;
