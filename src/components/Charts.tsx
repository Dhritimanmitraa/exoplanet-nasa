import { useState, useEffect } from 'react';
import { Planet } from '../lib/filters';
// orbital utilities imported when needed for advanced charts; kept minimal here

interface ChartsProps {
  planets: Planet[];
  onViewIn3D?: (planet: Planet) => void;
  onComparePlanets?: (planets: Planet[]) => void;
}

const Charts: React.FC<ChartsProps> = ({ planets, onViewIn3D, onComparePlanets }) => {
  const [discoveryData, setDiscoveryData] = useState<{year: number, count: number}[]>([]);
  const [methodData, setMethodData] = useState<{method: string, count: number}[]>([]);
  const [sizeData, setSizeData] = useState<{category: string, count: number}[]>([]);
  const [orbitalPeriodData, setOrbitalPeriodData] = useState<{bucket: string, count: number}[]>([]);
  const [irradianceData, setIrradianceData] = useState<{bucket: string, count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (planets.length === 0) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    
    // Simulate processing time for large datasets
    const processData = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));

      // Discovery year distribution
      const yearCounts: {[key: number]: number} = {};
      planets.forEach(planet => {
        const year = planet.discoveryyear;
        if (year && year >= 1995) { // Focus on modern exoplanet discoveries
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      });
      
      const yearData = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year);
      setDiscoveryData(yearData);

      // Discovery method distribution
      const methodCounts: {[key: string]: number} = {};
      planets.forEach(planet => {
        const method = planet.discoverymethod;
        if (method) {
          methodCounts[method] = (methodCounts[method] || 0) + 1;
        }
      });

      const methodDataSorted = Object.entries(methodCounts)
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6 methods
      setMethodData(methodDataSorted);

      // Planet size categories
      const sizeCounts = {
        'Sub-Earth': 0,
        'Earth-like': 0,
        'Super-Earth': 0,
        'Neptune-like': 0,
        'Jupiter-like': 0,
        'Unknown': 0
      };

      planets.forEach(planet => {
        const radius = planet.pl_rade;
        if (!radius) {
          sizeCounts['Unknown']++;
        } else if (radius < 0.8) {
          sizeCounts['Sub-Earth']++;
        } else if (radius <= 1.25) {
          sizeCounts['Earth-like']++;
        } else if (radius <= 2.0) {
          sizeCounts['Super-Earth']++;
        } else if (radius <= 6.0) {
          sizeCounts['Neptune-like']++;
        } else {
          sizeCounts['Jupiter-like']++;
        }
      });

      const sizeDataArray = Object.entries(sizeCounts)
        .map(([category, count]) => ({ category, count }))
        .filter(item => item.count > 0);
      setSizeData(sizeDataArray);

      // Orbital period buckets
      const periodBuckets: {[k: string]: number} = { '<2d':0, '2-10d':0, '10-100d':0, '100-365d':0, '>365d':0 };
      planets.forEach(p => {
        const d = p.pl_orbper;
        if (!d) return;
        if (d < 2) periodBuckets['<2d']++;
        else if (d < 10) periodBuckets['2-10d']++;
        else if (d < 100) periodBuckets['10-100d']++;
        else if (d < 365) periodBuckets['100-365d']++;
        else periodBuckets['>365d']++;
      });
      setOrbitalPeriodData(Object.entries(periodBuckets).map(([bucket,count]) => ({ bucket, count })));

      // Irradiance buckets (insolation)
      const irrBuckets: {[k: string]: number} = { '<0.5x':0, '0.5-1x':0, '1-5x':0, '5-50x':0, '>50x':0 };
      planets.forEach(p => {
        const s = p.pl_insol;
        if (s == null) return;
        if (s < 0.5) irrBuckets['<0.5x']++;
        else if (s < 1) irrBuckets['0.5-1x']++;
        else if (s < 5) irrBuckets['1-5x']++;
        else if (s < 50) irrBuckets['5-50x']++;
        else irrBuckets['>50x']++;
      });
      setIrradianceData(Object.entries(irrBuckets).map(([bucket,count]) => ({ bucket, count })));

      setIsLoading(false);
    };

    processData();
  }, [planets]);

  const maxDiscoveries = Math.max(...discoveryData.map(d => d.count));
  const maxMethodCount = Math.max(...methodData.map(d => d.count));
  const maxSizeCount = Math.max(...sizeData.map(d => d.count));

  const getBarColor = (index: number, total: number) => {
    const hue = (index / total) * 360;
    return `hsl(${hue}, 65%, 55%)`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-6 sm:space-y-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">📊 Data Insights</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-purple mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing exoplanet data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Discovery Timeline */}
          <div className="animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-3 sm:mb-4">Exoplanet Discoveries Over Time</h3>
            {discoveryData.length > 0 ? (
              <div className="space-y-2">
                {discoveryData.map((item) => (
                  <div key={item.year} className="flex items-center">
                    <div className="w-16 text-sm text-gray-600 font-medium">{item.year}</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-4 sm:h-6 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cosmic-purple to-space-blue h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${(item.count / maxDiscoveries) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-gray-700 font-semibold text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No discovery year data available</p>
            )}
          </div>

          {/* Discovery Methods */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 sm:mb-4">Discovery Methods</h3>
            {methodData.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {methodData.map((item, index) => (
                  <div key={item.method} className="flex items-center">
                    <div className="w-24 sm:w-32 text-xs sm:text-sm text-gray-600 font-medium truncate">{item.method}</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-4 sm:h-6 relative overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${(item.count / maxMethodCount) * 100}%`,
                            backgroundColor: getBarColor(index, methodData.length),
                            animationDelay: `${index * 0.1}s`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-gray-700 font-semibold text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No discovery method data available</p>
            )}
          </div>

          {/* Size Distribution */}
          <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 sm:mb-4">Planet Size Distribution</h3>
            {sizeData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {sizeData.map((item, index) => (
                  <div key={item.category} className="text-center">
                    <div className="relative">
                      <div className="bg-gray-200 rounded-lg h-16 sm:h-20 flex items-end justify-center p-2">
                        <div
                          className="rounded transition-all duration-1000 ease-out"
                          style={{
                            height: `${(item.count / maxSizeCount) * 100}%`,
                            width: '60%',
                            backgroundColor: getBarColor(index, sizeData.length),
                            minHeight: '8px',
                            animationDelay: `${index * 0.1 + 0.5}s`
                          }}
                        ></div>
                      </div>
                      <div className="absolute top-1 right-1 text-xs font-bold text-white bg-black bg-opacity-50 rounded px-1">
                        {item.count}
                      </div>
                    </div>
                    <div className="mt-2 text-xs sm:text-sm font-medium text-gray-700">{item.category}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No size data available</p>
            )}
          </div>

          {/* Orbital Characteristics */}
          <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 sm:mb-4">Orbital Characteristics</h3>
            {orbitalPeriodData.length > 0 ? (
              <div className="space-y-2">
                {orbitalPeriodData.map((item) => (
                  <div key={item.bucket} className="flex items-center">
                    <div className="w-20 text-xs sm:text-sm text-gray-600 font-medium">{item.bucket}</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-4 sm:h-5 relative overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out bg-space-blue" style={{ width: `${(item.count / Math.max(1, Math.max(...orbitalPeriodData.map(d => d.count)))) * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="w-10 text-xs sm:text-sm text-gray-700 font-semibold text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No orbital period data</p>
            )}
          </div>

          {/* Stellar Irradiance */}
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 sm:mb-4">Stellar Irradiance (× Earth)</h3>
            {irradianceData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {irradianceData.map((item) => (
                  <div key={item.bucket} className="text-center">
                    <div className="bg-gray-200 rounded-lg h-14 flex items-end justify-center p-2">
                      <div className="rounded transition-all duration-1000 ease-out bg-cosmic-purple" style={{ height: `${(item.count / Math.max(1, Math.max(...irradianceData.map(d => d.count)))) * 100}%`, width: '60%', minHeight: '8px' }}></div>
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-medium text-gray-700">{item.bucket}</div>
                    <div className="text-xs text-gray-600">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No irradiance data</p>
            )}
          </div>

          {/* Summary Stats */}
          <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200" style={{ animationDelay: '0.6s' }}>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-cosmic-purple">{planets.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Planets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-space-blue">
                {new Set(planets.map(p => p.hostname).filter(Boolean)).size}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Host Stars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-stellar-gold">
                {planets.filter(p => p.pl_rade && p.pl_rade >= 0.8 && p.pl_rade <= 1.25).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Earth-sized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {planets.filter(p => p.pl_eqt && p.pl_eqt >= 273 && p.pl_eqt <= 373).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Habitable Temp</div>
            </div>
          </div>

          {(onViewIn3D || onComparePlanets) && (
            <div className="pt-2 border-t border-gray-200 flex gap-2">
              {onViewIn3D && (
                <button
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                  onClick={() => { const p = planets.find(p => p.image) || planets[0]; if (p) onViewIn3D(p); }}
                >View random in 3D</button>
              )}
              {onComparePlanets && planets.length >= 2 && (
                <button
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                  onClick={() => onComparePlanets(planets.slice(0, 2))}
                >Compare two</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Charts;
