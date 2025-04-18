"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Line,
  Cell,
} from "recharts";
import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  GeographyProps
} from "react-simple-maps";
import { formatCurrency } from "@/lib/currency";

// World map GeoJSON
const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

// New LocationHeatMap component
interface LocationHeatMapProps {
  cities: Array<{
    name: string;
    country: string;
    coordinates: [number, number];
    cost: number;
    currency: string;
  }>;
  baseCurrency: string;
}

export const LocationHeatMap = ({ cities, baseCurrency }: LocationHeatMapProps) => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({ 
    coordinates: [0, 0], 
    zoom: 1 
  });

  // Find min and max costs for scaling
  const costs = cities.map(city => city.cost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  
  // Scale marker size based on cost (inverse - cheaper places are bigger)
  const getMarkerSize = (cost: number) => {
    // Normalize and invert (cheaper = bigger marker)
    const normalized = (cost - minCost) / (maxCost - minCost);
    const inverted = 1 - normalized;
    // Scale between 5 and 15
    return 5 + (inverted * 10);
  };
  
  // Get color based on cost (green for cheaper, red for expensive)
  const getMarkerColor = (cost: number) => {
    // Normalize between 0 and 1
    const normalized = (cost - minCost) / (maxCost - minCost);
    // Green to red gradient
    const r = Math.floor(255 * normalized);
    const g = Math.floor(255 * (1 - normalized));
    return `rgb(${r}, ${g}, 0)`;
  };
  
  const handleZoom = (zoom: number) => {
    setPosition(pos => ({ ...pos, zoom }));
  };

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };

  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm p-2 rounded-md">
        <div className="text-xs font-medium mb-1">Cost Legend</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs">Lower Cost</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs">Higher Cost</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposableMap>
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#EAEAEC"
                    stroke="#D6D6DA"
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#F5F5F5" },
                      pressed: { outline: "none" }
                    }}
                  />
                ))
              }
            </Geographies>
            {cities.map(({ name, coordinates, cost, currency }) => (
              <Marker
                key={name}
                coordinates={coordinates}
                onMouseEnter={() => {
                  setTooltipContent(`${name}: ${formatCurrency(cost, currency)} (${formatCurrency(cost, baseCurrency)})`);
                }}
                onMouseLeave={() => {
                  setTooltipContent("");
                }}
              >
                <circle
                  r={getMarkerSize(cost)}
                  fill={getMarkerColor(cost)}
                  stroke="#FFF"
                  strokeWidth={1}
                  style={{ cursor: "pointer" }}
                />
                <text
                  textAnchor="middle"
                  y={-10}
                  style={{
                    fontFamily: "system-ui",
                    fill: "#5D5A6D",
                    fontSize: "8px",
                    cursor: "pointer",
                    pointerEvents: "none"
                  }}
                >
                  {name}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </ResponsiveContainer>
      {tooltipContent && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm p-2 rounded-md shadow-md text-xs">
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

interface ComparisonChartProps {
  data: any[];
  baseCurrency: string;
}

export const ComparisonChart = ({ data, baseCurrency }: ComparisonChartProps) => {
  // Get all city names from the first item in data
  const cities = data.length > 0 
    ? Object.keys(data[0]).filter(key => key !== "category")
    : [];
  
  // Generate a unique color for each city
  const COLORS = ["#8884d8", "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#9966FF"];
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value, baseCurrency)}
          labelFormatter={(label) => label}
        />
        <Legend />
        {cities.map((city, index) => (
          <Bar 
            key={city} 
            dataKey={city} 
            fill={COLORS[index % COLORS.length]} 
            name={city}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

interface MonthlyTotalChartProps {
  data: {
    name: string;
    value: number;
    fill: string;
    originalValue?: number;
    originalCurrency?: string;
  }[];
  baseCurrency: string;
}

export const MonthlyTotalChart = ({ data, baseCurrency }: MonthlyTotalChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" />
        <Tooltip 
          formatter={(value: number, name, props) => {
            // Show both base currency and original currency if available
            if (props.payload.originalValue && props.payload.originalCurrency) {
              return [
                `${formatCurrency(value, baseCurrency)} (${formatCurrency(props.payload.originalValue, props.payload.originalCurrency)})`,
                "Monthly Costs"
              ];
            }
            return [formatCurrency(value, baseCurrency), "Monthly Costs"];
          }}
        />
        <Bar dataKey="value" background={{ fill: "#eee" }}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const QualityRadarChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart outerRadius={90} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis domain={[0, 100]} />
        <Radar
          name="Lisbon"
          dataKey="Lisbon"
          stroke="#0088FE"
          fill="#0088FE"
          fillOpacity={0.4}
        />
        <Radar
          name="Chiang Mai"
          dataKey="Chiang Mai"
          stroke="#00C49F"
          fill="#00C49F"
          fillOpacity={0.4}
        />
        <Radar
          name="Mexico City"
          dataKey="Mexico City"
          stroke="#FFBB28"
          fill="#FFBB28"
          fillOpacity={0.4}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}; 