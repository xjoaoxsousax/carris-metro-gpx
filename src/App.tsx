import React, { useEffect, useState } from 'react';
import './App.css';

interface Route {
  route_id: string;
  short_name: string;
  long_name: string;
}

interface Pattern {
  pattern_id: string;
  headsign: string;
}

interface Shape {
  geojson: {
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number][];
    };
  };
}

function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [shapeData, setShapeData] = useState<Shape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);

  useEffect(() => {
    fetch('https://api.carrismetropolitana.pt/gtfs/routes')
      .then((res) => res.json())
      .then((data) => setRoutes(data))
      .catch((err) => setError('Erro ao carregar rotas.'));
  }, []);

  const handleRouteSelect = (routeId: string) => {
    const route = routes.find((r) => r.route_id === routeId) || null;
    setSelectedRoute(route);
    setSelectedPattern(null);
    setShapeData(null);
    setPatterns([]);

    if (route) {
      setRouteDetails(route);
      fetch(`https://api.carrismetropolitana.pt/gtfs/routes/${routeId}/patterns`)
        .then((res) => res.json())
        .then((data) => setPatterns(data))
        .catch((err) => setError('Erro ao carregar padrões.'));
    }
  };

  const handlePatternSelect = (patternId: string) => {
    const pattern = patterns.find((p) => p.pattern_id === patternId) || null;
    setSelectedPattern(pattern);
    setShapeData(null);

    if (pattern && selectedRoute) {
      fetch(
        `https://api.carrismetropolitana.pt/gtfs/routes/${selectedRoute.route_id}/patterns/${pattern.pattern_id}/shape`
      )
        .then((res) => res.json())
        .then((data) => setShapeData(data))
        .catch((err) => setError('Erro ao carregar forma da rota.'));
    }
  };

  const downloadGPX = async () => {
    if (!selectedPattern || !shapeData || !routeDetails) {
      setError('Nenhum padrão selecionado ou dados de forma indisponíveis.');
      return;
    }

    try {
      const gpxRaw = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Carris Metropolitana" version="1.1"
xmlns="http://www.topografix.com/GPX/1/1"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${selectedPattern.headsign}</name>
    <author>
      <name>Carris Metropolitana</name>
    </author>
  </metadata>
  <trk>
    <name>${selectedPattern.headsign}</name>
    <trkseg>
      ${shapeData.geojson.geometry.coordinates
        .map(
          (coord: [number, number]) =>
            `<trkpt lat="${coord[1]}" lon="${coord[0]}"></trkpt>`
        )
        .join('\n')}
    </trkseg>
  </trk>
</gpx>`;

      const gpxCleaned = gpxRaw
        .split('\n')
        .map((line) => line.trimStart())
        .join('\n')
        .trim(); // Remove espaços no início e fim do texto completo

      const blob = new Blob([gpxCleaned], { type: 'application/gpx+xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rota-${routeDetails.short_name}-${selectedPattern.headsign.replace(/\s+/g, '-')}.gpx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao gerar GPX:', err);
      setError('Erro ao gerar arquivo GPX');
    }
  };

  return (
    <div className="App">
      <h1>Rotas Carris Metropolitana</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        <label>Escolha uma rota:</label>
        <select onChange={(e) => handleRouteSelect(e.target.value)} value={selectedRoute?.route_id || ''}>
          <option value="">-- Selecione --</option>
          {routes.map((route) => (
            <option key={route.route_id} value={route.route_id}>
              {route.short_name} - {route.long_name}
            </option>
          ))}
        </select>
      </div>

      {patterns.length > 0 && (
        <div>
          <label>Escolha um sentido:</label>
          <select onChange={(e) => handlePatternSelect(e.target.value)} value={selectedPattern?.pattern_id || ''}>
            <option value="">-- Selecione --</option>
            {patterns.map((pattern) => (
              <option key={pattern.pattern_id} value={pattern.pattern_id}>
                {pattern.headsign}
              </option>
            ))}
          </select>
        </div>
      )}

      {shapeData && (
        <div>
          <h3>Pronto para baixar</h3>
          <button onClick={downloadGPX}>Baixar GPX</button>
        </div>
      )}
    </div>
  );
}

export default App;
