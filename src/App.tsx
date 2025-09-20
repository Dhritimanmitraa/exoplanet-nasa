import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './lib/auth';
import { analyticsManager } from './lib/analytics-manager';
import { performanceManager } from './lib/performance-manager';
import { accessibilityManager } from './lib/accessibility-manager';
import { serviceWorkerManager } from './lib/service-worker-manager';
import FilterPills, { FilterType } from './components/FilterPills';
import PlanetCard from './components/PlanetCard';
import PlanetDetail from './components/PlanetDetail';
import Timeline from './components/Timeline';
import Charts from './components/Charts';
import { Planet, filterEarthLike, filterWeird, filterClosest, getRandomPlanet } from './lib/filters';
import { NarrativeContext } from './lib/narrator';
import { useCallback } from 'react';
import { onCLS, onFID, onLCP, onTTFB, onFCP } from 'web-vitals';
import * as Sentry from '@sentry/react';
import { useIdle } from './lib/use-idle';

function AppShell() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [filteredPlanets, setFilteredPlanets] = useState<Planet[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'timeline' | 'charts'>('home');
  const [loading, setLoading] = useState(true);
  const [randomPlanet, setRandomPlanet] = useState<Planet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const { isIdle } = useIdle(Number((import.meta as any).env.VITE_KIOSK_IDLE_MS) || 60000);

  useEffect(() => {
    performanceManager.init();
    void analyticsManager.init();
    accessibilityManager.init();
    void serviceWorkerManager.init();
    // Sentry init if DSN present
    const dsn = (import.meta as any).env.VITE_SENTRY_DSN;
    if (dsn) {
      try { Sentry.init({ dsn, tracesSampleRate: 0.1 }); } catch {}
    }
    // Web vitals
    onCLS((m) => { void analyticsManager.trackPerformance('cls', m.value); });
    onFID((m) => { void analyticsManager.trackPerformance('fid', m.value); });
    onLCP((m) => { void analyticsManager.trackPerformance('lcp', m.value); });
    onTTFB((m) => { void analyticsManager.trackPerformance('ttfb', m.value); });
    onFCP((m) => { void analyticsManager.trackPerformance('fcp', m.value); });
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '1':
          setCurrentView('home');
          break;
        case '2':
          setCurrentView('timeline');
          break;
        case '3':
          setCurrentView('charts');
          break;
        case 'a':
          setActiveFilter('all');
          break;
        case 'e':
          setActiveFilter('earthlike');
          break;
        case 'w':
          setActiveFilter('weird');
          break;
        case 'c':
          setActiveFilter('closest');
          break;
        case 'r':
          if (randomPlanet && currentView === 'home') {
            generateNewRandomPlanet();
          }
          break;
        case 'escape':
          if (showKeyboardHelp) {
            setShowKeyboardHelp(false);
          } else if (isDetailOpen) {
            setIsDetailOpen(false);
          } else if (searchQuery) {
            setSearchQuery('');
          }
          break;
        case '/':
          e.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(!showKeyboardHelp);
          break;
        case ' ': // Space toggles narration
        case 'v':
          {
            const ev = new CustomEvent('exo-voice-key', { detail: { action: 'toggle' } });
            window.dispatchEvent(ev);
          }
          break;
        case 'm':
          {
            const ev = new CustomEvent('exo-voice-key', { detail: { action: 'mute-toggle' } });
            window.dispatchEvent(ev);
          }
          break;
        case 't':
          {
            const ev = new CustomEvent('exo-voice-key', { detail: { action: 'tour-toggle' } });
            window.dispatchEvent(ev);
          }
          break;
        case '+':
        case '=': // allow '=' as plus without shift
          {
            const ev = new CustomEvent('exo-voice-key', { detail: { action: 'volume-up' } });
            window.dispatchEvent(ev);
          }
          break;
        case '-':
          {
            const ev = new CustomEvent('exo-voice-key', { detail: { action: 'volume-down' } });
            window.dispatchEvent(ev);
          }
          break;
        case 's':
          {
            const ev = new CustomEvent('exo-voice-key', { detail: { action: 'stop' } });
            window.dispatchEvent(ev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [randomPlanet, currentView, isDetailOpen, searchQuery, showKeyboardHelp]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/planets.min.json`)
      .then(response => response.json())
      .then((data: Planet[]) => {
        setPlanets(data);
        setFilteredPlanets(data);
        setRandomPlanet(getRandomPlanet(data));
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading planets:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (planets.length === 0) return;

    let filtered: Planet[];
    
    // First apply filter
    switch (activeFilter) {
      case 'earthlike':
        filtered = filterEarthLike(planets);
        break;
      case 'weird':
        filtered = filterWeird(planets);
        break;
      case 'closest':
        filtered = filterClosest(planets);
        break;
      default:
        filtered = planets;
    }

    // Then apply search if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(planet => 
        planet.pl_name?.toLowerCase().includes(query) ||
        planet.hostname?.toLowerCase().includes(query) ||
        planet.discoverymethod?.toLowerCase().includes(query) ||
        planet.disc_facility?.toLowerCase().includes(query)
      );
    }

    setFilteredPlanets(filtered);
  }, [activeFilter, planets, searchQuery]);

  const handlePlanetClick = (planet: Planet) => {
    setSelectedPlanet(planet);
    setIsDetailOpen(true);
  };

  const getContextFromFilter = (filter: FilterType): NarrativeContext => {
    switch (filter) {
      case 'earthlike': return 'earthlike';
      case 'weird': return 'weird';
      case 'closest': return 'closest';
      default: return 'random';
    }
  };

  const generateNewRandomPlanet = () => {
    setRandomPlanet(getRandomPlanet(planets));
  };

  useEffect(() => {
    if (isIdle) {
      setIsDetailOpen(false);
      setSelectedPlanet(null);
      setActiveFilter('all');
      setSearchQuery('');
      void analyticsManager.track('session_reset');
    }
  }, [isIdle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-dark via-space-blue to-cosmic-purple flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stellar-gold mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">ExoArchive Pocket</h2>
          <p className="text-lg opacity-90">Loading cosmic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {isIdle && (<div className="kiosk-screensaver active"><div>Tap to begin a new journey</div></div>)}
      {/* Header */}
      <header className="bg-gradient-to-r from-space-dark to-space-blue text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-3 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">🌟 ExoArchive Pocket</h1>
              <p className="text-blue-200 text-sm sm:text-base">Discover exoplanets and space heritage</p>
              <p className="text-blue-300 text-xs mt-1">Press ? for keyboard shortcuts</p>
            </div>
            <nav className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setCurrentView('home')}
                className={'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ' +
                  (currentView === 'home' ? 'bg-white text-space-blue' : 'text-white hover:bg-white/20')}
              >
                Planets
              </button>
              <button
                onClick={() => setCurrentView('timeline')}
                className={'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ' +
                  (currentView === 'timeline' ? 'bg-white text-space-blue' : 'text-white hover:bg-white/20')}
              >
                Timeline
              </button>
              <button
                onClick={() => setCurrentView('charts')}
                className={'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ' +
                  (currentView === 'charts' ? 'bg-white text-space-blue' : 'text-white hover:bg-white/20')}
              >
                Charts
              </button>
              {/* Theme toggle */}
              <ThemeToggle />
              <a href="/admin" className="px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-white hover:bg-white/20">Admin</a>
            </nav>
          </div>
        </div>
      </header>

      {currentView === 'timeline' ? (
        <Timeline />
      ) : currentView === 'charts' ? (
        <Charts planets={planets} />
      ) : (
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6">
            <FilterPills activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6 p-3 sm:p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search planets, stars, or discovery methods..."
                className="block w-full pl-10 pr-10 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-cosmic-purple focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Random Planet Showcase */}
          {randomPlanet && activeFilter === 'all' && (
            <div className="bg-gradient-to-r from-cosmic-purple to-space-blue text-white rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">🎲 Random Discovery</h2>
                  <h3 className="text-lg sm:text-xl mb-2">{randomPlanet.pl_name}</h3>
                  <p className="text-blue-100 mb-4 text-sm sm:text-base">
                    Orbiting {randomPlanet.hostname || 'its star'} • 
                    Discovered in {randomPlanet.discoveryyear || 'unknown year'} • 
                    {randomPlanet.sy_dist ? `${randomPlanet.sy_dist.toFixed(1)} parsecs away` : 'Distance unknown'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handlePlanetClick(randomPlanet)}
                      className="cta-primary"
                    >
                      Explore This World
                    </button>
                    <button
                      onClick={generateNewRandomPlanet}
                      className="cta-secondary"
                    >
                      🎲 New Random
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="mb-4">
            <p className="text-gray-600">
              {searchQuery.trim() ? (
                `Found ${filteredPlanets.length} planets matching "${searchQuery}"`
              ) : filteredPlanets.length === planets.length ? (
                `Showing all ${planets.length} planets`
              ) : (
                `Found ${filteredPlanets.length} planets matching filter`
              )}
              {searchQuery.trim() && activeFilter !== 'all' && ` (${activeFilter} filter applied)`}
            </p>
          </div>

          {/* Planet Grid */}
          {filteredPlanets.length > 0 ? (
            <div className="planet-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {filteredPlanets.slice(0, 9).map((planet) => (
                <PlanetCard
                  key={planet.pl_name}
                  planet={planet}
                  onClick={() => handlePlanetClick(planet)}
                  filterType={activeFilter}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No planets found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filter or explore all planets to discover amazing worlds.
              </p>
              <button
                onClick={() => setActiveFilter('all')}
                className="bg-cosmic-purple text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Show All Planets
              </button>
            </div>
          )}
        </main>
      )}

      {/* Planet Detail Modal */}
      <PlanetDetail
        planet={selectedPlanet}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        context={getContextFromFilter(activeFilter)}
        allPlanets={planets}
      />

      {/* Footer */}
      <footer className="bg-space-dark text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">ExoArchive Pocket</h3>
            <p className="text-gray-300 mb-4">
              Exploring the cosmos, one planet at a time.
            </p>
            <p className="text-sm text-gray-400">
              Data sourced from NASA Exoplanet Archive  Built with React + TypeScript
            </p>
          </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">⌨️ Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-gray-700 mb-2">Navigation</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Planets</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">1</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">2</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Charts</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">3</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="font-bold text-gray-700 mb-2">Filters</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>All</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">A</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Earth-like</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">E</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Weird</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">W</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Closest</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">C</kbd>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="font-bold text-gray-700 mb-2">Actions</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Search</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">/</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Random Planet</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Close/Clear</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">ESC</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>This Help</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">?</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutedApp(){
  const location = useLocation();
  useEffect(()=>{ void analyticsManager.track('route_view', { path: location.pathname }); }, [location.pathname]);
  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };
  return (
    <Routes>
      <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoutedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}

function ThemeToggle(){
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try { return (localStorage.getItem('exo-theme') as 'light'|'dark') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch(e) { return 'light'; }
  });

  const toggle = useCallback(()=>{
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('exo-theme', next); } catch(e) {}
    document.documentElement.setAttribute('data-theme', next);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  useEffect(()=>{ // sync if system preference changed while running
    const m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!m) return;
    const handler = () => {
      try { const stored = localStorage.getItem('exo-theme'); if (!stored) { const p = m.matches ? 'dark' : 'light'; setTheme(p); document.documentElement.setAttribute('data-theme', p); } } catch(e){}
    };
    m.addEventListener?.('change', handler);
    return ()=> m.removeEventListener?.('change', handler);
  }, []);

  return (
    <button aria-label="Toggle theme" title="Toggle theme" onClick={toggle} className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center gap-2">
      {theme === 'dark' ? (
        // Sun Icon (light mode)
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
        </svg>
      ) : (
        // Moon icon (dark mode)
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
        </svg>
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

function Login(){
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (!ok) { setError('Invalid credentials'); return; }
    (window as any).location = '/admin';
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-space-dark via-space-blue to-cosmic-purple flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Login</h2>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <label className="block mb-2 text-sm text-gray-700">Username</label>
        <input className="w-full border border-gray-300 rounded px-3 py-2 mb-3" value={username} onChange={e=>setUsername(e.target.value)} />
        <label className="block mb-2 text-sm text-gray-700">Password</label>
        <input type="password" className="w-full border border-gray-300 rounded px-3 py-2 mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-cosmic-purple text-white py-2 rounded">Sign in</button>
      </form>
    </div>
  );
}

export default App;
