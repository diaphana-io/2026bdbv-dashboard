import {
  Color,
  fetchFontFamilyFromCss,
  type Layer,
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

/** Dark fill on light Papers land; bright fill + halo on dark Papers. */
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
      // Bright fill + dark halo reads on dark Papers land.
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

function filterCapitals() {
  return {
    type: "FeatureCollection" as const,
    features: majorCities.features.filter(
      (f) => f.properties?.["capital"] === true,
    ),
  };
}

function wireText(layer: Layer, getVisible: () => boolean) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => {
        const text = (properties?.["name"] as string) ?? "";
        // Per-feature show wins over material text.show; gate on visibility flag.
        return { text, show: getVisible() && Boolean(text) };
      },
      { filters: ["name"] },
    );
  });
}

function wirePointShow(layer: Layer, getVisible: () => boolean) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(() => ({ show: getVisible() }));
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
  // Lift above terrain so upright labels don't z-fight draped Papers land.
  const labelHeight = 12_000;
  // Evaluator owns text.show; toggles flip these flags then forceUpdate.
  let countryNamesVisible = true;
  let citiesVisible = true;

  const countrySource = view.addSource({
    type: "geojson",
    data: filterCountryLabels(),
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
  wireText(countryLayer, () => countryNamesVisible);

  const citySource = view.addSource({
    type: "geojson",
    data: filterCities(),
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
  // City text shares the country-name toggle with country labels.
  wireText(cityLayer, () => countryNamesVisible);

  const capitalSource = view.addSource({
    type: "geojson",
    data: filterCapitals(),
  });
  const capitalLayer = view.addLayer({
    type: "vector",
    source: capitalSource,
    point: {
      color: colors.city.color,
      size: 5,
      sizeInMeters: false,
      clampToGround: true,
      declutter: false,
      show: true,
    },
  });
  // Cities flag only toggles capital points (not city text).
  wirePointShow(capitalLayer, () => citiesVisible);

  return {
    setCountryNamesVisible(next) {
      if (next === countryNamesVisible) return;
      countryNamesVisible = next;
      countryLayer.forceUpdate();
      cityLayer.forceUpdate();
    },
    setCitiesVisible(next) {
      if (next === citiesVisible) return;
      citiesVisible = next;
      capitalLayer.forceUpdate();
    },
    destroy() {
      countryLayer.delete();
      cityLayer.delete();
      capitalLayer.delete();
      countrySource.delete();
      citySource.delete();
      capitalSource.delete();
    },
  };
}
