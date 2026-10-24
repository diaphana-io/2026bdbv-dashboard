//! Epidemiology helpers: epi curves, follow-up windows, CFR.
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EpiBucket {
    pub date: String,
    pub confirmed: u64,
    pub probable: u64,
    pub suspected: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FollowUpWindow {
    pub window_start: String,
    pub window_end: String,
    pub incubation_max_days: u32,
    pub status: String,
}

/// Compute follow-up end date as start + incubation_max_days (inclusive calendar days via day count).
pub fn followup_window(last_contact_ymd: &str, incubation_max_days: u32) -> Option<FollowUpWindow> {
    let start = parse_ymd(last_contact_ymd)?;
    let end = add_days(start, incubation_max_days)?;
    Some(FollowUpWindow {
        window_start: format_ymd(start),
        window_end: format_ymd(end),
        incubation_max_days,
        status: "active".into(),
    })
}

pub fn crude_cfr(deaths: u64, cases: u64) -> Option<f64> {
    if cases == 0 {
        return None;
    }
    Some((deaths as f64) / (cases as f64))
}

pub fn bucket_onset(dates: &[(String, String)]) -> Vec<EpiBucket> {
    // dates: (ymd, classification)
    let mut map: Vec<(String, EpiBucket)> = Vec::new();
    for (date, class) in dates {
        if let Some((_, b)) = map.iter_mut().find(|(d, _)| d == date) {
            match class.as_str() {
                "confirmed" => b.confirmed += 1,
                "probable" => b.probable += 1,
                _ => b.suspected += 1,
            }
        } else {
            let mut b = EpiBucket {
                date: date.clone(),
                confirmed: 0,
                probable: 0,
                suspected: 0,
            };
            match class.as_str() {
                "confirmed" => b.confirmed = 1,
                "probable" => b.probable = 1,
                _ => b.suspected = 1,
            }
            map.push((date.clone(), b));
        }
    }
    map.sort_by(|a, b| a.0.cmp(&b.0));
    map.into_iter().map(|(_, b)| b).collect()
}

fn parse_ymd(s: &str) -> Option<(i32, u32, u32)> {
    let parts: Vec<_> = s.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    Some((
        parts[0].parse().ok()?,
        parts[1].parse().ok()?,
        parts[2].parse().ok()?,
    ))
}

fn format_ymd(d: (i32, u32, u32)) -> String {
    format!("{:04}-{:02}-{:02}", d.0, d.1, d.2)
}

fn is_leap(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap(y) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

fn add_days(mut d: (i32, u32, u32), days: u32) -> Option<(i32, u32, u32)> {
    let mut remaining = days;
    while remaining > 0 {
        let dim = days_in_month(d.0, d.1);
        let left = dim.saturating_sub(d.2);
        if remaining <= left {
            d.2 += remaining;
            return Some(d);
        }
        remaining -= left + 1;
        d.2 = 1;
        d.1 += 1;
        if d.1 > 12 {
            d.1 = 1;
            d.0 += 1;
        }
    }
    Some(d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn followup_21_days() {
        let w = followup_window("2026-10-03", 21).unwrap();
        assert_eq!(w.window_end, "2026-10-24");
    }

    #[test]
    fn cfr_basic() {
        assert!((crude_cfr(1, 9).unwrap() - 1.0 / 9.0).abs() < 1e-9);
    }
}
