import { LocationHint } from '../types/contract';

export interface CoastalPort extends LocationHint {
  state: string;
  region: 'East Coast (Bay of Bengal)' | 'West Coast (Arabian Sea)' | 'South Tip (Indian Ocean)';
}

export const COASTAL_PORTS: CoastalPort[] = [
  // Andhra Pradesh
  { name: 'Kakinada', lat: 16.9891, lon: 82.2475, state: 'Andhra Pradesh', region: 'East Coast (Bay of Bengal)' },
  { name: 'Visakhapatnam (Vizag)', lat: 17.6868, lon: 83.2185, state: 'Andhra Pradesh', region: 'East Coast (Bay of Bengal)' },
  { name: 'Machilipatnam', lat: 16.1875, lon: 81.1389, state: 'Andhra Pradesh', region: 'East Coast (Bay of Bengal)' },
  { name: 'Nizampatnam', lat: 15.9083, lon: 80.6732, state: 'Andhra Pradesh', region: 'East Coast (Bay of Bengal)' },
  { name: 'Krishnapatnam', lat: 14.2500, lon: 80.1167, state: 'Andhra Pradesh', region: 'East Coast (Bay of Bengal)' },

  // Tamil Nadu
  { name: 'Chennai (Kasimedu)', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu', region: 'East Coast (Bay of Bengal)' },
  { name: 'Rameswaram (Pamban)', lat: 9.2876, lon: 79.3129, state: 'Tamil Nadu', region: 'East Coast (Bay of Bengal)' },
  { name: 'Thoothukudi (Tuticorin)', lat: 8.7642, lon: 78.1348, state: 'Tamil Nadu', region: 'East Coast (Bay of Bengal)' },
  { name: 'Cuddalore', lat: 11.7480, lon: 79.7714, state: 'Tamil Nadu', region: 'East Coast (Bay of Bengal)' },
  { name: 'Nagapattinam', lat: 10.7656, lon: 79.8424, state: 'Tamil Nadu', region: 'East Coast (Bay of Bengal)' },
  { name: 'Kanyakumari', lat: 8.0883, lon: 77.5385, state: 'Tamil Nadu', region: 'South Tip (Indian Ocean)' },
  { name: 'Mandapam', lat: 9.2778, lon: 79.1250, state: 'Tamil Nadu', region: 'East Coast (Bay of Bengal)' },

  // Kerala
  { name: 'Kochi (Cochin)', lat: 9.9312, lon: 76.2673, state: 'Kerala', region: 'West Coast (Arabian Sea)' },
  { name: 'Vizhinjam', lat: 8.3800, lon: 76.9900, state: 'Kerala', region: 'West Coast (Arabian Sea)' },
  { name: 'Neendakara (Kollam)', lat: 8.9372, lon: 76.5361, state: 'Kerala', region: 'West Coast (Arabian Sea)' },
  { name: 'Beypore (Kozhikode)', lat: 11.1644, lon: 75.8042, state: 'Kerala', region: 'West Coast (Arabian Sea)' },

  // Odisha & West Bengal
  { name: 'Paradip', lat: 20.3164, lon: 86.6114, state: 'Odisha', region: 'East Coast (Bay of Bengal)' },
  { name: 'Puri', lat: 19.8135, lon: 85.8312, state: 'Odisha', region: 'East Coast (Bay of Bengal)' },
  { name: 'Gopalpur', lat: 19.2600, lon: 84.9100, state: 'Odisha', region: 'East Coast (Bay of Bengal)' },
  { name: 'Dhamra', lat: 20.8000, lon: 86.9667, state: 'Odisha', region: 'East Coast (Bay of Bengal)' },

  // Karnataka & Goa
  { name: 'Mangalore (Panambur)', lat: 12.9141, lon: 74.8560, state: 'Karnataka', region: 'West Coast (Arabian Sea)' },
  { name: 'Malpe (Udupi)', lat: 13.3500, lon: 74.7000, state: 'Karnataka', region: 'West Coast (Arabian Sea)' },
  { name: 'Karwar', lat: 14.8000, lon: 74.1300, state: 'Karnataka', region: 'West Coast (Arabian Sea)' },
  { name: 'Mormugao (Goa)', lat: 15.4167, lon: 73.8000, state: 'Goa', region: 'West Coast (Arabian Sea)' },

  // Maharashtra & Gujarat
  { name: 'Mumbai (Sassoon / Versova)', lat: 18.9220, lon: 72.8347, state: 'Maharashtra', region: 'West Coast (Arabian Sea)' },
  { name: 'Ratnagiri', lat: 16.9800, lon: 73.3000, state: 'Maharashtra', region: 'West Coast (Arabian Sea)' },
  { name: 'Veraval', lat: 20.9000, lon: 70.3700, state: 'Gujarat', region: 'West Coast (Arabian Sea)' },
  { name: 'Porbandar', lat: 21.6400, lon: 69.6000, state: 'Gujarat', region: 'West Coast (Arabian Sea)' },
  { name: 'Okha (Dwarka)', lat: 22.4667, lon: 69.0667, state: 'Gujarat', region: 'West Coast (Arabian Sea)' },
];
