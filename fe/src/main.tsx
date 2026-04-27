import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  // Leaflet CSS for map rendering
  import 'leaflet/dist/leaflet.css';
  import L from 'leaflet';
  import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
  import markerIcon from 'leaflet/dist/images/marker-icon.png';
  import markerShadow from 'leaflet/dist/images/marker-shadow.png';

  // Fix missing marker icons in production
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });

  createRoot(document.getElementById("root")!).render(<App />);