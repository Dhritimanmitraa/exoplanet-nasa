import React, { useState, useEffect } from 'react';

interface Mission {
  id: string;
  name: string;
  year: number;
  blurb: string;
  link: string;
}

const Timeline: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/missions.json')
      .then(response => response.json())
      .then((data: Mission[]) => {
        setMissions(data.sort((a, b) => b.year - a.year)); // Sort by year, newest first
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading missions:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-purple mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading mission timeline...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900">
        Space Exploration Timeline
      </h2>
      <p className="text-center text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base px-4">
        Key missions that have revolutionized our understanding of the cosmos and paved the way for exoplanet discovery.
      </p>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-cosmic-purple to-space-blue"></div>
        
        <div className="space-y-6 sm:space-y-8">
          {missions.map((mission, index) => (
            <div
              key={mission.id}
              className={`flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
            >
              {/* Year badge */}
              <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 bg-cosmic-purple text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold z-10">
                {mission.year}
              </div>
              
              {/* Mission card - use planet-card styles for consistent hover/animations */}
              <div className={`ml-10 sm:ml-12 md:ml-0 md:w-5/12 ${index % 2 === 0 ? 'md:mr-auto md:pr-6 lg:pr-8' : 'md:ml-auto md:pl-6 lg:pl-8'}`}>
                <div className="planet-card bg-white rounded-lg shadow-md transition-all duration-300 cursor-pointer p-4 sm:p-6 border border-gray-200 focus:outline-none">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {mission.name}
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                    {mission.blurb}
                  </p>
                  {mission.link && (
                    <a
                      href={mission.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-cosmic-purple hover:text-purple-700 font-medium text-sm transition-colors"
                    >
                      Learn More
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
