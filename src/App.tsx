import React, { useState, useEffect } from 'react';
import {
  Search, Bus, Info, ArrowRight, Map as MapIcon, Download
} from 'lucide-react';
import {
  MapContainer, TileLayer, GeoJSON, useMap, LayersControl, Marker, Popup
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const startIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149060.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapUpdater({ geojson }: { geojson: any }) {
  const map = useMap();

  useEffect(() => {
    if (geojson) {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      map.fitBounds(bounds);
    }
  }, [geojson, map]);

  return null;
}

function App() {
  const [routeNumber, setRouteNumber] = useState('');
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<any>(null);
  const [shapeData, setShapeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchRoute = async () => {
    if (!routeNumber.trim()) {
      setError('Por favor, insira o número da rota.');
      return;
    }

    setLoading(true);
    setError('');
    setRouteDetails(null);
    setSelectedPattern(null);
    setShapeData(null);
    setPatterns([]);

    try {
      const response = await fetch(`https://api.carrismetropolitana.pt/lines/${routeNumber}`);
      if (!response.ok) throw new Error('Rota não encontrada');
      const data = await response.json();

      setRouteDetails({
        short_name: data.short_name,
        long_name: data.long_name,
        municipalities: data.municipalities,
        localities: data.localities,
        patterns: data.patterns,
        routes: data.routes,
      });

      const patternsData = await Promise.all(
        data.patterns.map(async (patternId: string) => {
          const patternResponse = await fetch(`https://api.carrismetropolitana.pt/patterns/${patternId}`);
          if (!patternResponse.ok) throw new Error(`Erro ao carregar o padrão ${patternId}`);
          const patternData = await patternResponse.json();

          const routeResponse = await fetch(`https://api.carrismetropolitana.pt/routes/${patternData.route_id}`);
          if (!routeResponse.ok) throw new Error(`Erro ao carregar a rota ${patternData.route_id}`);
          const routeData = await routeResponse.json();

          return {
            ...patternData,
            route_long_name: routeData.long_name,
            long_name: routeData.long_name,
          };
        })
      );

      setPatterns(patternsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar rota');
    } finally {
      setLoading(false);
    }
  };

  const fetchPattern = async (pattern: any) => {
    try {
      setSelectedPattern(pattern);

      const shapeResponse = await fetch(`https://api.carrismetropolitana.pt/shapes/${pattern.shape_id}`);
      if (!shapeResponse.ok) throw new Error('Erro ao carregar o shape');
      const shapeData = await shapeResponse.json();
      setShapeData(shapeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do padrão');
    }
  };

  const downloadGPX = async () => {
    if (!selectedPattern || !shapeData || !routeDetails) {
      setError('Nenhum padrão selecionado ou dados de forma indisponíveis.');
      return;
    }

    try {
      // 1. Cria a string GPX com possíveis espaços no início de linha
let gpxRaw = `
<?xml version="1.0" encoding="UTF-8"?>
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
</gpx>
`;

// 2. Limpa os espaços no início de cada linha (inclusive XML e trkpt)
const gpxData = gpxRaw
  .split('\n')                    // separa linha por linha
  .map(line => line.trimStart()) // remove os espaços no começo de cada linha
  .join('\n');                    // junta de novo numa única string



      const blob = new Blob([gpxData.trimStart()], { type: 'application/gpx+xml' });
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bus className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Carris Metropolitana</h1>
          </div>
          <p className="text-gray-600 text-lg">Sistema de Consulta de Rotas</p>
        </div>

        <div className="max-w-xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={routeNumber}
                onChange={(e) => setRouteNumber(e.target.value)}
                placeholder="Digite o número da rota"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={searchRoute}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
                <Info className="inline mr-2" /> {error}
              </div>
            )}
          </div>
        </div>

        {routeDetails && (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold">Rota {routeDetails.short_name}</h2>
            <p className="text-gray-600">{routeDetails.long_name}</p>

            <h3 className="mt-6 mb-3 font-medium text-lg flex items-center gap-2">
              <MapIcon className="text-blue-600" /> Selecionar percurso/destino
            </h3>
            <div className="grid gap-3">
              {patterns.map((pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => fetchPattern(pattern)}
                  className={`text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedPattern?.id === pattern.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{routeDetails.short_name} - {pattern.headsign}</p>
                    <ArrowRight />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 relative">
              <div className="h-[400px] w-full rounded-lg border overflow-hidden">
                <MapContainer center={[38.736946, -9.142685]} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Mapa">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satélite">
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='&copy; Esri'
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>

                  {shapeData && <GeoJSON key={selectedPattern?.id} data={shapeData.geojson} />}
                  {shapeData && <MapUpdater geojson={shapeData.geojson} />}

                  {shapeData && (
                    <>
                      <Marker
                        position={[
                          shapeData.geojson.geometry.coordinates[0][1],
                          shapeData.geojson.geometry.coordinates[0][0],
                        ]}
                        icon={startIcon}
                      >
                        <Popup>Origem</Popup>
                      </Marker>
                      <Marker
                        position={[
                          shapeData.geojson.geometry.coordinates.at(-1)[1],
                          shapeData.geojson.geometry.coordinates.at(-1)[0],
                        ]}
                        icon={endIcon}
                      >
                        <Popup>Destino</Popup>
                      </Marker>
                    </>
                  )}
                </MapContainer>
              </div>

              {selectedPattern && (
                <button
                  onClick={downloadGPX}
                  className="absolute bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" /> Baixar GPX
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

