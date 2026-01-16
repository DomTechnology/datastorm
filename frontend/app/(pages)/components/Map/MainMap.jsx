"use client";

import Map, { Layer, Source, useMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import { useGlobalLoading } from "../../../context/loadingContext";
import { useFilterStore } from "@/app/store/useFilterStore";

export const MainMap = () => {
  const [zoom, setZoom] = useState(2);
  const [storePoints, setStorePoints] = useState([]);

  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  const { startLoading, stopLoading, isLoading } = useGlobalLoading();

  useEffect(() => {
    const fetchData = async () => {
      startLoading();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/net_sales/location?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`)
        .then((response) => response.json())
        .then((data) => {
          setStorePoints(data);
          stopLoading();
        });
    };
    fetchData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const { current: map } = useMap();
  useEffect(() => {
    if (!map || storePoints?.features?.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    storePoints.features.forEach((f) => {
      bounds.extend(f.geometry.coordinates);
    });

    map.fitBounds(bounds, {
      padding: 60,
      maxZoom: 8,
    });
  }, [storePoints]);

  return (
    <>
      {storePoints?.features?.length > 0 && (
        <Map
          initialViewState={{
            longitude: 10,
            latitude: 47,
            zoom: zoom,
          }}
          maxBounds={[
            [-25, 34],
            [45, 72],
          ]}
          minZoom={3}
          maxZoom={10}
          style={{ width: "100%", height: "100%" }}
          mapStyle={`https://api.maptiler.com/maps/topo-v4/style.json?key=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`}
          zoom={zoom}
          onZoom={(e) => setZoom(e.viewState.zoom)}
        >
          <Source id="stores" type="geojson" data={storePoints}>
            <Layer
              id="store-scatter"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "net_sales"],
                  0,
                  4,
                  1_000_000,
                  22,
                ],
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "stock_out_rate"],
                  0,
                  "#22c55e",
                  0.5,
                  "#f97316",
                  1,
                  "#ef4444",
                ],
                "circle-opacity": 0.75,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
          <Source
            id="maptiler-v4"
            type="vector"
            url={`https://api.maptiler.com/tiles/v4/tiles.json?key=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`}
          >
            <Layer
              id="road-overlay"
              type="line"
              source-layer="building"
              paint={{
                "line-color": "#000",
                "line-width": 0.2,
              }}
            />
          </Source>
        </Map>
      )}
    </>
  );
};
