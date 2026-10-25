import {
  Color,
  fetchFontFamilyFromCss,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import type { CaseLayerMode } from "./basemap-style";
import countryLabelsData from "../../data/country_labels.json";
import majorCitiesData from "../../data/major_cities.json";

type View = ThreeView<DefaultDescriptions>;

export type LabelLayersHandle = {
  setCountryNamesVisible: (visible: boolean) => void;
  setCitiesVisible: (visible: boolean) => void;
  destroy: () => void;
};

const LABEL_FONT = "Noto Sans";

/** Dark fill on light land; bright fill + halo on dark/satellite. */
function labelColors(mode: CaseLayerMode) {
  if (mode === "light") {
    return {
      country: {
        color: new Color().setStyle("#18181b"),
        outlineColor: new Color().setStyle("#fafafa"),
      },
      city: {
        color: new Color().setStyle("#3f3f46"),
        outlineColor: new Color().setStyle("#fafafa"),
      },
    };
  }
  return {
    country: {
      // Bright fill + dark halo reads on Esri satellite / dark outline.
      color: new Color().setStyle("#f8fafc"),
      outlineColor: new Color().setStyle("#0b1220"),
    },
    city: {
      color: new Color().setStyle("#e2e8f0"),
      outlineColor: new Color().setStyle("#0b1220"),
    },
  };
}

const countryLabels = countryLabelsData as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

const majorCities = majorCitiesData as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

function filterCountryLabels() {
  return {
    type: "FeatureCollection" as const,
    features: countryLabels.features.filter((f) => {
      const rank = f.properties?.["labelrank"];
      return typeof rank === "number" ? rank <= 4 : true;
    }),
  };
}

function filterCities() {
  return {
    type: "FeatureCollection" as const,
    features: majorCities.features.filter((f) => {
      const rank = f.properties?.["scalerank"];
      const capital = f.properties?.["capital"];
      return (
        (typeof rank === "number" && rank <= 2) || capital === true
      );
    }),
  };
}

function wireText(layer: Layer) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => {
        const text = (properties?.["name"] as string) ?? "";
        // Evaluator must return show:true or every label stays hidden.
        return { text, show: Boolean(text) };
      },
      { filters: ["name"] },
    );
  });
}

/** Register font once per view, then attach static country/city labels. */
export async function attachLabelLayers(
  view: View,
  mode: CaseLayerMode = "dark",
): Promise<LabelLayersHandle> {
  view.addFontFamily(
    await fetchFontFamilyFromCss(
      LABEL_FONT,
      "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&display=swap",
    ),
  );

  const colors = labelColors(mode);
  // Lift above ellipsoid/raster so labels don't z-fight satellite tiles
  // (same trap as non-draped boundary strokes without height).
  const labelHeight = 12_000;

  const countrySource = view.addSource({
    type: "geojson",
    data: filterCountryLabels() as GeoJSON.FeatureCollection,
  });
  const countryLayer = view.addLayer({
    type: "vector",
    source: countrySource,
    text: {
      font: LABEL_FONT,
      color: colors.country.color,
      outlineColor: colors.country.outlineColor,
      outlineWidth: 3,
      size: 16,
      sizeInMeters: false,
      // Non-draped upright billboards stay readable at Africa / globe height;
      // draped text can disappear into tile bake at this camera.
      clampToGround: false,
      height: labelHeight,
      textFacing: "upright",
      rotateWithCamera: true,
      offsetDepth: true,
      // Keep major names even when dense at continent scale.
      declutter: true,
      declutterPriority: 10,
      show: true,
    },
  });
  wireText(countryLayer);

  const citySource = view.addSource({
    type: "geojson",
    data: filterCities() as GeoJSON.FeatureCollection,
  });
  const cityLayer = view.addLayer({
    type: "vector",
    source: citySource,
    text: {
      font: LABEL_FONT,
      color: colors.city.color,
      outlineColor: colors.city.outlineColor,
      outlineWidth: 2,
      size: 11,
      sizeInMeters: false,
      clampToGround: false,
      height: labelHeight,
      textFacing: "upright",
      rotateWithCamera: true,
      offsetDepth: true,
      declutter: true,
      declutterPriority: 1,
      show: true,
    },
  });
  wireText(cityLayer);

  return {
    setCountryNamesVisible(next) {
      countryLayer.update({ text: { show: next } });
    },
    setCitiesVisible(next) {
      cityLayer.update({ text: { show: next } });
    },
    destroy() {
      countryLayer.delete();
      cityLayer.delete();
      countrySource.delete();
      citySource.delete();
    },
  };
}
