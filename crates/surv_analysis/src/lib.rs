//! L2 geoprocessing: point-in-polygon, admin assignment, counts.
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use serde::{Deserialize, Serialize};
use surv_data::{Feature, Geometry};
use surv_geom::LatLon;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminCount {
    pub admin_id: String,
    pub count: u64,
}

/// Ray-casting point in polygon (outer ring only).
pub fn point_in_ring(p: LatLon, ring: &[[f64; 2]]) -> bool {
    if ring.len() < 3 {
        return false;
    }
    let mut inside = false;
    let mut j = ring.len() - 1;
    for i in 0..ring.len() {
        let (xi, yi) = (ring[i][0], ring[i][1]);
        let (xj, yj) = (ring[j][0], ring[j][1]);
        let intersect = ((yi > p.lat) != (yj > p.lat))
            && (p.lon < (xj - xi) * (p.lat - yi) / (yj - yi + f64::EPSILON) + xi);
        if intersect {
            inside = !inside;
        }
        j = i;
    }
    inside
}

pub fn assign_admin<'a>(point: LatLon, admins: &'a [Feature]) -> Option<&'a Feature> {
    for admin in admins {
        if let Geometry::Polygon { coordinates } = &admin.geometry {
            if let Some(ring) = coordinates.first() {
                if point_in_ring(point, ring) {
                    return Some(admin);
                }
            }
        }
    }
    None
}

pub fn count_points_in_admins(points: &[Feature], admins: &[Feature]) -> Vec<AdminCount> {
    let mut counts: Vec<AdminCount> = admins
        .iter()
        .map(|a| AdminCount {
            admin_id: a.id.clone(),
            count: 0,
        })
        .collect();
    for p in points {
        if let Some(ll) = p.geometry.as_latlon() {
            if let Some(admin) = assign_admin(ll, admins) {
                if let Some(slot) = counts.iter_mut().find(|c| c.admin_id == admin.id) {
                    slot.count = slot.count.saturating_add(1);
                }
            }
        }
    }
    counts
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use surv_data::Feature;

    #[test]
    fn counts_point_inside_square() {
        let admin = Feature {
            id: "ke-nairobi".into(),
            properties: json!({}),
            geometry: Geometry::Polygon {
                coordinates: vec![vec![
                    [36.6, -1.4],
                    [37.0, -1.4],
                    [37.0, -1.1],
                    [36.6, -1.1],
                    [36.6, -1.4],
                ]],
            },
        };
        let point = Feature {
            id: "c1".into(),
            properties: json!({}),
            geometry: Geometry::point(36.82, -1.29),
        };
        let counts = count_points_in_admins(&[point], &[admin]);
        assert_eq!(counts[0].count, 1);
    }
}
