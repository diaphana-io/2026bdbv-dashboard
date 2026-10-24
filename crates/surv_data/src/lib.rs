//! L1 features and GeoJSON I/O (RustGIS-inspired).
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use surv_geom::LatLon;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DataError {
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("missing geometry")]
    MissingGeometry,
    #[error("invalid feature: {0}")]
    Invalid(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feature {
    pub id: String,
    pub properties: Value,
    pub geometry: Geometry,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Geometry {
    Point { coordinates: [f64; 2] },
    Polygon { coordinates: Vec<Vec<[f64; 2]>> },
}

impl Geometry {
    pub fn point(lon: f64, lat: f64) -> Self {
        Self::Point {
            coordinates: [lon, lat],
        }
    }

    pub fn as_latlon(&self) -> Option<LatLon> {
        match self {
            Self::Point { coordinates } => LatLon::try_new(coordinates[1], coordinates[0]).ok(),
            _ => None,
        }
    }
}

pub fn parse_feature_collection(json: &str) -> Result<Vec<Feature>, DataError> {
    let v: Value = serde_json::from_str(json)?;
    let features = v
        .get("features")
        .and_then(|f| f.as_array())
        .ok_or_else(|| DataError::Invalid("expected FeatureCollection".into()))?;
    let mut out = Vec::new();
    for (i, f) in features.iter().enumerate() {
        let id = f
            .get("id")
            .and_then(|x| x.as_str())
            .map(str::to_string)
            .unwrap_or_else(|| format!("f{i}"));
        let props = f
            .get("properties")
            .cloned()
            .unwrap_or(Value::Object(Default::default()));
        let geom = f.get("geometry").ok_or(DataError::MissingGeometry)?;
        let geometry: Geometry = serde_json::from_value(geom.clone())?;
        out.push(Feature {
            id,
            properties: props,
            geometry,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_point_collection() {
        let json = r#"{"type":"FeatureCollection","features":[{"type":"Feature","id":"c1","properties":{"country":"KE"},"geometry":{"type":"Point","coordinates":[36.82,-1.29]}}]}"#;
        let feats = parse_feature_collection(json).unwrap();
        assert_eq!(feats.len(), 1);
        assert_eq!(feats[0].id, "c1");
    }
}
