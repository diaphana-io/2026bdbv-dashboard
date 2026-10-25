use super::{cmd_ping, CommandSpec};
use crate::curate;

pub static REGISTRY: &[CommandSpec] = &[
    CommandSpec {
        id: "sys.ping",
        mutates: false,
        run: cmd_ping,
    },
    CommandSpec {
        id: "curate.checkDuplicate",
        mutates: false,
        run: curate::check_duplicate,
    },
    CommandSpec {
        id: "curate.classifySource",
        mutates: false,
        run: curate::classify_source_stub,
    },
    CommandSpec {
        id: "curate.extractClaims",
        mutates: false,
        run: curate::extract_claims_stub,
    },
    CommandSpec {
        id: "curate.discoverSources",
        mutates: true,
        run: curate::discover_sources,
    },
    CommandSpec {
        id: "curate.approveClaim",
        mutates: true,
        run: curate::approve_claim,
    },
    CommandSpec {
        id: "curate.rejectClaim",
        mutates: true,
        run: curate::reject_claim,
    },
    CommandSpec {
        id: "curate.reviseClaim",
        mutates: true,
        run: curate::revise_claim,
    },
    CommandSpec {
        id: "curate.rollbackClaim",
        mutates: true,
        run: curate::rollback_claim,
    },
    CommandSpec {
        id: "curate.appendAudit",
        mutates: true,
        run: curate::append_audit,
    },
    CommandSpec {
        id: "curate.detectConflict",
        mutates: false,
        run: curate::detect_conflict,
    },
    CommandSpec {
        id: "curate.resolveConflict",
        mutates: true,
        run: curate::resolve_conflict,
    },
    CommandSpec {
        id: "gp.countPoints",
        mutates: false,
        run: crate::gp_count_points,
    },
    CommandSpec {
        id: "epi.followupWindows",
        mutates: false,
        run: crate::epi_followup,
    },
    CommandSpec {
        id: "epi.curve",
        mutates: false,
        run: crate::epi_curve,
    },
    CommandSpec {
        id: "export.geojson",
        mutates: false,
        run: crate::export_geojson,
    },
];
