//! L0 geometry: coordinates, extents, geodesic helpers (RustGIS-inspired).
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum GeomError {
    #[error("invalid coordinate")]
    InvalidCoordinate,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LatLon {
    pub lat: f64,
    pub lon: f64,
}

impl LatLon {
    pub fn try_new(lat: f64, lon: f64) -> Result<Self, GeomError> {
        if !(-90.0..=90.0).contains(&lat) || !(-180.0..=180.0).contains(&lon) {
            return Err(GeomError::InvalidCoordinate);
        }
        if !lat.is_finite() || !lon.is_finite() {
            return Err(GeomError::InvalidCoordinate);
        }
        Ok(Self { lat, lon })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Extent {
    pub min_lon: f64,
    pub min_lat: f64,
    pub max_lon: f64,
    pub max_lat: f64,
}

impl Extent {
    pub fn contains(&self, p: LatLon) -> bool {
        p.lon >= self.min_lon
            && p.lon <= self.max_lon
            && p.lat >= self.min_lat
            && p.lat <= self.max_lat
    }
}

/// Haversine distance in meters.
pub fn haversine_m(a: LatLon, b: LatLon) -> f64 {
    const R: f64 = 6_371_000.0;
    let d_lat = (b.lat - a.lat).to_radians();
    let d_lon = (b.lon - a.lon).to_radians();
    let lat1 = a.lat.to_radians();
    let lat2 = b.lat.to_radians();
    let h = (d_lat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (d_lon / 2.0).sin().powi(2);
    2.0 * R * h.sqrt().asin()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_lat() {
        assert!(LatLon::try_new(91.0, 0.0).is_err());
    }

    #[test]
    fn distance_nairobi_kampala_plausible() {
        let nairobi = LatLon::try_new(-1.2921, 36.8219).unwrap();
        let kampala = LatLon::try_new(0.3476, 32.5825).unwrap();
        let d = haversine_m(nairobi, kampala);
        assert!(d > 400_000.0 && d < 600_000.0);
    }
}
