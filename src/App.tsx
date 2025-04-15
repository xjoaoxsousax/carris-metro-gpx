import React, { useEffect, useState } from "react";
import { View, Text, Button, ScrollView, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function App() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [shapeData, setShapeData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("https://api.carrismetropolitana.pt/gtfs/routes")
      .then((response) => response.json())
      .then((data) => setRoutes(data))
      .catch((error) => console.error("Erro ao buscar rotas:", error));
  }, []);

  useEffect(() => {
    if (!selectedRoute) return;
    setLoading(true);
    fetch(`https://api.carrismetropolitana.pt/gtfs/routes/${selectedRoute.route_id}/patterns`)
      .then((response) => response.json())
      .then((data) => {
        setPatterns(data);
        setSelectedPattern(null);
        setShapeData(null);
      })
      .catch((error) => console.error("Erro ao buscar padrões:", error))
      .finally(() => setLoading(false));
  }, [selectedRoute]);

  useEffect(() => {
    if (!selectedPattern) return;
    setLoading(true);
    fetch(`https://api.carrismetropolitana.pt/gtfs/shapes/${selectedPattern.shape_id}`)
      .then((response) => response.json())
      .then((data) => setShapeData(data))
      .catch((error) => console.error("Erro ao buscar shape:", error))
      .finally(() => setLoading(false));
  }, [selectedPattern]);

  const downloadGPX = () => {
    if (!shapeData) return;

    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Carris Metropolitana" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk>\n    <name>${selectedRoute?.short_name} - ${selectedPattern?.headsign}</name>\n    <trkseg>\n`;

    const gpxPoints = shapeData.geojson.geometry.coordinates
      .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
      .join("\n");

    const gpxFooter = `\n    </trkseg>\n  </trk>\n</gpx>`;

    const gpxContent = (gpxHeader + gpxPoints + gpxFooter).trimStart(); // remove espaços em branco do início

    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedRoute?.short_name}-${selectedPattern?.headsign}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Selecionar Rota:</Text>
      <Picker
        selectedValue={selectedRoute}
        onValueChange={(itemValue) => {
          const route = routes.find((r) => r.route_id === itemValue);
          setSelectedRoute(route);
        }}
      >
        <Picker.Item label="Escolha uma rota..." value={null} />
        {routes.map((route) => (
          <Picker.Item
            key={route.route_id}
            label={`${route.short_name} - ${route.long_name}`}
            value={route.route_id}
          />
        ))}
      </Picker>

      {selectedRoute && (
        <>
          <Text style={{ fontSize: 18, marginTop: 20 }}>Selecionar Padrão:</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <Picker
              selectedValue={selectedPattern}
              onValueChange={(itemValue) => {
                const pattern = patterns.find((p) => p.pattern_id === itemValue);
                setSelectedPattern(pattern);
              }}
            >
              <Picker.Item label="Escolha um padrão..." value={null} />
              {patterns.map((pattern) => (
                <Picker.Item
                  key={pattern.pattern_id}
                  label={`${pattern.headsign}`}
                  value={pattern.pattern_id}
                />
              ))}
            </Picker>
          )}
        </>
      )}

      {shapeData && (
        <View style={{ marginTop: 30 }}>
          <Button title="Download GPX" onPress={downloadGPX} />
        </View>
      )}
    </ScrollView>
  );
}
